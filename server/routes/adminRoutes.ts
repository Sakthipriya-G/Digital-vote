import { Router } from 'express';
import { createNotification, logAudit, requireRoles, type AuthedRequest } from '../auth.ts';
import { db, generateCode, hashPassword } from '../db.ts';

export const adminRouter = Router();

// ─── OFFICER DASHBOARD SUMMARY ──────────────────────────────────────────────

adminRouter.get('/officer/dashboard', requireRoles(['officer', 'admin', 'super_admin']), (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  const isOfficer = req.user!.role === 'officer';

  const apps = (
    isOfficer
      ? db
          .prepare('SELECT * FROM applications WHERE assigned_officer_id = ? OR district = ? OR assigned_officer_id IS NULL ORDER BY updated_at DESC')
          .all(uid, req.user!.district)
      : db.prepare('SELECT * FROM applications ORDER BY updated_at DESC').all()
  ) as Array<{ status: string }>;

  const comps = (
    isOfficer
      ? db
          .prepare('SELECT * FROM complaints WHERE assigned_officer_id = ? OR assigned_officer_id IS NULL ORDER BY updated_at DESC')
          .all(uid)
      : db.prepare('SELECT * FROM complaints ORDER BY updated_at DESC').all()
  ) as Array<{ status: string }>;

  const pendingManualReviews = db
    .prepare(
      `SELECT vr.*, u.full_name as user_name, u.email as user_email
       FROM verification_records vr
       JOIN users u ON u.id = vr.user_id
       WHERE vr.manual_review_requested = 1 AND vr.manual_review_status = 'Pending'
       ORDER BY vr.created_at DESC`
    )
    .all();

  res.json({
    counts: {
      assignedApplications: apps.length,
      pendingReviews: apps.filter((a) => ['Submitted', 'Under Review', 'Action Required'].includes(a.status)).length,
      approvedApplications: apps.filter((a) => ['Approved', 'Completed'].includes(a.status)).length,
      rejectedApplications: apps.filter((a) => a.status === 'Rejected').length,
      assignedComplaints: comps.length,
      pendingComplaints: comps.filter((c) => ['Submitted', 'Assigned', 'In Progress'].includes(c.status)).length,
    },
    pendingManualReviews,
  });
});

// ─── SECURITY MONITORING & ANTI-FRAUD ───────────────────────────────────────

adminRouter.get('/security/overview', requireRoles(['officer', 'admin', 'super_admin']), (_req, res) => {
  const totalVerif = (db.prepare('SELECT COUNT(*) as c FROM verification_records').get() as { c: number }).c;
  const successVerif = (
    db.prepare("SELECT COUNT(*) as c FROM verification_records WHERE result = 'Demo Verified'").get() as { c: number }
  ).c;
  const failedVerif = (
    db.prepare("SELECT COUNT(*) as c FROM verification_records WHERE result != 'Demo Verified'").get() as { c: number }
  ).c;
  const dupFlagged = (
    db.prepare("SELECT COUNT(*) as c FROM duplicate_flags WHERE status IN ('Flagged', 'Under Review', 'Escalated')").get() as {
      c: number;
    }
  ).c;
  const secEventsTotal = (db.prepare('SELECT COUNT(*) as c FROM security_events').get() as { c: number }).c;
  const pendingManual = (
    db
      .prepare(
        "SELECT (SELECT COUNT(*) FROM verification_records WHERE manual_review_status = 'Pending') + (SELECT COUNT(*) FROM security_events WHERE status IN ('Flagged', 'Under Review', 'Escalated')) as c"
      )
      .get() as { c: number }
  ).c;
  const resolvedCases = (
    db.prepare("SELECT COUNT(*) as c FROM security_events WHERE status = 'Cleared'").get() as { c: number }
  ).c;

  const byType = db
    .prepare('SELECT event_type as label, COUNT(*) as count FROM security_events GROUP BY event_type ORDER BY count DESC')
    .all();
  const byStatus = db
    .prepare('SELECT status as label, COUNT(*) as count FROM security_events GROUP BY status')
    .all();

  res.json({
    stats: {
      totalVerificationAttempts: totalVerif,
      successfulDemoVerifications: successVerif,
      failedDemoVerifications: failedVerif,
      duplicateRecordsFlagged: dupFlagged,
      suspiciousActivityEvents: secEventsTotal,
      pendingManualReviews: pendingManual,
      resolvedSecurityCases: resolvedCases,
    },
    byType,
    byStatus,
  });
});

adminRouter.get('/security/events', requireRoles(['officer', 'admin', 'super_admin']), (req, res) => {
  const { q = '', event_type = '', status = '', date = '' } = req.query as Record<string, string>;
  const conds: string[] = [];
  const params: unknown[] = [];

  if (q.trim()) {
    conds.push('(se.actor_email LIKE ? OR se.description LIKE ? OR se.event_type LIKE ?)');
    const like = `%${q.trim()}%`;
    params.push(like, like, like);
  }
  if (event_type) {
    conds.push('se.event_type = ?');
    params.push(event_type);
  }
  if (status) {
    conds.push('se.status = ?');
    params.push(status);
  }
  if (date) {
    conds.push('substr(se.created_at, 1, 10) = ?');
    params.push(date);
  }

  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT se.*, o.full_name as assigned_officer_name
       FROM security_events se
       LEFT JOIN users o ON o.id = se.assigned_officer_id
       ${where}
       ORDER BY se.created_at DESC`
    )
    .all(...params);
  res.json({ events: rows });
});

adminRouter.patch('/security/events/:id', requireRoles(['officer', 'admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { status, officer_remarks, assigned_officer_id } = req.body as {
    status?: string;
    officer_remarks?: string;
    assigned_officer_id?: number;
  };
  const validStatuses = ['Flagged', 'Under Review', 'Cleared', 'Escalated'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid security event status.' });
    return;
  }

  const existing = db.prepare('SELECT * FROM security_events WHERE id = ?').get(id) as
    | { id: number; user_id: number | null; status: string; officer_remarks: string; assigned_officer_id: number | null }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Security event not found.' });
    return;
  }

  const nextStatus = status || existing.status;
  const nextRemarks = (officer_remarks ?? existing.officer_remarks).trim();
  const nextOfficer = assigned_officer_id !== undefined ? assigned_officer_id : existing.assigned_officer_id || req.user!.id;

  db.prepare(
    "UPDATE security_events SET status = ?, officer_remarks = ?, assigned_officer_id = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(nextStatus, nextRemarks, nextOfficer, id);

  if (existing.user_id) {
    createNotification(
      existing.user_id,
      'Security review updated',
      `Security Review Status: ${nextStatus}`,
      nextRemarks || `Security event #${id} was updated to ${nextStatus}.`,
      `SEC-${id}`
    );
  }
  logAudit(req.user!, 'SECURITY_EVENT_UPDATED', 'security_event', id, `Status -> ${nextStatus}`);

  const updated = db.prepare('SELECT * FROM security_events WHERE id = ?').get(id);
  res.json({ event: updated, message: `Security event updated to ${nextStatus}.` });
});

