import crypto from 'node:crypto';
import { Router } from 'express';
import QRCode from 'qrcode';
import {
  createNotification,
  getClientIp,
  logAudit,
  logSecurityEvent,
  requireAuth,
  requireRoles,
  type AuthedRequest,
} from '../auth.ts';
import { db, generateCode } from '../db.ts';

export const voterRouter = Router();

// ─── VOTER DASHBOARD & DIGITAL PROFILE ──────────────────────────────────────

voterRouter.get('/voter/dashboard', requireAuth, (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  const profile = db
    .prepare(
      `SELECT vp.*, u.full_name, u.email, u.mobile, u.state, u.district, u.constituency,
              ps.station_code, ps.name as polling_station_name, ps.address as polling_station_address,
              ps.pin_code as polling_station_pin, ps.accessibility_facilities, ps.available_facilities,
              ps.latitude, ps.longitude
       FROM users u
       LEFT JOIN voter_profiles vp ON vp.user_id = u.id
       LEFT JOIN polling_stations ps ON ps.id = vp.polling_station_id
       WHERE u.id = ?`
    )
    .get(uid);

  const applications = db
    .prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY updated_at DESC')
    .all(uid) as Array<{ status: string }>;

  const complaints = db
    .prepare('SELECT * FROM complaints WHERE user_id = ? ORDER BY updated_at DESC')
    .all(uid);

  const notifications = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 12')
    .all(uid);

  const unreadCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').get(uid) as {
      cnt: number;
    }
  ).cnt;

  const counts = {
    totalApplications: applications.length,
    pendingApplications: applications.filter((a) =>
      ['Submitted', 'Under Review', 'Action Required'].includes(a.status)
    ).length,
    approvedApplications: applications.filter((a) => ['Approved', 'Completed'].includes(a.status)).length,
    totalComplaints: complaints.length,
    unreadNotifications: unreadCount,
  };

  res.json({ profile, counts, applications, complaints, notifications });
});

