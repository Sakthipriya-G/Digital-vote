import crypto from 'node:crypto';
import { Router } from 'express';
import {
  clearSessionCookie,
  createNotification,
  createSession,
  getClientIp,
  logAudit,
  logSecurityEvent,
  requireAuth,
  setSessionCookie,
  type AuthedRequest,
} from '../auth.ts';
import { db, generateCode, hashPassword, verifyPassword } from '../db.ts';

export const authRouter = Router();

authRouter.get('/demo-accounts', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.role, u.district, u.constituency, u.is_active
       FROM users u
       WHERE u.email LIKE '%@demo.edu' AND u.role != 'voter'
       ORDER BY CASE u.role
         WHEN 'officer' THEN 1
         WHEN 'admin' THEN 2
         WHEN 'super_admin' THEN 3
         ELSE 4
       END, u.id ASC`
    )
    .all();
  res.json({ accounts: rows });
});

authRouter.post('/register', (req, res) => {
  const {
    full_name,
    email,
    mobile,
    password,
    confirm_password,
    state,
    district,
    constituency,
  } = req.body as Record<string, string | undefined>;

  const cleanName = (full_name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanMobile = (mobile || '').trim();
  const cleanState = (state || '').trim();
  const cleanDistrict = (district || '').trim();
  const cleanConst = (constituency || '').trim();

  if (!cleanName || !cleanEmail || !cleanMobile || !password || !cleanState || !cleanDistrict || !cleanConst) {
    res.status(400).json({ error: 'All registration fields are required.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (!/^\d{10}$/.test(cleanMobile)) {
    res.status(400).json({ error: 'Test mobile number must be exactly 10 digits.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }
  if (confirm_password !== undefined && password !== confirm_password) {
    res.status(400).json({ error: 'Password and confirm password do not match.' });
    return;
  }

  const ip = getClientIp(req);
  const existingEmail = db.prepare('SELECT id, email FROM users WHERE email = ?').get(cleanEmail) as
    | { id: number; email: string }
    | undefined;
  if (existingEmail) {
    logSecurityEvent(
      'Duplicate Demo Registration',
      existingEmail.id,
      cleanEmail,
      `Duplicate registration attempt for already-registered email ${cleanEmail}.`,
      ip
    );
    db.prepare(
      'INSERT INTO duplicate_flags (flag_type, entity_type, entity_ref, user_id, details, severity, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      'Duplicate Demo Registration',
      'user',
      cleanEmail,
      existingEmail.id,
      `Blocked duplicate registration attempt using email ${cleanEmail}.`,
      'High',
      'Flagged'
    );
    res.status(409).json({ error: 'An account with this email already exists. Duplicate attempt has been logged.' });
    return;
  }

  const existingMobile = db
    .prepare('SELECT id, email FROM users WHERE mobile = ?')
    .get(cleanMobile) as { id: number; email: string } | undefined;
  if (existingMobile) {
    logSecurityEvent(
      'Duplicate Demo Registration',
      existingMobile.id,
      cleanEmail,
      `Duplicate test mobile number (${cleanMobile}) used during registration attempt by ${cleanEmail}.`,
      ip
    );
    db.prepare(
      'INSERT INTO duplicate_flags (flag_type, entity_type, entity_ref, user_id, details, severity, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      'Duplicate Demo Registration',
      'user',
      cleanMobile,
      existingMobile.id,
      `Blocked registration sharing mobile number ${cleanMobile} with existing account ${existingMobile.email}.`,
      'Medium',
      'Flagged'
    );
    res.status(409).json({ error: 'This test mobile number is already registered in the demonstration roll.' });
    return;
  }

  const passwordHash = hashPassword(password);
  const station = db
    .prepare('SELECT id FROM polling_stations WHERE district = ? ORDER BY id ASC LIMIT 1')
    .get(cleanDistrict) as { id: number } | undefined;
  const fallbackStation = db.prepare('SELECT id FROM polling_stations ORDER BY id ASC LIMIT 1').get() as
    | { id: number }
    | undefined;

  const createTx = db.transaction(() => {
    const userRes = db
      .prepare(
        'INSERT INTO users (full_name, email, mobile, password_hash, role, state, district, constituency, language_pref, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
      )
      .run(cleanName, cleanEmail, cleanMobile, passwordHash, 'voter', cleanState, cleanDistrict, cleanConst, 'en');
    const userId = Number(userRes.lastInsertRowid);
    const demoRef = `DEMO-VTR-2026-${String(1000 + userId)}`;
    db.prepare(
      'INSERT INTO voter_profiles (user_id, demo_ref_number, date_of_birth, gender, address, pin_code, polling_station_id, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      userId,
      demoRef,
      '1995-01-01',
      'Not Specified',
      `${cleanDistrict}, ${cleanState} (Demo Address)`,
      '600001',
      station?.id || fallbackStation?.id || null,
      'Pending'
    );
    createNotification(
      userId,
      'Account registered',
      'Welcome to Smart Election Portal (Demo)',
      `Your demonstration voter profile (${demoRef}) is ready. Explore voter services or submit an application.`,
      demoRef
    );
    logAudit(
      { id: userId, email: cleanEmail, role: 'voter' },
      'USER_REGISTERED',
      'user',
      userId,
      `Registered new demo voter account ${cleanEmail}`
    );
    return userId;
  });

  const newUserId = createTx();
  const { rawToken } = createSession(newUserId);
  setSessionCookie(req, res, rawToken);

  const user = db
    .prepare(
      'SELECT id, full_name, email, mobile, role, state, district, constituency, language_pref, is_active FROM users WHERE id = ?'
    )
    .get(newUserId);

  res.status(201).json({ user, message: 'Registration successful. Redirecting to your Voter Dashboard.' });
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const cleanEmail = (email || '').trim().toLowerCase();
  const ip = getClientIp(req);

  if (!cleanEmail || !password) {
    res.status(400).json({ error: 'Email address and password are required.' });
    return;
  }

  const userRow = db
    .prepare(
      'SELECT id, full_name, email, mobile, password_hash, role, state, district, constituency, language_pref, is_active FROM users WHERE email = ?'
    )
    .get(cleanEmail) as
    | {
        id: number;
        full_name: string;
        email: string;
        mobile: string;
        password_hash: string;
        role: 'voter' | 'officer' | 'admin' | 'super_admin';
        state: string;
        district: string;
        constituency: string;
        language_pref: 'en' | 'ta' | 'hi';
        is_active: number;
      }
    | undefined;

  if (!userRow || !verifyPassword(password, userRow.password_hash)) {
    db.prepare('INSERT INTO failed_login_attempts (email, ip_address) VALUES (?, ?)').run(cleanEmail, ip);
    const thresholdRow = db
      .prepare("SELECT value FROM system_settings WHERE key = 'max_failed_login_threshold'")
      .get() as { value: string } | undefined;
    const threshold = Math.max(2, Number(thresholdRow?.value || 3));
    const recentCount = (
      db
        .prepare(
          "SELECT COUNT(*) as cnt FROM failed_login_attempts WHERE email = ? AND created_at >= datetime('now', '-15 minutes')"
        )
        .get(cleanEmail) as { cnt: number }
    ).cnt;

    if (recentCount >= threshold) {
      logSecurityEvent(
        'Repeated Failed Login',
        userRow?.id || null,
        cleanEmail,
        `${recentCount} failed login attempts detected for ${cleanEmail} within 15 minutes.`,
        ip
      );
    }

    res.status(401).json({ error: 'Invalid email address or password.' });
    return;
  }

  if (userRow.is_active !== 1) {
    res.status(403).json({ error: 'This demonstration account has been deactivated by an administrator.' });
    return;
  }

  const { rawToken } = createSession(userRow.id);
  setSessionCookie(req, res, rawToken);
  logAudit(
    { id: userRow.id, email: userRow.email, role: userRow.role },
    'USER_LOGIN',
    'session',
    userRow.id,
    `User signed in with role ${userRow.role}`
  );

  const safeUser = {
    id: userRow.id,
    full_name: userRow.full_name,
    email: userRow.email,
    mobile: userRow.mobile,
    role: userRow.role,
    state: userRow.state,
    district: userRow.district,
    constituency: userRow.constituency,
    language_pref: userRow.language_pref,
    is_active: userRow.is_active,
  };

  res.json({ user: safeUser, message: 'Sign-in successful.' });
});

authRouter.post('/logout', (req: AuthedRequest, res) => {
  if (req.sessionTokenHash) {
    db.prepare('DELETE FROM user_sessions WHERE token_hash = ?').run(req.sessionTokenHash);
  }
  if (req.user) {
    logAudit(req.user, 'USER_LOGOUT', 'session', req.user.id, 'User signed out');
  }
  clearSessionCookie(req, res);
  res.json({ message: 'Signed out successfully.' });
});

authRouter.get('/me', (req: AuthedRequest, res) => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  const unreadCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id) as {
      cnt: number;
    }
  ).cnt;
  const profile = db
    .prepare(
      `SELECT vp.*, ps.name as polling_station_name, ps.station_code, ps.address as polling_station_address
       FROM voter_profiles vp
       LEFT JOIN polling_stations ps ON ps.id = vp.polling_station_id
       WHERE vp.user_id = ?`
    )
    .get(req.user.id);

  res.json({ user: req.user, profile: profile || null, unreadNotifications: unreadCount });
});

authRouter.post('/forgot-password', (req, res) => {
  const { email } = req.body as { email?: string };
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    res.status(400).json({ error: 'Please provide your registered email address.' });
    return;
  }
  const user = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(cleanEmail) as
    | { id: number; email: string; role: 'voter' | 'officer' | 'admin' | 'super_admin' }
    | undefined;

  if (!user) {
    res.status(404).json({ error: 'No demonstration account was found with that email address.' });
    return;
  }

  const resetToken = `RST-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(resetToken, expires, user.id);
  logAudit(user, 'PASSWORD_RESET_REQUESTED', 'user', user.id, 'Generated demonstration password reset token');

  res.json({
    message: 'Demonstration password reset code generated. Use the code below to set a new password (valid 15 minutes).',
    demoResetToken: resetToken,
  });
});