adminRouter.get('/security/duplicates', requireRoles(['officer', 'admin', 'super_admin']), (_req, res) => {
  const rows = db
    .prepare(
      `SELECT df.*, u.full_name as user_name, u.email as user_email, r.full_name as reviewer_name
       FROM duplicate_flags df
       LEFT JOIN users u ON u.id = df.user_id
       LEFT JOIN users r ON r.id = df.reviewed_by
       ORDER BY df.created_at DESC`
    )
    .all();
  res.json({ duplicates: rows });
});

adminRouter.post('/security/duplicates/scan', requireRoles(['officer', 'admin', 'super_admin']), (req: AuthedRequest, res) => {
  let detected = 0;

  // Scan duplicate mobile numbers or duplicate pending applications in same category
  const dupApps = db
    .prepare(
      `SELECT user_id, category, COUNT(*) as cnt, MAX(reference_number) as latest_ref
       FROM applications
       GROUP BY user_id, category
       HAVING cnt > 1`
    )
    .all() as Array<{ user_id: number; category: string; cnt: number; latest_ref: string }>;

  for (const row of dupApps) {
    const exists = db
      .prepare("SELECT id FROM duplicate_flags WHERE entity_ref = ? AND flag_type = 'Repeated Application Submission'")
      .get(row.latest_ref);
    if (!exists) {
      db.prepare(
        'INSERT INTO duplicate_flags (flag_type, entity_type, entity_ref, user_id, details, severity, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        'Repeated Application Submission',
        'application',
        row.latest_ref,
        row.user_id,
        `Automated scan detected ${row.cnt} applications by user #${row.user_id} in "${row.category}".`,
        'Medium',
        'Flagged'
      );
      detected += 1;
    }
  }

  logAudit(req.user!, 'DUPLICATE_SCAN_EXECUTED', 'duplicate_flags', 'scan', `Detected ${detected} new duplicate flags`);
  res.json({ detected, message: `Duplicate scan finished. ${detected} new flags recorded.` });
});