voterRouter.patch('/voter/profile', requireAuth, (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  const { full_name, mobile, date_of_birth, gender, address, pin_code, district, constituency } = req.body as Record<
    string,
    string | undefined
  >;

  const cleanName = (full_name || '').trim();
  const cleanMobile = (mobile || '').trim();
  const cleanDob = (date_of_birth || '').trim();
  const cleanGender = (gender || '').trim();
  const cleanAddress = (address || '').trim();
  const cleanPin = (pin_code || '').trim();

  if (!cleanName || !cleanMobile || !cleanAddress || !cleanPin) {
    res.status(400).json({ error: 'Name, test mobile, address, and PIN code are required.' });
    return;
  }
  if (!/^\d{10}$/.test(cleanMobile)) {
    res.status(400).json({ error: 'Test mobile number must be 10 digits.' });
    return;
  }
  if (!/^\d{6}$/.test(cleanPin)) {
    res.status(400).json({ error: 'PIN code must be 6 digits.' });
    return;
  }

  const updateTx = db.transaction(() => {
    db.prepare('UPDATE users SET full_name = ?, mobile = ?, district = COALESCE(?, district), constituency = COALESCE(?, constituency) WHERE id = ?').run(
      cleanName,
      cleanMobile,
      district?.trim() || null,
      constituency?.trim() || null,
      uid
    );

    const existing = db.prepare('SELECT id FROM voter_profiles WHERE user_id = ?').get(uid);
    if (existing) {
      db.prepare(
        "UPDATE voter_profiles SET date_of_birth = ?, gender = ?, address = ?, pin_code = ?, updated_at = datetime('now') WHERE user_id = ?"
      ).run(cleanDob || '1995-01-01', cleanGender || 'Not Specified', cleanAddress, cleanPin, uid);
    } else {
      const demoRef = `DEMO-VTR-2026-${String(1000 + uid)}`;
      db.prepare(
        'INSERT INTO voter_profiles (user_id, demo_ref_number, date_of_birth, gender, address, pin_code, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(uid, demoRef, cleanDob || '1995-01-01', cleanGender || 'Not Specified', cleanAddress, cleanPin, 'Pending');
    }

    logAudit(req.user!, 'PROFILE_UPDATED', 'voter_profile', uid, 'Updated demonstration voter profile details');
  });

  updateTx();

  const updated = db
    .prepare(
      `SELECT vp.*, u.full_name, u.email, u.mobile, u.state, u.district, u.constituency,
              ps.station_code, ps.name as polling_station_name, ps.address as polling_station_address
       FROM users u
       LEFT JOIN voter_profiles vp ON vp.user_id = u.id
       LEFT JOIN polling_stations ps ON ps.id = vp.polling_station_id
       WHERE u.id = ?`
    )
    .get(uid);

  res.json({ profile: updated, message: 'Demonstration profile updated successfully.' });
});

// ─── APPLICATION MANAGEMENT ─────────────────────────────────────────────────

voterRouter.get('/applications', requireAuth, (req: AuthedRequest, res) => {
  const { q = '', status = '', category = '', sort = 'newest' } = req.query as Record<string, string>;
  const role = req.user!.role;
  const uid = req.user!.id;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (role === 'voter') {
    conditions.push('a.user_id = ?');
    params.push(uid);
  } else if (role === 'officer') {
    conditions.push('(a.assigned_officer_id = ? OR a.district = ? OR a.assigned_officer_id IS NULL)');
    params.push(uid, req.user!.district);
  }

  if (q.trim()) {
    conditions.push('(a.reference_number LIKE ? OR a.applicant_name LIKE ? OR a.constituency LIKE ? OR a.category LIKE ?)');
    const like = `%${q.trim()}%`;
    params.push(like, like, like, like);
  }
  if (status) {
    conditions.push('a.status = ?');
    params.push(status);
  }
  if (category) {
    conditions.push('a.category = ?');
    params.push(category);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = sort === 'oldest' ? 'ORDER BY a.created_at ASC' : 'ORDER BY a.updated_at DESC';

  const rows = db
    .prepare(
      `SELECT a.*, o.full_name as assigned_officer_name
       FROM applications a
       LEFT JOIN users o ON o.id = a.assigned_officer_id
       ${whereClause}
       ${orderClause}`
    )
    .all(...params);

  res.json({ applications: rows });
});

voterRouter.post('/applications', requireAuth, (req: AuthedRequest, res) => {
  const { applicant_name, category, email, district, constituency, description, document_name } = req.body as Record<
    string,
    string | undefined
  >;

  const cleanName = (applicant_name || req.user!.full_name).trim();
  const cleanCat = (category || '').trim();
  const cleanEmail = (email || req.user!.email).trim().toLowerCase();
  const cleanDistrict = (district || req.user!.district).trim();
  const cleanConst = (constituency || req.user!.constituency).trim();
  const cleanDesc = (description || '').trim();
  const cleanDoc = (document_name || 'demo_supporting_document.pdf').trim();

  const validCats = [
    'New Registration Demonstration',
    'Profile Correction',
    'Address Update',
    'Accessibility Assistance',
    'Document Assistance',
  ];
  if (!validCats.includes(cleanCat)) {
    res.status(400).json({ error: 'Please select a valid application category.' });
    return;
  }
  if (!cleanName || !cleanEmail || !cleanDistrict || !cleanConst || cleanDesc.length < 10) {
    res.status(400).json({ error: 'All required fields and a description (minimum 10 characters) must be provided.' });
    return;
  }

  // Assign an officer from the matching district if available
  const officer = db
    .prepare("SELECT id, full_name FROM users WHERE role = 'officer' AND district = ? AND is_active = 1 LIMIT 1")
    .get(cleanDistrict) as { id: number; full_name: string } | undefined;
  const fallbackOfficer = db
    .prepare("SELECT id, full_name FROM users WHERE role = 'officer' AND is_active = 1 LIMIT 1")
    .get() as { id: number; full_name: string } | undefined;
  const assignedOfficer = officer || fallbackOfficer;

  // Duplicate / Repeated submission check (same user + same category within 24 hours)
  const recentSameCat = (
    db
      .prepare(
        "SELECT COUNT(*) as cnt FROM applications WHERE user_id = ? AND category = ? AND created_at >= datetime('now', '-1 day')"
      )
      .get(req.user!.id, cleanCat) as { cnt: number }
  ).cnt;

  const refNum = generateCode('APP-DEMO-2026');
  const ip = getClientIp(req);

  const createAppTx = db.transaction(() => {
    const r = db
      .prepare(
        'INSERT INTO applications (reference_number, user_id, assigned_officer_id, applicant_name, category, email, district, constituency, description, document_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        refNum,
        req.user!.id,
        assignedOfficer?.id || null,
        cleanName,
        cleanCat,
        cleanEmail,
        cleanDistrict,
        cleanConst,
        cleanDesc,
        cleanDoc,
        'Submitted'
      );
    const appId = Number(r.lastInsertRowid);

    db.prepare(
      'INSERT INTO application_history (application_id, status, changed_by_user_id, changed_by_name, remarks) VALUES (?, ?, ?, ?, ?)'
    ).run(appId, 'Submitted', req.user!.id, req.user!.full_name, 'Application submitted via portal.');

    createNotification(
      req.user!.id,
      'Application submitted',
      `Application ${refNum} Submitted`,
      `Your ${cleanCat} demonstration application has been received and queued for review.`,
      refNum
    );

    if (assignedOfficer) {
      createNotification(
        assignedOfficer.id,
        'Application submitted',
        `New Application Assigned (${refNum})`,
        `${cleanName} submitted a ${cleanCat} request in ${cleanConst}.`,
        refNum
      );
    }

    if (recentSameCat >= 1) {
      logSecurityEvent(
        'Repeated Application Submission',
        req.user!.id,
        req.user!.email,
        `User submitted repeated ${cleanCat} application (${refNum}) within 24 hours.`,
        ip
      );
      db.prepare(
        'INSERT INTO duplicate_flags (flag_type, entity_type, entity_ref, user_id, details, severity, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        'Repeated Application Submission',
        'application',
        refNum,
        req.user!.id,
        `Multiple submissions in category "${cleanCat}" within 24 hours.`,
        'Medium',
        'Flagged'
      );
    }

    logAudit(req.user!, 'APPLICATION_SUBMITTED', 'application', refNum, `Submitted ${cleanCat}`);
    return { appId, duplicateFlagged: recentSameCat >= 1 };
  });

  const result = createAppTx();
  const created = db.prepare('SELECT * FROM applications WHERE id = ?').get(result.appId);
  res.status(201).json({
    application: created,
    duplicateFlagged: result.duplicateFlagged,
    message: result.duplicateFlagged
      ? `Application ${refNum} submitted (flagged for officer review due to recent repeat submission in this category).`
      : `Application ${refNum} submitted successfully.`,
  });
});

voterRouter.get('/applications/:id', requireAuth, (req: AuthedRequest, res) => {
  const appId = Number(req.params.id);
  const app = db
    .prepare(
      `SELECT a.*, o.full_name as assigned_officer_name
       FROM applications a
       LEFT JOIN users o ON o.id = a.assigned_officer_id
       WHERE a.id = ?`
    )
    .get(appId) as { id: number; user_id: number; assigned_officer_id: number | null; district: string } | undefined;

  if (!app) {
    res.status(404).json({ error: 'Application not found.' });
    return;
  }
  if (req.user!.role === 'voter' && app.user_id !== req.user!.id) {
    res.status(403).json({ error: 'You are only permitted to view your own applications.' });
    return;
  }
  const history = db
    .prepare('SELECT * FROM application_history WHERE application_id = ? ORDER BY id ASC')
    .all(appId);

  res.json({ application: app, history });
});

voterRouter.patch(
  '/applications/:id/review',
  requireRoles(['officer', 'admin', 'super_admin']),
  (req: AuthedRequest, res) => {
    const appId = Number(req.params.id);
    const { status, remarks } = req.body as { status?: string; remarks?: string };
    const validStatuses = ['Under Review', 'Action Required', 'Approved', 'Rejected', 'Completed'];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid application review status.' });
      return;
    }
    const cleanRemarks = (remarks || '').trim();
    if (cleanRemarks.length < 4) {
      res.status(400).json({ error: 'Please provide officer review remarks (minimum 4 characters).' });
      return;
    }

    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId) as
      | { id: number; user_id: number; reference_number: string; assigned_officer_id: number | null; district: string }
      | undefined;

    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (
      req.user!.role === 'officer' &&
      app.assigned_officer_id !== null &&
      app.assigned_officer_id !== req.user!.id &&
      app.district !== req.user!.district
    ) {
      res.status(403).json({ error: 'Officers can only review applications assigned to them or their district.' });
      return;
    }

    const reviewTx = db.transaction(() => {
      db.prepare(
        "UPDATE applications SET status = ?, assigned_officer_id = COALESCE(assigned_officer_id, ?), updated_at = datetime('now') WHERE id = ?"
      ).run(status, req.user!.id, appId);

      db.prepare(
        'INSERT INTO application_history (application_id, status, changed_by_user_id, changed_by_name, remarks) VALUES (?, ?, ?, ?, ?)'
      ).run(appId, status, req.user!.id, req.user!.full_name, cleanRemarks);

      const eventType =
        status === 'Action Required' ? 'Additional information requested' : 'Application status changed';
      createNotification(
        app.user_id,
        eventType,
        `Application ${app.reference_number}: ${status}`,
        `${req.user!.full_name} updated your application status to ${status}. Remarks: ${cleanRemarks}`,
        app.reference_number
      );

      logAudit(
        req.user!,
        'APPLICATION_STATUS_UPDATED',
        'application',
        app.reference_number,
        `Changed status to ${status}: ${cleanRemarks}`
      );
    });

    reviewTx();
    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);
    const history = db.prepare('SELECT * FROM application_history WHERE application_id = ? ORDER BY id ASC').all(appId);
    res.json({ application: updated, history, message: `Application updated to ${status}.` });
  }
);

