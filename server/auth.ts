import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

export type UserRole = 'voter' | 'officer' | 'admin' | 'super_admin';

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  mobile: string;
  role: UserRole;
  state: string;
  district: string;
  constituency: string;
  language_pref: 'en' | 'ta' | 'hi';
  is_active: number;
  permissions_json: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
  sessionTokenHash?: string;
}

const SESSION_COOKIE = 'sep_session';
const SESSION_TTL_HOURS = 24;

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function createSession(userId: number): { rawToken: string; expiresAt: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();
  db.prepare('INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    tokenHash,
    userId,
    expiresAt
  );
  return { rawToken, expiresAt };
}

export function setSessionCookie(req: Request, res: Response, rawToken: string): void {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    (req.headers.origin ? req.headers.origin.startsWith('https://') : false);

  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(rawToken)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${SESSION_TTL_HOURS * 3600}`,
  ];

  if (isHttps) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(req: Request, res: Response): void {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    (req.headers.origin ? req.headers.origin.startsWith('https://') : false);

  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'Max-Age=0'];
  if (isHttps) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

export function logAudit(
  actor: Pick<AuthUser, 'id' | 'email' | 'role'> | null,
  action: string,
  resourceType: string,
  resourceId: string | number,
  details: string
): void {
  db.prepare(
    'INSERT INTO audit_logs (actor_user_id, actor_email, actor_role, action, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    actor ? actor.id : null,
    actor ? actor.email : 'anonymous',
    actor ? actor.role : 'guest',
    action,
    resourceType,
    String(resourceId),
    details
  );
}

export function createNotification(
  userId: number,
  eventType: string,
  title: string,
  message: string,
  relatedRef = ''
): void {
  db.prepare(
    'INSERT INTO notifications (user_id, event_type, title, message, related_ref, is_read) VALUES (?, ?, ?, ?, ?, 0)'
  ).run(userId, eventType, title, message, relatedRef);
}

export function logSecurityEvent(
  eventType:
    | 'Repeated Failed Login'
    | 'Duplicate Demo Registration'
    | 'Repeated Application Submission'
    | 'Invalid Demo Token'
    | 'Unauthorised Admin Access Attempt',
  userId: number | null,
  actorEmail: string,
  description: string,
  ipAddress: string
): void {
  db.prepare(
    'INSERT INTO security_events (event_type, user_id, actor_email, description, ip_address, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(eventType, userId, actorEmail, description, ipAddress, 'Flagged');
}

export function verifyCsrfIfMutating(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }
  const hasSessionCookie = Boolean(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
  if (!hasSessionCookie) {
    next();
    return;
  }
  const requestedWith = req.headers['x-requested-with'];
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;

  if (requestedWith === 'XMLHttpRequest') {
    next();
    return;
  }
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        next();
        return;
      }
    } catch {
      // fall through
    }
  }
  res.status(403).json({ error: 'Cross-site request validation failed.' });
}

export function attachSessionUser(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies[SESSION_COOKIE];
  if (!rawToken) {
    next();
    return;
  }
  const tokenHash = hashToken(rawToken);
  const row = db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.mobile, u.role, u.state, u.district, u.constituency,
              u.language_pref, u.is_active, u.permissions_json, s.expires_at
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as (AuthUser & { expires_at: string }) | undefined;

  if (!row) {
    next();
    return;
  }

  if (new Date(row.expires_at).getTime() < Date.now() || row.is_active !== 1) {
    db.prepare('DELETE FROM user_sessions WHERE token_hash = ?').run(tokenHash);
    next();
    return;
  }

  req.user = {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    mobile: row.mobile,
    role: row.role,
    state: row.state,
    district: row.district,
    constituency: row.constituency,
    language_pref: row.language_pref,
    is_active: row.is_active,
    permissions_json: row.permissions_json,
  };
  req.sessionTokenHash = tokenHash;
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
    return;
  }
  next();
}

export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      logSecurityEvent(
        'Unauthorised Admin Access Attempt',
        null,
        'unauthenticated',
        `Unauthenticated request attempted protected route ${req.method} ${req.originalUrl}`,
        getClientIp(req)
      );
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      logSecurityEvent(
        'Unauthorised Admin Access Attempt',
        req.user.id,
        req.user.email,
        `Role '${req.user.role}' attempted unauthorized route ${req.method} ${req.originalUrl}`,
        getClientIp(req)
      );
      logAudit(
        req.user,
        'UNAUTHORISED_ACCESS_BLOCKED',
        'route',
        req.originalUrl,
        `Blocked role ${req.user.role} from accessing restricted endpoint.`
      );
      res.status(403).json({ error: 'Access denied. You do not have permission to access this resource.' });
      return;
    }
    next();
  };
}