adminRouter.patch('/security/duplicates/:id', requireRoles(['officer', 'admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { status, review_decision } = req.body as { status?: string; review_decision?: string };
  const validStatuses = ['Flagged', 'Under Review', 'Cleared', 'Escalated'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status.' });
    return;
  }
  db.prepare(
    "UPDATE duplicate_flags SET status = ?, review_decision = ?, reviewed_by = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, (review_decision || '').trim(), req.user!.id, id);
  logAudit(req.user!, 'DUPLICATE_FLAG_REVIEWED', 'duplicate_flag', id, `Status -> ${status}`);
  res.json({ message: `Duplicate flag updated to ${status}.` });
});

// ─── ADMIN ANALYTICS & CHARTS ───────────────────────────────────────────────

adminRouter.get('/admin/analytics', requireRoles(['admin', 'super_admin']), (_req, res) => {
  const stats = {
    totalDemoUsers: (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c,
    totalApplications: (db.prepare('SELECT COUNT(*) as c FROM applications').get() as { c: number }).c,
    pendingApplications: (
      db
        .prepare("SELECT COUNT(*) as c FROM applications WHERE status IN ('Submitted', 'Under Review', 'Action Required')")
        .get() as { c: number }
    ).c,
    approvedApplications: (
      db.prepare("SELECT COUNT(*) as c FROM applications WHERE status IN ('Approved', 'Completed')").get() as {
        c: number;
      }
    ).c,
    totalCandidates: (db.prepare('SELECT COUNT(*) as c FROM candidates').get() as { c: number }).c,
    totalPoliticalParties: (db.prepare('SELECT COUNT(*) as c FROM political_parties').get() as { c: number }).c,
    totalPollingStations: (db.prepare('SELECT COUNT(*) as c FROM polling_stations').get() as { c: number }).c,
    openComplaints: (
      db.prepare("SELECT COUNT(*) as c FROM complaints WHERE status IN ('Submitted', 'Assigned', 'In Progress')").get() as {
        c: number;
      }
    ).c,
    securityAlerts: (
      db.prepare("SELECT COUNT(*) as c FROM security_events WHERE status IN ('Flagged', 'Under Review', 'Escalated')").get() as {
        c: number;
      }
    ).c,
  };

  const charts = {
    applicationTrends: db
      .prepare(
        'SELECT substr(created_at, 1, 10) as label, COUNT(*) as count FROM applications GROUP BY substr(created_at, 1, 10) ORDER BY label ASC'
      )
      .all(),
    applicationStatusDistribution: db
      .prepare('SELECT status as label, COUNT(*) as count FROM applications GROUP BY status ORDER BY count DESC')
      .all(),
    complaintTrends: db
      .prepare('SELECT category as label, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC')
      .all(),
    userRegistrationTrends: db
      .prepare('SELECT role as label, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC')
      .all(),
    verificationOutcomes: db
      .prepare('SELECT result as label, COUNT(*) as count FROM verification_records GROUP BY result ORDER BY count DESC')
      .all(),
    securityEventTrends: db
      .prepare('SELECT event_type as label, COUNT(*) as count FROM security_events GROUP BY event_type ORDER BY count DESC')
      .all(),
  };

  res.json({ stats, charts });
});

// ─── USER & VOTER PROFILE MANAGEMENT ────────────────────────────────────────

adminRouter.get('/admin/users', requireRoles(['admin', 'super_admin']), (req, res) => {
  const { q = '', role = '' } = req.query as Record<string, string>;
  const conds: string[] = [];
  const params: unknown[] = [];

  if (q.trim()) {
    conds.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.district LIKE ? OR u.constituency LIKE ?)');
    const like = `%${q.trim()}%`;
    params.push(like, like, like, like);
  }
  if (role) {
    conds.push('u.role = ?');
    params.push(role);
  }

  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.mobile, u.role, u.state, u.district, u.constituency, u.language_pref, u.is_active, u.permissions_json, u.created_at,
              vp.demo_ref_number, vp.verification_status
       FROM users u
       LEFT JOIN voter_profiles vp ON vp.user_id = u.id
       ${where}
       ORDER BY u.id ASC`
    )
    .all(...params);
  res.json({ users: rows });
});

adminRouter.patch('/admin/users/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const targetId = Number(req.params.id);
  const { full_name, mobile, district, constituency, is_active, role, permissions_json } = req.body as {
    full_name?: string;
    mobile?: string;
    district?: string;
    constituency?: string;
    is_active?: number;
    role?: string;
    permissions_json?: string;
  };

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as
    | { id: number; email: string; role: string; is_active: number }
    | undefined;
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Only super_admin may modify roles, permissions, or admin/super_admin accounts
  if (
    req.user!.role !== 'super_admin' &&
    (role !== undefined || permissions_json !== undefined || target.role === 'admin' || target.role === 'super_admin')
  ) {
    res.status(403).json({ error: 'Strict permission check: only Super Admin can modify roles, permissions, or admin accounts.' });
    return;
  }

  if (targetId === req.user!.id && is_active === 0) {
    res.status(400).json({ error: 'You cannot deactivate your own active session account.' });
    return;
  }

  const validRoles = ['voter', 'officer', 'admin', 'super_admin'];
  if (role && !validRoles.includes(role)) {
    res.status(400).json({ error: 'Invalid role specified.' });
    return;
  }

  db.prepare(
    `UPDATE users SET
      full_name = COALESCE(?, full_name),
      mobile = COALESCE(?, mobile),
      district = COALESCE(?, district),
      constituency = COALESCE(?, constituency),
      is_active = COALESCE(?, is_active),
      role = COALESCE(?, role),
      permissions_json = COALESCE(?, permissions_json)
     WHERE id = ?`
  ).run(
    full_name?.trim() || null,
    mobile?.trim() || null,
    district?.trim() || null,
    constituency?.trim() || null,
    is_active !== undefined ? Number(is_active) : null,
    role || null,
    permissions_json || null,
    targetId
  );

  if (role && role !== target.role) {
    logAudit(
      req.user!,
      'USER_ROLE_CHANGED',
      'user',
      targetId,
      `Changed role for ${target.email} from "${target.role}" to "${role}"`
    );
  }
  if (is_active !== undefined && Number(is_active) !== target.is_active) {
    logAudit(
      req.user!,
      'USER_STATUS_CHANGED',
      'user',
      targetId,
      `${Number(is_active) === 1 ? 'Activated' : 'Deactivated'} user account ${target.email}`
    );
  }
  if ((!role || role === target.role) && (is_active === undefined || Number(is_active) === target.is_active)) {
    logAudit(req.user!, 'USER_UPDATED', 'user', targetId, `Updated profile/permissions for ${target.email}`);
  }
  res.json({ message: 'User record updated successfully.' });
});

adminRouter.get('/admin/voter-profiles', requireRoles(['admin', 'super_admin']), (_req, res) => {
  const rows = db
    .prepare(
      `SELECT vp.*, u.full_name, u.email, u.mobile, u.district, u.constituency, ps.name as polling_station_name
       FROM voter_profiles vp
       JOIN users u ON u.id = vp.user_id
       LEFT JOIN polling_stations ps ON ps.id = vp.polling_station_id
       ORDER BY vp.id ASC`
    )
    .all();
  res.json({ profiles: rows });
});

adminRouter.patch('/admin/voter-profiles/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { verification_status, polling_station_id, address, pin_code } = req.body as {
    verification_status?: string;
    polling_station_id?: number | null;
    address?: string;
    pin_code?: string;
  };
  db.prepare(
    `UPDATE voter_profiles SET
      verification_status = COALESCE(?, verification_status),
      polling_station_id = COALESCE(?, polling_station_id),
      address = COALESCE(?, address),
      pin_code = COALESCE(?, pin_code),
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    verification_status || null,
    polling_station_id !== undefined ? polling_station_id : null,
    address?.trim() || null,
    pin_code?.trim() || null,
    id
  );
  logAudit(req.user!, 'VOTER_PROFILE_UPDATED', 'voter_profile', id, `Updated verification_status/station`);
  res.json({ message: 'Voter profile updated.' });
});

// ─── OFFICER MANAGEMENT ─────────────────────────────────────────────────────

adminRouter.get('/admin/officers', requireRoles(['admin', 'super_admin']), (_req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, u.full_name, u.email, u.mobile, u.state, u.district, u.constituency, u.is_active
       FROM officers o
       JOIN users u ON u.id = o.user_id
       ORDER BY o.id ASC`
    )
    .all();
  res.json({ officers: rows });
});

adminRouter.post('/admin/officers', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const { full_name, email, mobile, password, state, district, constituency, designation, role } = req.body as Record<
    string,
    string | undefined
  >;

  const targetRole = role === 'admin' ? 'admin' : 'officer';
  if (targetRole === 'admin' && req.user!.role !== 'super_admin') {
    res.status(403).json({ error: 'Only Super Admin can create administrator accounts.' });
    return;
  }

  if (!full_name?.trim() || !email?.trim() || !mobile?.trim() || !password || password.length < 8) {
    res.status(400).json({ error: 'Full name, email, mobile, and password (min 8 chars) are required.' });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (exists) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const hash = hashPassword(password);
  const tx = db.transaction(() => {
    const r = db
      .prepare(
        'INSERT INTO users (full_name, email, mobile, password_hash, role, state, district, constituency, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)'
      )
      .run(
        full_name.trim(),
        cleanEmail,
        mobile.trim(),
        hash,
        targetRole,
        (state || 'Tamil Nadu').trim(),
        (district || 'Chennai').trim(),
        (constituency || 'Chennai Central Demo').trim()
      );
    const uid = Number(r.lastInsertRowid);
    if (targetRole === 'officer') {
      db.prepare(
        'INSERT INTO officers (user_id, officer_code, assigned_district, assigned_constituency, designation, is_available) VALUES (?, ?, ?, ?, ?, 1)'
      ).run(
        uid,
        generateCode('OFF-DEMO'),
        (district || 'Chennai').trim(),
        (constituency || 'Chennai Central Demo').trim(),
        (designation || 'Electoral Officer (Demo)').trim()
      );
    }
    logAudit(req.user!, 'STAFF_ACCOUNT_CREATED', 'user', uid, `Created ${targetRole} account ${cleanEmail}`);
    return uid;
  });

  const newUid = tx();
  res.status(201).json({ id: newUid, message: `${targetRole === 'admin' ? 'Administrator' : 'Officer'} account created.` });
});

adminRouter.delete('/admin/officers/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const officerId = Number(req.params.id);
  const off = db.prepare('SELECT user_id FROM officers WHERE id = ?').get(officerId) as { user_id: number } | undefined;
  if (!off) {
    res.status(404).json({ error: 'Officer record not found.' });
    return;
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(off.user_id);
  logAudit(req.user!, 'OFFICER_DELETED', 'officer', officerId, 'Removed officer account');
  res.json({ message: 'Officer account deleted.' });
});

// ─── CANDIDATE CRUD ─────────────────────────────────────────────────────────

adminRouter.post('/admin/candidates', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const { name, photo_url, party_id, constituency_id, education, experience, manifesto, declaration_url, age, is_published } =
    req.body as Record<string, string | number | undefined>;

  if (!name || !party_id || !constituency_id || !education || !experience || !manifesto) {
    res.status(400).json({ error: 'Candidate name, party, constituency, education, experience, and manifesto are required.' });
    return;
  }

  const r = db
    .prepare(
      'INSERT INTO candidates (name, photo_url, party_id, constituency_id, education, experience, manifesto, declaration_url, is_published, age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      String(name).trim(),
      String(photo_url || '/src/assets/images/candidate_portrait_1_1795605887697.jpg').trim(),
      Number(party_id),
      Number(constituency_id),
      String(education).trim(),
      String(experience).trim(),
      String(manifesto).trim(),
      String(declaration_url || 'https://demo-declarations.example.edu/new').trim(),
      is_published !== undefined ? Number(is_published) : 1,
      Number(age || 40)
    );
  logAudit(req.user!, 'CANDIDATE_CREATED', 'candidate', Number(r.lastInsertRowid), `Added candidate ${name}`);
  res.status(201).json({ id: Number(r.lastInsertRowid), message: 'Candidate profile created.' });
});

adminRouter.patch('/admin/candidates/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { name, photo_url, party_id, constituency_id, education, experience, manifesto, declaration_url, age, is_published } =
    req.body as Record<string, string | number | undefined>;

  db.prepare(
    `UPDATE candidates SET
      name = COALESCE(?, name),
      photo_url = COALESCE(?, photo_url),
      party_id = COALESCE(?, party_id),
      constituency_id = COALESCE(?, constituency_id),
      education = COALESCE(?, education),
      experience = COALESCE(?, experience),
      manifesto = COALESCE(?, manifesto),
      declaration_url = COALESCE(?, declaration_url),
      age = COALESCE(?, age),
      is_published = COALESCE(?, is_published)
     WHERE id = ?`
  ).run(
    name !== undefined ? String(name).trim() : null,
    photo_url !== undefined ? String(photo_url).trim() : null,
    party_id !== undefined ? Number(party_id) : null,
    constituency_id !== undefined ? Number(constituency_id) : null,
    education !== undefined ? String(education).trim() : null,
    experience !== undefined ? String(experience).trim() : null,
    manifesto !== undefined ? String(manifesto).trim() : null,
    declaration_url !== undefined ? String(declaration_url).trim() : null,
    age !== undefined ? Number(age) : null,
    is_published !== undefined ? Number(is_published) : null,
    id
  );
  logAudit(req.user!, 'CANDIDATE_UPDATED', 'candidate', id, 'Updated candidate details');
  res.json({ message: 'Candidate profile updated.' });
});

adminRouter.delete('/admin/candidates/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM candidates WHERE id = ?').run(id);
  logAudit(req.user!, 'CANDIDATE_DELETED', 'candidate', id, 'Deleted candidate profile');
  res.json({ message: 'Candidate profile deleted.' });
});

// ─── POLITICAL PARTY CRUD ───────────────────────────────────────────────────

adminRouter.post('/admin/parties', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const { name, short_code, symbol_name, logo_url, color_hex, description, website, manifesto_summary, founded_year } =
    req.body as Record<string, string | number | undefined>;

  if (!name || !short_code || !symbol_name || !description) {
    res.status(400).json({ error: 'Party name, short code, symbol name, and description are required.' });
    return;
  }
  const color = String(color_hex || '#1D4ED8').trim();
  const code = String(short_code).trim().toUpperCase();
  const defaultSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="16" fill="${color}"/><text x="48" y="56" font-family="sans-serif" font-size="24" font-weight="700" fill="white" text-anchor="middle">${code.slice(0, 3)}</text></svg>`
  )}`;

  try {
    const r = db
      .prepare(
        'INSERT INTO political_parties (name, short_code, symbol_name, logo_url, color_hex, description, website, manifesto_summary, founded_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        String(name).trim(),
        code,
        String(symbol_name).trim(),
        String(logo_url || defaultSvg).trim(),
        color,
        String(description).trim(),
        String(website || 'https://demo-party.example.edu').trim(),
        String(manifesto_summary || 'Civic development and public transparency demonstration manifesto.').trim(),
        Number(founded_year || 2020)
      );
    logAudit(req.user!, 'PARTY_CREATED', 'political_party', Number(r.lastInsertRowid), `Added party ${name}`);
    res.status(201).json({ id: Number(r.lastInsertRowid), message: 'Political party created.' });
  } catch {
    res.status(409).json({ error: 'A party with that name or short code already exists.' });
  }
});

adminRouter.patch('/admin/parties/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { name, short_code, symbol_name, logo_url, color_hex, description, website, manifesto_summary, founded_year } =
    req.body as Record<string, string | number | undefined>;

  db.prepare(
    `UPDATE political_parties SET
      name = COALESCE(?, name),
      short_code = COALESCE(?, short_code),
      symbol_name = COALESCE(?, symbol_name),
      logo_url = COALESCE(?, logo_url),
      color_hex = COALESCE(?, color_hex),
      description = COALESCE(?, description),
      website = COALESCE(?, website),
      manifesto_summary = COALESCE(?, manifesto_summary),
      founded_year = COALESCE(?, founded_year)
     WHERE id = ?`
  ).run(
    name !== undefined ? String(name).trim() : null,
    short_code !== undefined ? String(short_code).trim().toUpperCase() : null,
    symbol_name !== undefined ? String(symbol_name).trim() : null,
    logo_url !== undefined ? String(logo_url).trim() : null,
    color_hex !== undefined ? String(color_hex).trim() : null,
    description !== undefined ? String(description).trim() : null,
    website !== undefined ? String(website).trim() : null,
    manifesto_summary !== undefined ? String(manifesto_summary).trim() : null,
    founded_year !== undefined ? Number(founded_year) : null,
    id
  );
  logAudit(req.user!, 'PARTY_UPDATED', 'political_party', id, 'Updated party information');
  res.json({ message: 'Political party updated.' });
});

adminRouter.delete('/admin/parties/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM political_parties WHERE id = ?').run(id);
  logAudit(req.user!, 'PARTY_DELETED', 'political_party', id, 'Deleted party');
  res.json({ message: 'Political party deleted.' });
});

// ─── CONSTITUENCY CRUD ──────────────────────────────────────────────────────

adminRouter.post('/admin/constituencies', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const { name, code, district, state, registered_demo_voters } = req.body as Record<string, string | number | undefined>;
  if (!name || !code || !district || !state) {
    res.status(400).json({ error: 'Name, code, district, and state are required.' });
    return;
  }
  try {
    const r = db
      .prepare('INSERT INTO constituencies (name, code, district, state, registered_demo_voters) VALUES (?, ?, ?, ?, ?)')
      .run(String(name).trim(), String(code).trim().toUpperCase(), String(district).trim(), String(state).trim(), Number(registered_demo_voters || 100000));
    logAudit(req.user!, 'CONSTITUENCY_CREATED', 'constituency', Number(r.lastInsertRowid), `Created ${name}`);
    res.status(201).json({ id: Number(r.lastInsertRowid), message: 'Constituency created.' });
  } catch {
    res.status(409).json({ error: 'Constituency name or code already exists.' });
  }
});

adminRouter.patch('/admin/constituencies/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { name, district, state, registered_demo_voters } = req.body as Record<string, string | number | undefined>;
  db.prepare(
    'UPDATE constituencies SET name = COALESCE(?, name), district = COALESCE(?, district), state = COALESCE(?, state), registered_demo_voters = COALESCE(?, registered_demo_voters) WHERE id = ?'
  ).run(
    name !== undefined ? String(name).trim() : null,
    district !== undefined ? String(district).trim() : null,
    state !== undefined ? String(state).trim() : null,
    registered_demo_voters !== undefined ? Number(registered_demo_voters) : null,
    id
  );
  logAudit(req.user!, 'CONSTITUENCY_UPDATED', 'constituency', id, 'Updated constituency');
  res.json({ message: 'Constituency updated.' });
});

adminRouter.delete('/admin/constituencies/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM constituencies WHERE id = ?').run(id);
  logAudit(req.user!, 'CONSTITUENCY_DELETED', 'constituency', id, 'Deleted constituency');
  res.json({ message: 'Constituency deleted.' });
});

// ─── POLLING STATION CRUD ───────────────────────────────────────────────────

adminRouter.post('/admin/polling-stations', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const {
    station_code,
    name,
    address,
    pin_code,
    district,
    constituency_id,
    polling_area,
    booth_number,
    location_type,
    accessibility_facilities,
    available_facilities,
    latitude,
    longitude,
  } = req.body as Record<string, string | number | undefined>;

  if (!name || !address || !pin_code || !district || !constituency_id) {
    res.status(400).json({ error: 'Station name, address, PIN code, district, and constituency are required.' });
    return;
  }

  const code = String(station_code || generateCode('PS-DEMO')).trim().toUpperCase();
  const r = db
    .prepare(
      'INSERT INTO polling_stations (station_code, name, address, pin_code, district, constituency_id, polling_area, booth_number, location_type, accessibility_facilities, available_facilities, latitude, longitude, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      code,
      String(name).trim(),
      String(address).trim(),
      String(pin_code).trim(),
      String(district).trim(),
      Number(constituency_id),
      String(polling_area || `${district} Central Area`).trim(),
      String(booth_number || 'Booth 01 – Main Hall').trim(),
      String(location_type || 'School').trim(),
      String(accessibility_facilities || 'Wheelchair Ramp, Ground Floor Booth').trim(),
      String(available_facilities || 'Drinking Water, Shaded Waiting Area, Help Desk').trim(),
      Number(latitude || 13.05),
      Number(longitude || 80.25),
      '/src/assets/images/polling_station_facade_1795605888794.jpg'
    );
  logAudit(req.user!, 'POLLING_STATION_CREATED', 'polling_station', code, `Added polling station ${name}`);
  res.status(201).json({ id: Number(r.lastInsertRowid), message: 'Polling station created.' });
});

adminRouter.patch('/admin/polling-stations/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const {
    name,
    address,
    pin_code,
    district,
    constituency_id,
    polling_area,
    booth_number,
    location_type,
    accessibility_facilities,
    available_facilities,
    latitude,
    longitude,
  } = req.body as Record<string, string | number | undefined>;

  const existingStation = db
    .prepare('SELECT station_code, name, district FROM polling_stations WHERE id = ?')
    .get(id) as { station_code: string; name: string; district: string } | undefined;

  db.prepare(
    `UPDATE polling_stations SET
      name = COALESCE(?, name),
      address = COALESCE(?, address),
      pin_code = COALESCE(?, pin_code),
      district = COALESCE(?, district),
      constituency_id = COALESCE(?, constituency_id),
      polling_area = COALESCE(?, polling_area),
      booth_number = COALESCE(?, booth_number),
      location_type = COALESCE(?, location_type),
      accessibility_facilities = COALESCE(?, accessibility_facilities),
      available_facilities = COALESCE(?, available_facilities),
      latitude = COALESCE(?, latitude),
      longitude = COALESCE(?, longitude)
     WHERE id = ?`
  ).run(
    name !== undefined ? String(name).trim() : null,
    address !== undefined ? String(address).trim() : null,
    pin_code !== undefined ? String(pin_code).trim() : null,
    district !== undefined ? String(district).trim() : null,
    constituency_id !== undefined ? Number(constituency_id) : null,
    polling_area !== undefined ? String(polling_area).trim() : null,
    booth_number !== undefined ? String(booth_number).trim() : null,
    location_type !== undefined ? String(location_type).trim() : null,
    accessibility_facilities !== undefined ? String(accessibility_facilities).trim() : null,
    available_facilities !== undefined ? String(available_facilities).trim() : null,
    latitude !== undefined ? Number(latitude) : null,
    longitude !== undefined ? Number(longitude) : null,
    id
  );
  const changedFields = [
    name !== undefined ? 'name' : null,
    address !== undefined ? 'address' : null,
    pin_code !== undefined ? 'pin_code' : null,
    district !== undefined ? 'district' : null,
    polling_area !== undefined ? 'polling_area' : null,
    accessibility_facilities !== undefined ? 'accessibility' : null,
    available_facilities !== undefined ? 'facilities' : null,
  ]
    .filter(Boolean)
    .join(', ');
  logAudit(
    req.user!,
    'POLLING_STATION_UPDATED',
    'polling_station',
    existingStation?.station_code || id,
    `Updated ${existingStation?.name || `station #${id}`} (${existingStation?.district || 'TN'}) — fields: ${changedFields || 'details'}`
  );
  res.json({ message: 'Polling station updated.' });
});

adminRouter.delete('/admin/polling-stations/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM polling_stations WHERE id = ?').run(id);
  logAudit(req.user!, 'POLLING_STATION_DELETED', 'polling_station', id, 'Deleted polling station');
  res.json({ message: 'Polling station deleted.' });
});

// ─── ELECTIONS & CALENDAR CRUD ──────────────────────────────────────────────

adminRouter.post('/admin/elections', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const { title, election_type, phase, event_date, constituency, status, description, is_announcement } = req.body as Record<
    string,
    string | number | undefined
  >;
  if (!title || !event_date || !constituency || !description) {
    res.status(400).json({ error: 'Title, date, constituency, and description are required.' });
    return;
  }
  const r = db
    .prepare(
      'INSERT INTO elections (title, election_type, phase, event_date, constituency, status, description, is_announcement) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      String(title).trim(),
      String(election_type || 'Notice').trim(),
      String(phase || 'Phase I').trim(),
      String(event_date).trim(),
      String(constituency).trim(),
      String(status || 'Scheduled').trim(),
      String(description).trim(),
      Number(is_announcement ? 1 : 0)
    );
  logAudit(req.user!, 'ELECTION_EVENT_CREATED', 'election', Number(r.lastInsertRowid), `Created ${title}`);
  res.status(201).json({ id: Number(r.lastInsertRowid), message: 'Election calendar event added.' });
});

adminRouter.delete('/admin/elections/:id', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM elections WHERE id = ?').run(id);
  logAudit(req.user!, 'ELECTION_EVENT_DELETED', 'election', id, 'Removed election calendar item');
  res.json({ message: 'Election calendar entry deleted.' });
});

// ─── NOTIFICATION BROADCAST ─────────────────────────────────────────────────

adminRouter.post('/admin/notifications/broadcast', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const { target_role = 'voter', title, message } = req.body as { target_role?: string; title?: string; message?: string };
  if (!title?.trim() || !message?.trim()) {
    res.status(400).json({ error: 'Notification title and message are required.' });
    return;
  }
  const users = (
    target_role === 'all'
      ? db.prepare('SELECT id FROM users WHERE is_active = 1').all()
      : db.prepare('SELECT id FROM users WHERE role = ? AND is_active = 1').all(target_role)
  ) as Array<{ id: number }>;

  const tx = db.transaction(() => {
    for (const u of users) {
      createNotification(u.id, 'Portal Notice', title.trim(), message.trim(), 'ADMIN-NOTICE');
    }
    logAudit(req.user!, 'NOTIFICATION_BROADCAST', 'notifications', target_role, `Sent to ${users.length} users`);
  });
  tx();

  res.json({ sentCount: users.length, message: `Notification sent to ${users.length} demonstration accounts.` });
});

// ─── AUDIT LOGS ─────────────────────────────────────────────────────────────

function buildAuditFilter(query: Record<string, string>) {
  const { q = '', role = '', resource_type = '', action = '', from = '', to = '' } = query;
  const conds: string[] = [];
  const params: unknown[] = [];

  if (q.trim()) {
    conds.push(
      '(al.actor_email LIKE ? OR COALESCE(u.full_name, "") LIKE ? OR al.action LIKE ? OR al.resource_type LIKE ? OR al.resource_id LIKE ? OR al.details LIKE ?)'
    );
    const like = `%${q.trim()}%`;
    params.push(like, like, like, like, like, like);
  }
  if (role.trim()) {
    conds.push('al.actor_role = ?');
    params.push(role.trim());
  }
  if (resource_type.trim()) {
    conds.push('al.resource_type = ?');
    params.push(resource_type.trim());
  }
  if (action.trim()) {
    conds.push('al.action = ?');
    params.push(action.trim());
  }
  if (from.trim()) {
    conds.push('substr(al.created_at, 1, 10) >= ?');
    params.push(from.trim());
  }
  if (to.trim()) {
    conds.push('substr(al.created_at, 1, 10) <= ?');
    params.push(to.trim());
  }

  return {
    where: conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '',
    params,
  };
}

adminRouter.get('/admin/audit-logs', requireRoles(['admin', 'super_admin']), (req, res) => {
  const query = req.query as Record<string, string>;
  const { page = '1', limit = '20' } = query;
  const { where, params } = buildAuditFilter(query);

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(5, Number(limit)));
  const offset = (pageNum - 1) * limitNum;

  const total = (
    db
      .prepare(
        `SELECT COUNT(*) as c
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.actor_user_id
         ${where}`
      )
      .get(...params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT al.*, u.full_name as actor_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       ${where}
       ORDER BY al.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limitNum, offset);

  const summary = {
    totalLogs: (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as { c: number }).c,
    roleChanges: (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM audit_logs WHERE action IN ('USER_ROLE_CHANGED', 'USER_STATUS_CHANGED', 'STAFF_ACCOUNT_CREATED', 'OFFICER_DELETED')"
        )
        .get() as { c: number }
    ).c,
    stationUpdates: (
      db
        .prepare("SELECT COUNT(*) as c FROM audit_logs WHERE resource_type IN ('polling_station', 'constituency')")
        .get() as { c: number }
    ).c,
    configUpdates: (
      db
        .prepare("SELECT COUNT(*) as c FROM audit_logs WHERE resource_type IN ('system_settings', 'system', 'route')")
        .get() as { c: number }
    ).c,
  };

  const resourceTypes = (
    db.prepare('SELECT DISTINCT resource_type FROM audit_logs ORDER BY resource_type ASC').all() as Array<{
      resource_type: string;
    }>
  ).map((r) => r.resource_type);

  const actions = (
    db.prepare('SELECT DISTINCT action FROM audit_logs ORDER BY action ASC').all() as Array<{ action: string }>
  ).map((r) => r.action);

  res.json({
    logs: rows,
    total,
    page: pageNum,
    totalPages: Math.max(1, Math.ceil(total / limitNum)),
    summary,
    resourceTypes,
    actions,
  });
});

adminRouter.get('/admin/audit-logs/csv', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const { where, params } = buildAuditFilter(req.query as Record<string, string>);
  const rows = db
    .prepare(
      `SELECT al.id, al.created_at, COALESCE(u.full_name, al.actor_email) as actor_name, al.actor_email, al.actor_role, al.action, al.resource_type, al.resource_id, al.details
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       ${where}
       ORDER BY al.id DESC
       LIMIT 1000`
    )
    .all(...params) as Array<Record<string, unknown>>;

  const headers = ['id', 'created_at', 'actor_name', 'actor_email', 'actor_role', 'action', 'resource_type', 'resource_id', 'details'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');

  logAudit(req.user!, 'AUDIT_LOG_EXPORTED_CSV', 'audit_logs', 'csv', `Exported ${rows.length} audit log records`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="smart-election-portal-audit-logs.csv"');
  res.send(csv);
});

// ─── REPORTS & CSV EXPORT (8 REPORTS) ───────────────────────────────────────

function getReportQuery(type: string, q: string, fromDate: string, toDate: string) {
  const like = `%${q.trim()}%`;
  const hasQ = q.trim().length > 0;
  const conds: string[] = [];
  const params: unknown[] = [];

  let baseSql = '';
  let dateCol = 'created_at';
  let searchCols: string[] = [];

  switch (type) {
    case 'user-registrations':
      baseSql =
        'SELECT id, full_name, email, mobile, role, state, district, constituency, is_active, created_at FROM users';
      searchCols = ['full_name', 'email', 'district', 'constituency', 'role'];
      break;
    case 'application-status':
      baseSql =
        'SELECT reference_number, applicant_name, category, district, constituency, status, created_at, updated_at FROM applications';
      searchCols = ['reference_number', 'applicant_name', 'category', 'status', 'constituency'];
      break;
    case 'application-processing':
      baseSql =
        'SELECT a.reference_number, a.category, a.status, COALESCE(o.full_name, "Unassigned") as officer_name, a.created_at, a.updated_at FROM applications a LEFT JOIN users o ON o.id = a.assigned_officer_id';
      dateCol = 'a.created_at';
      searchCols = ['a.reference_number', 'a.category', 'a.status'];
      break;
    case 'candidate-directory':
      baseSql =
        'SELECT c.id, c.name, p.name as party_name, co.name as constituency, c.education, c.age, c.is_published, c.created_at FROM candidates c JOIN political_parties p ON p.id = c.party_id JOIN constituencies co ON co.id = c.constituency_id';
      dateCol = 'c.created_at';
      searchCols = ['c.name', 'p.name', 'co.name', 'c.education'];
      break;
    case 'polling-stations':
      baseSql =
        'SELECT ps.station_code, ps.name, ps.district, co.name as constituency, ps.pin_code, ps.accessibility_facilities, ps.created_at FROM polling_stations ps JOIN constituencies co ON co.id = ps.constituency_id';
      dateCol = 'ps.created_at';
      searchCols = ['ps.station_code', 'ps.name', 'ps.district', 'ps.pin_code'];
      break;
    case 'complaints':
      baseSql =
        'SELECT reference_number, category, subject, status, officer_response, created_at, updated_at FROM complaints';
      searchCols = ['reference_number', 'category', 'subject', 'status'];
      break;
    case 'security-events':
      baseSql =
        'SELECT id, event_type, actor_email, ip_address, status, officer_remarks, created_at FROM security_events';
      searchCols = ['event_type', 'actor_email', 'status', 'officer_remarks'];
      break;
    case 'verification-outcomes':
      baseSql =
        'SELECT vr.verification_ref, u.full_name as user_name, vr.demo_profile_code, vr.result, vr.manual_review_status, vr.created_at FROM verification_records vr JOIN users u ON u.id = vr.user_id';
      dateCol = 'vr.created_at';
      searchCols = ['vr.verification_ref', 'u.full_name', 'vr.result'];
      break;
    default:
      return null;
  }

  if (hasQ && searchCols.length > 0) {
    conds.push(`(${searchCols.map((c) => `${c} LIKE ?`).join(' OR ')})`);
    for (let i = 0; i < searchCols.length; i++) params.push(like);
  }
  if (fromDate) {
    conds.push(`substr(${dateCol}, 1, 10) >= ?`);
    params.push(fromDate);
  }
  if (toDate) {
    conds.push(`substr(${dateCol}, 1, 10) <= ?`);
    params.push(toDate);
  }

  const where = conds.length > 0 ? ` WHERE ${conds.join(' AND ')}` : '';
  return { sql: `${baseSql}${where}`, params, dateCol };
}

adminRouter.get('/admin/reports/:type', requireRoles(['admin', 'super_admin']), (req, res) => {
  const { q = '', from = '', to = '', sortDir = 'desc', page = '1', limit = '10' } = req.query as Record<
    string,
    string
  >;
  const built = getReportQuery(String(req.params.type), q, from, to);
  if (!built) {
    res.status(400).json({ error: 'Unknown report type.' });
    return;
  }

  const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';
  const allRows = db.prepare(`${built.sql} ORDER BY ${built.dateCol} ${orderDir}`).all(...built.params) as Array<
    Record<string, unknown>
  >;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(5, Number(limit)));
  const start = (pageNum - 1) * limitNum;
  const pagedRows = allRows.slice(start, start + limitNum);

  res.json({
    rows: pagedRows,
    allRowsCount: allRows.length,
    page: pageNum,
    totalPages: Math.max(1, Math.ceil(allRows.length / limitNum)),
  });
});

adminRouter.get('/admin/reports/:type/csv', requireRoles(['admin', 'super_admin']), (req: AuthedRequest, res) => {
  const { q = '', from = '', to = '', sortDir = 'desc' } = req.query as Record<string, string>;
  const type = String(req.params.type);
  const built = getReportQuery(type, q, from, to);
  if (!built) {
    res.status(400).json({ error: 'Unknown report type.' });
    return;
  }
  const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';
  const rows = db.prepare(`${built.sql} ORDER BY ${built.dateCol} ${orderDir}`).all(...built.params) as Array<
    Record<string, unknown>
  >;

  const headers = rows.length > 0 ? Object.keys(rows[0]) : ['notice'];
  const csvEscape = (v: unknown) => {
    const s = String(v ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.join(','),
    ...(rows.length > 0
      ? rows.map((r) => headers.map((h) => csvEscape(r[h])).join(','))
      : [csvEscape('No matching demonstration records')]),
  ];

  logAudit(req.user!, 'REPORT_EXPORTED_CSV', 'report', type, `Exported ${rows.length} rows`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="smart-election-portal-${type}.csv"`);
  res.send(lines.join('\n'));
});