// ─── COMPLAINT MANAGEMENT ───────────────────────────────────────────────────

voterRouter.get('/complaints', requireAuth, (req: AuthedRequest, res) => {
  const { q = '', status = '', category = '' } = req.query as Record<string, string>;
  const role = req.user!.role;
  const uid = req.user!.id;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (role === 'voter') {
    conditions.push('c.user_id = ?');
    params.push(uid);
  } else if (role === 'officer') {
    conditions.push('(c.assigned_officer_id = ? OR c.assigned_officer_id IS NULL)');
    params.push(uid);
  }

  if (q.trim()) {
    conditions.push('(c.reference_number LIKE ? OR c.subject LIKE ? OR c.description LIKE ? OR u.full_name LIKE ?)');
    const like = `%${q.trim()}%`;
    params.push(like, like, like, like);
  }
  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }
  if (category) {
    conditions.push('c.category = ?');
    params.push(category);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT c.*, u.full_name as complainant_name, u.email as complainant_email, o.full_name as assigned_officer_name
       FROM complaints c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN users o ON o.id = c.assigned_officer_id
       ${whereClause}
       ORDER BY c.updated_at DESC`
    )
    .all(...params);

  res.json({ complaints: rows });
});

voterRouter.post('/complaints', requireAuth, (req: AuthedRequest, res) => {
  const { category, subject, description, attachment_name } = req.body as Record<string, string | undefined>;
  const validCats = [
    'Application Issue',
    'Polling Information',
    'Accessibility Issue',
    'Portal Technical Issue',
    'General Enquiry',
  ];

  const cleanCat = (category || '').trim();
  const cleanSubj = (subject || '').trim();
  const cleanDesc = (description || '').trim();
  const cleanAttach = (attachment_name || '').trim();

  if (!validCats.includes(cleanCat)) {
    res.status(400).json({ error: 'Please select a valid complaint category.' });
    return;
  }
  if (cleanSubj.length < 4 || cleanDesc.length < 10) {
    res.status(400).json({ error: 'Please provide a subject and detailed description (minimum 10 characters).' });
    return;
  }

  const officer = db
    .prepare("SELECT id, full_name FROM users WHERE role = 'officer' AND district = ? AND is_active = 1 LIMIT 1")
    .get(req.user!.district) as { id: number; full_name: string } | undefined;
  const fallbackOfficer = db
    .prepare("SELECT id, full_name FROM users WHERE role = 'officer' AND is_active = 1 LIMIT 1")
    .get() as { id: number; full_name: string } | undefined;
  const assigned = officer || fallbackOfficer;

  const refNum = generateCode('CMP-DEMO-2026');

  const compTx = db.transaction(() => {
    const r = db
      .prepare(
        'INSERT INTO complaints (reference_number, user_id, assigned_officer_id, category, subject, description, attachment_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(refNum, req.user!.id, assigned?.id || null, cleanCat, cleanSubj, cleanDesc, cleanAttach, 'Submitted');
    const compId = Number(r.lastInsertRowid);

    db.prepare(
      'INSERT INTO complaint_history (complaint_id, status, changed_by_user_id, changed_by_name, remarks) VALUES (?, ?, ?, ?, ?)'
    ).run(compId, 'Submitted', req.user!.id, req.user!.full_name, 'Grievance registered by citizen.');

    createNotification(
      req.user!.id,
      'Complaint submitted',
      `Complaint ${refNum} Logged`,
      `Your ${cleanCat} grievance has been submitted and assigned reference ${refNum}.`,
      refNum
    );

    if (assigned) {
      createNotification(
        assigned.id,
        'Complaint submitted',
        `Grievance Assigned (${refNum})`,
        `New ${cleanCat} complaint submitted: ${cleanSubj}`,
        refNum
      );
    }

    logAudit(req.user!, 'COMPLAINT_SUBMITTED', 'complaint', refNum, `Submitted ${cleanCat}`);
    return compId;
  });

  const compId = compTx();
  const created = db.prepare('SELECT * FROM complaints WHERE id = ?').get(compId);
  res.status(201).json({ complaint: created, message: `Complaint ${refNum} submitted successfully.` });
});

voterRouter.get('/complaints/:id', requireAuth, (req: AuthedRequest, res) => {
  const compId = Number(req.params.id);
  const comp = db
    .prepare(
      `SELECT c.*, u.full_name as complainant_name, o.full_name as assigned_officer_name
       FROM complaints c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN users o ON o.id = c.assigned_officer_id
       WHERE c.id = ?`
    )
    .get(compId) as { id: number; user_id: number } | undefined;

  if (!comp) {
    res.status(404).json({ error: 'Complaint not found.' });
    return;
  }
  if (req.user!.role === 'voter' && comp.user_id !== req.user!.id) {
    res.status(403).json({ error: 'You can only view your own complaints.' });
    return;
  }
  const history = db
    .prepare('SELECT * FROM complaint_history WHERE complaint_id = ? ORDER BY id ASC')
    .all(compId);

  res.json({ complaint: comp, history });
});

voterRouter.patch(
  '/complaints/:id/manage',
  requireRoles(['officer', 'admin', 'super_admin']),
  (req: AuthedRequest, res) => {
    const compId = Number(req.params.id);
    const { status, officer_response, assigned_officer_id } = req.body as {
      status?: string;
      officer_response?: string;
      assigned_officer_id?: number;
    };

    const validStatuses = ['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid complaint status.' });
      return;
    }

    const existing = db.prepare('SELECT * FROM complaints WHERE id = ?').get(compId) as
      | { id: number; user_id: number; reference_number: string; status: string; officer_response: string; assigned_officer_id: number | null }
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const nextStatus = status || existing.status;
    const nextResponse = (officer_response ?? existing.officer_response).trim();
    const nextOfficerId = assigned_officer_id !== undefined ? assigned_officer_id : existing.assigned_officer_id || req.user!.id;

    const tx = db.transaction(() => {
      db.prepare(
        "UPDATE complaints SET status = ?, officer_response = ?, assigned_officer_id = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(nextStatus, nextResponse, nextOfficerId, compId);

      db.prepare(
        'INSERT INTO complaint_history (complaint_id, status, changed_by_user_id, changed_by_name, remarks) VALUES (?, ?, ?, ?, ?)'
      ).run(
        compId,
        nextStatus,
        req.user!.id,
        req.user!.full_name,
        nextResponse || `Status updated to ${nextStatus}`
      );

      const notifEvent = nextStatus === 'Resolved' ? 'Complaint resolved' : 'Complaint status changed';
      createNotification(
        existing.user_id,
        notifEvent,
        `Complaint ${existing.reference_number}: ${nextStatus}`,
        nextResponse || `Your complaint status has been updated to ${nextStatus}.`,
        existing.reference_number
      );

      logAudit(
        req.user!,
        'COMPLAINT_UPDATED',
        'complaint',
        existing.reference_number,
        `Updated complaint status to ${nextStatus}`
      );
    });

    tx();
    const updated = db
      .prepare(
        `SELECT c.*, u.full_name as complainant_name, o.full_name as assigned_officer_name
         FROM complaints c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN users o ON o.id = c.assigned_officer_id
         WHERE c.id = ?`
      )
      .get(compId);
    const history = db.prepare('SELECT * FROM complaint_history WHERE complaint_id = ? ORDER BY id ASC').all(compId);

    res.json({ complaint: updated, history, message: `Complaint updated to ${nextStatus}.` });
  }
);

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

voterRouter.get('/notifications', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user!.id);
  const unread = (
    db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user!.id) as {
      cnt: number;
    }
  ).cnt;
  res.json({ notifications: rows, unreadCount: unread });
});

voterRouter.patch('/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
  const nid = Number(req.params.id);
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(nid, req.user!.id);
  res.json({ success: true });
});

voterRouter.patch('/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
  res.json({ success: true });
});

// ─── SIMULATED FACE VERIFICATION DEMONSTRATION ──────────────────────────────

const DEMO_FACE_PROFILES = [
  {
    code: 'SIM-PROF-01',
    name: 'Fictional Demo Profile A — Standard Match Simulation',
    district: 'Chennai',
    outcome: 'Demo Verified' as const,
    note: 'Simulated check completed cleanly using fictional reference profile. Zero biometric data captured.',
  },
  {
    code: 'SIM-PROF-02',
    name: 'Fictional Demo Profile B — Lighting Variance Simulation',
    district: 'Coimbatore',
    outcome: 'Manual Review Required' as const,
    note: 'Simulated threshold returned borderline result to demonstrate manual officer review workflow.',
  },
  {
    code: 'SIM-PROF-03',
    name: 'Fictional Demo Profile C — Mismatch Simulation',
    district: 'Madurai',
    outcome: 'Verification Unsuccessful' as const,
    note: 'Simulated profile mismatch triggered so evaluator can test manual review escalation.',
  },
  {
    code: 'SIM-PROF-04',
    name: 'Fictional Demo Profile D — Accessibility Assisted Simulation',
    district: 'Bengaluru Urban',
    outcome: 'Demo Verified' as const,
    note: 'Simulated verification succeeded with accessibility flag noted.',
  },
];

voterRouter.get('/verification/demo-profiles', (_req, res) => {
  res.json({ profiles: DEMO_FACE_PROFILES });
});

voterRouter.get('/verification/history', requireAuth, (req: AuthedRequest, res) => {
  const isStaff = ['officer', 'admin', 'super_admin'].includes(req.user!.role);
  const rows = isStaff && req.query.scope === 'all'
    ? db
        .prepare(
          `SELECT vr.*, u.full_name as user_name, u.email as user_email
           FROM verification_records vr
           JOIN users u ON u.id = vr.user_id
           ORDER BY vr.created_at DESC`
        )
        .all()
    : db
        .prepare('SELECT * FROM verification_records WHERE user_id = ? ORDER BY created_at DESC')
        .all(req.user!.id);
  res.json({ records: rows });
});

voterRouter.post('/verification/simulate', requireAuth, (req: AuthedRequest, res) => {
  const { demo_profile_code, consent_accepted } = req.body as {
    demo_profile_code?: string;
    consent_accepted?: boolean;
  };

  if (!consent_accepted) {
    res.status(400).json({ error: 'You must read and accept the educational consent notice before running the simulation.' });
    return;
  }

  const profile = DEMO_FACE_PROFILES.find((p) => p.code === demo_profile_code);
  if (!profile) {
    res.status(400).json({ error: 'Please select a valid fictional demonstration profile.' });
    return;
  }

  const verifRef = generateCode('VRF-DEMO');

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO consent_records (user_id, consent_type, consent_version, accepted) VALUES (?, ?, ?, 1)').run(
      req.user!.id,
      'Simulated Face Verification Demo',
      'v1.0'
    );

    const r = db
      .prepare(
        'INSERT INTO verification_records (verification_ref, user_id, demo_profile_name, demo_profile_code, result, confidence_note, manual_review_requested, manual_review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        verifRef,
        req.user!.id,
        profile.name,
        profile.code,
        profile.outcome,
        profile.note,
        profile.outcome === 'Manual Review Required' ? 1 : 0,
        profile.outcome === 'Manual Review Required' ? 'Pending' : 'None'
      );

    const recordId = Number(r.lastInsertRowid);

    if (profile.outcome === 'Manual Review Required') {
      db.prepare(
        'INSERT INTO review_cases (case_ref, case_type, target_id, target_ref, status, remarks) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(generateCode('CASE-DEMO'), 'Manual Verification', recordId, verifRef, 'Open', 'Auto-created from simulation');
    }

    db.prepare(
      "UPDATE voter_profiles SET verification_status = ?, updated_at = datetime('now') WHERE user_id = ?"
    ).run(
      profile.outcome === 'Demo Verified' ? 'Demo Verified' : 'Manual Review Required',
      req.user!.id
    );

    createNotification(
      req.user!.id,
      'Demo verification completed',
      `Simulated Verification: ${profile.outcome}`,
      `Verification reference ${verifRef} recorded as "${profile.outcome}".`,
      verifRef
    );

    logAudit(
      req.user!,
      'SIMULATED_FACE_VERIFICATION',
      'verification_record',
      verifRef,
      `Simulated verification with ${profile.code}: ${profile.outcome}`
    );

    return recordId;
  });

  const id = tx();
  const created = db.prepare('SELECT * FROM verification_records WHERE id = ?').get(id);
  res.status(201).json({ record: created, message: `Simulated verification completed: ${profile.outcome}.` });
});

voterRouter.post('/verification/:id/manual-review', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { remarks } = req.body as { remarks?: string };
  const record = db.prepare('SELECT * FROM verification_records WHERE id = ?').get(id) as
    | { id: number; user_id: number; verification_ref: string; manual_review_requested: number }
    | undefined;

  if (!record || record.user_id !== req.user!.id) {
    res.status(404).json({ error: 'Verification record not found.' });
    return;
  }

  db.transaction(() => {
    db.prepare(
      "UPDATE verification_records SET manual_review_requested = 1, manual_review_status = 'Pending', review_remarks = ? WHERE id = ?"
    ).run((remarks || 'Citizen requested manual officer review.').trim(), id);

    db.prepare(
      'INSERT INTO review_cases (case_ref, case_type, target_id, target_ref, status, remarks) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      generateCode('CASE-DEMO'),
      'Manual Verification',
      id,
      record.verification_ref,
      'Open',
      (remarks || 'Citizen requested manual officer review.').trim()
    );

    const officer = db.prepare("SELECT id FROM users WHERE role = 'officer' AND is_active = 1 LIMIT 1").get() as
      | { id: number }
      | undefined;
    if (officer) {
      createNotification(
        officer.id,
        'Security review updated',
        `Manual Review Requested (${record.verification_ref})`,
        `${req.user!.full_name} requested manual review for simulated verification ${record.verification_ref}.`,
        record.verification_ref
      );
    }
  })();

  const updated = db.prepare('SELECT * FROM verification_records WHERE id = ?').get(id);
  res.json({ record: updated, message: 'Manual officer review request submitted.' });
});

voterRouter.patch(
  '/verification/:id/resolve',
  requireRoles(['officer', 'admin', 'super_admin']),
  (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { decision, remarks } = req.body as { decision?: 'Approved' | 'Rejected'; remarks?: string };
    if (decision !== 'Approved' && decision !== 'Rejected') {
      res.status(400).json({ error: 'Decision must be Approved or Rejected.' });
      return;
    }

    const record = db.prepare('SELECT * FROM verification_records WHERE id = ?').get(id) as
      | { id: number; user_id: number; verification_ref: string }
      | undefined;
    if (!record) {
      res.status(404).json({ error: 'Verification record not found.' });
      return;
    }

    const nextResult = decision === 'Approved' ? 'Demo Verified' : 'Verification Unsuccessful';

    db.transaction(() => {
      db.prepare(
        'UPDATE verification_records SET manual_review_status = ?, result = ?, reviewed_by_name = ?, review_remarks = ? WHERE id = ?'
      ).run(decision, nextResult, req.user!.full_name, (remarks || '').trim(), id);

      db.prepare(
        "UPDATE review_cases SET status = 'Resolved', decision = ?, remarks = ?, assigned_officer_id = ?, updated_at = datetime('now') WHERE target_id = ? AND case_type = 'Manual Verification'"
      ).run(decision, (remarks || '').trim(), req.user!.id, id);

      db.prepare(
        "UPDATE voter_profiles SET verification_status = ?, updated_at = datetime('now') WHERE user_id = ?"
      ).run(nextResult, record.user_id);

      createNotification(
        record.user_id,
        'Demo verification completed',
        `Manual Review ${decision} (${record.verification_ref})`,
        `Officer ${req.user!.full_name} marked your manual verification review as ${decision}.`,
        record.verification_ref
      );

      logAudit(req.user!, 'MANUAL_VERIFICATION_RESOLVED', 'verification_record', record.verification_ref, decision);
    })();

    res.json({ message: `Manual verification review marked as ${decision}.` });
  }
);

// ─── DEMONSTRATION QR VERIFICATION SYSTEM ───────────────────────────────────

voterRouter.get('/qr/my-tokens', requireAuth, async (req: AuthedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM qr_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 10')
    .all(req.user!.id) as Array<{
    id: number;
    token_code: string;
    demo_ref_number: string;
    expires_at: string;
    is_used: number;
    used_at: string | null;
    verification_attempts: number;
    created_at: string;
  }>;

  const enriched = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      qrDataUrl: await QRCode.toDataURL(r.token_code, { width: 180, margin: 1 }),
    }))
  );
  res.json({ tokens: enriched });
});

voterRouter.post('/qr/generate', requireAuth, async (req: AuthedRequest, res) => {
  const profile = db.prepare('SELECT demo_ref_number FROM voter_profiles WHERE user_id = ?').get(req.user!.id) as
    | { demo_ref_number: string }
    | undefined;
  const demoRef = profile?.demo_ref_number || `DEMO-VTR-2026-${String(1000 + req.user!.id)}`;
  const ttlRow = db.prepare("SELECT value FROM system_settings WHERE key = 'qr_token_ttl_minutes'").get() as
    | { value: string }
    | undefined;
  const ttlMins = Math.max(5, Number(ttlRow?.value || 15));
  const expiresAt = new Date(Date.now() + ttlMins * 60 * 1000).toISOString();
  const tokenCode = `DEMO-QR-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const r = db
    .prepare('INSERT INTO qr_tokens (token_code, user_id, demo_ref_number, expires_at) VALUES (?, ?, ?, ?)')
    .run(tokenCode, req.user!.id, demoRef, expiresAt);

  logAudit(req.user!, 'QR_TOKEN_GENERATED', 'qr_token', tokenCode, `Generated demo QR token valid for ${ttlMins} mins`);

  const token = db.prepare('SELECT * FROM qr_tokens WHERE id = ?').get(Number(r.lastInsertRowid)) as Record<
    string,
    unknown
  >;
  const qrDataUrl = await QRCode.toDataURL(tokenCode, { width: 200, margin: 1 });
  res.status(201).json({ token: { ...token, qrDataUrl }, message: 'Single-use demonstration QR token generated.' });
});