authRouter.post('/reset-password', (req, res) => {
  const { email, token, new_password } = req.body as { email?: string; token?: string; new_password?: string };
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanToken = (token || '').trim().toUpperCase();

  if (!cleanEmail || !cleanToken || !new_password || new_password.length < 8) {
    res.status(400).json({ error: 'Email, valid reset code, and a new password (min 8 chars) are required.' });
    return;
  }

  const user = db
    .prepare('SELECT id, email, role, reset_token, reset_expires FROM users WHERE email = ?')
    .get(cleanEmail) as
    | { id: number; email: string; role: 'voter' | 'officer' | 'admin' | 'super_admin'; reset_token: string | null; reset_expires: string | null }
    | undefined;

  if (!user || !user.reset_token || user.reset_token !== cleanToken) {
    res.status(400).json({ error: 'Invalid email or reset code.' });
    return;
  }

  if (!user.reset_expires || new Date(user.reset_expires).getTime() < Date.now()) {
    res.status(400).json({ error: 'This reset code has expired. Please request a new one.' });
    return;
  }

  const newHash = hashPassword(new_password);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(
    newHash,
    user.id
  );
  logAudit(user, 'PASSWORD_RESET_COMPLETED', 'user', user.id, 'Password updated via reset token');

  res.json({ message: 'Password reset successful. You can now sign in with your new password.' });
});

authRouter.patch('/language', requireAuth, (req: AuthedRequest, res) => {
  const { language } = req.body as { language?: string };
  if (language !== 'en' && language !== 'ta' && language !== 'hi') {
    res.status(400).json({ error: 'Unsupported language code.' });
    return;
  }
  db.prepare('UPDATE users SET language_pref = ? WHERE id = ?').run(language, req.user!.id);
  res.json({ language_pref: language });
});

// Keep generateCode referenced for future use if needed
void generateCode;