// ─── SUPER ADMIN SYSTEM SETTINGS & MODULE CONTROLS ──────────────────────────

adminRouter.get('/superadmin/settings', requireRoles(['super_admin']), (_req, res) => {
  const settings = db.prepare('SELECT * FROM system_settings ORDER BY key ASC').all();
  res.json({ settings });
});

adminRouter.patch('/superadmin/settings', requireRoles(['super_admin']), (req: AuthedRequest, res) => {
  const { updates } = req.body as { updates?: Array<{ key: string; value: string }> };
  if (!Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ error: 'Settings updates array is required.' });
    return;
  }

  const prevRows = db.prepare('SELECT key, value FROM system_settings').all() as Array<{ key: string; value: string }>;
  const prevMap = new Map(prevRows.map((r) => [r.key, r.value]));
  const changes: string[] = [];

  const stmt = db.prepare("UPDATE system_settings SET value = ?, updated_at = datetime('now') WHERE key = ?");
  db.transaction(() => {
    for (const u of updates) {
      const k = String(u.key).trim();
      const v = String(u.value).trim();
      const oldVal = prevMap.get(k);
      if (oldVal !== undefined && oldVal !== v) {
        changes.push(`${k}: "${oldVal}" -> "${v}"`);
      }
      stmt.run(v, k);
    }
    logAudit(
      req.user!,
      'SYSTEM_SETTINGS_UPDATED',
      'system_settings',
      'config',
      changes.length > 0 ? `Modified settings: ${changes.join('; ')}` : `Saved ${updates.length} system configuration settings`
    );
  })();

  const settings = db.prepare('SELECT * FROM system_settings ORDER BY key ASC').all();
  res.json({ settings, message: 'System settings saved.' });
});