voterRouter.post('/qr/validate', (req: AuthedRequest, res) => {
  const { token_code } = req.body as { token_code?: string };
  const cleanCode = (token_code || '').trim().toUpperCase();
  const ip = getClientIp(req);
  const actorEmail = req.user?.email || 'anonymous-verifier';

  if (!cleanCode) {
    res.status(400).json({ valid: false, status: 'Invalid', error: 'Please enter or select a QR reference token.' });
    return;
  }

  const tokenRow = db
    .prepare(
      `SELECT qt.*, u.full_name, u.district, u.constituency
       FROM qr_tokens qt
       JOIN users u ON u.id = qt.user_id
       WHERE UPPER(qt.token_code) = ?`
    )
    .get(cleanCode) as
    | {
        id: number;
        token_code: string;
        user_id: number;
        demo_ref_number: string;
        expires_at: string;
        is_used: number;
        used_at: string | null;
        verification_attempts: number;
        full_name: string;
        district: string;
        constituency: string;
      }
    | undefined;

  if (!tokenRow) {
    logSecurityEvent(
      'Invalid Demo Token',
      req.user?.id || null,
      actorEmail,
      `Validation attempted with unrecognized demo QR token "${cleanCode}".`,
      ip
    );
    res.status(404).json({
      valid: false,
      status: 'Not Found',
      error: 'Invalid demonstration QR token. This attempt has been recorded in Security Monitoring.',
    });
    return;
  }

  db.prepare('UPDATE qr_tokens SET verification_attempts = verification_attempts + 1 WHERE id = ?').run(tokenRow.id);

  if (tokenRow.is_used === 1) {
    logSecurityEvent(
      'Invalid Demo Token',
      req.user?.id || tokenRow.user_id,
      actorEmail,
      `Attempted reuse of already-redeemed demo QR token "${cleanCode}".`,
      ip
    );
    res.status(409).json({
      valid: false,
      status: 'Already Used',
      error: `Token ${cleanCode} was already used at ${tokenRow.used_at}. Reuse is blocked and logged.`,
      token: tokenRow,
    });
    return;
  }

  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    logSecurityEvent(
      'Invalid Demo Token',
      req.user?.id || tokenRow.user_id,
      actorEmail,
      `Attempted validation of expired demo QR token "${cleanCode}".`,
      ip
    );
    res.status(410).json({
      valid: false,
      status: 'Expired',
      error: `Token ${cleanCode} expired at ${tokenRow.expires_at}.`,
      token: tokenRow,
    });
    return;
  }

  const nowIso = new Date().toISOString();
  db.prepare('UPDATE qr_tokens SET is_used = 1, used_at = ? WHERE id = ?').run(nowIso, tokenRow.id);
  logAudit(req.user || null, 'QR_TOKEN_VALIDATED', 'qr_token', cleanCode, `Validated and consumed single-use demo token`);

  res.json({
    valid: true,
    status: 'Validated & Consumed',
    message: `Demonstration QR token ${cleanCode} verified cleanly for ${tokenRow.full_name} (${tokenRow.demo_ref_number}). Single-use token is now marked as used.`,
    token: { ...tokenRow, is_used: 1, used_at: nowIso, verification_attempts: tokenRow.verification_attempts + 1 },
  });
});
