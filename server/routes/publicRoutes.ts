import { Router } from 'express';
import type { AuthedRequest } from '../auth.ts';
import { db } from '../db.ts';

export const publicRouter = Router();

publicRouter.get('/overview', (_req, res) => {
  const announcements = db
    .prepare('SELECT * FROM elections WHERE is_announcement = 1 ORDER BY event_date ASC')
    .all();
  const calendar = db.prepare('SELECT * FROM elections ORDER BY event_date ASC').all();
  const constituencies = db.prepare('SELECT * FROM constituencies ORDER BY name ASC').all();
  const stats = {
    constituencies: (db.prepare('SELECT COUNT(*) as c FROM constituencies').get() as { c: number }).c,
    pollingStations: (db.prepare('SELECT COUNT(*) as c FROM polling_stations').get() as { c: number }).c,
    candidates: (db.prepare('SELECT COUNT(*) as c FROM candidates WHERE is_published = 1').get() as { c: number }).c,
    parties: (db.prepare('SELECT COUNT(*) as c FROM political_parties').get() as { c: number }).c,
    applicationsProcessed: (db.prepare("SELECT COUNT(*) as c FROM applications WHERE status IN ('Approved', 'Completed')").get() as { c: number }).c,
    registeredDemoVoters: (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'voter'").get() as { c: number }).c,
  };
  const publicNotices = db
    .prepare(
      `SELECT id, title, election_type, event_date, constituency, status, description
       FROM elections
       ORDER BY id DESC LIMIT 5`
    )
    .all();

  res.json({ announcements, calendar, constituencies, stats, publicNotices });
});

publicRouter.get('/constituencies', (_req, res) => {
  const rows = db.prepare('SELECT * FROM constituencies ORDER BY name ASC').all();
  res.json({ constituencies: rows });
});

publicRouter.get('/candidates', (req: AuthedRequest, res) => {
  const { q = '', constituency_id = '', party_id = '', district = '', include_unpublished = '' } = req.query as Record<
    string,
    string
  >;
  const canSeeUnpublished =
    include_unpublished === '1' && (req.user?.role === 'admin' || req.user?.role === 'super_admin');

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!canSeeUnpublished) {
    conditions.push('c.is_published = 1');
  }
  if (q.trim()) {
    conditions.push('(c.name LIKE ? OR c.education LIKE ? OR c.manifesto LIKE ? OR p.name LIKE ? OR co.name LIKE ? OR co.district LIKE ?)');
    const like = `%${q.trim()}%`;
    params.push(like, like, like, like, like, like);
  }
  if (district.trim()) {
    conditions.push('co.district = ?');
    params.push(district.trim());
  }
  if (constituency_id) {
    conditions.push('c.constituency_id = ?');
    params.push(Number(constituency_id));
  }
  if (party_id) {
    conditions.push('c.party_id = ?');
    params.push(Number(party_id));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT c.*, p.name as party_name, p.short_code as party_code, p.color_hex as party_color, p.logo_url as party_logo, p.symbol_name as party_symbol,
              co.name as constituency_name, co.district as constituency_district, co.state as constituency_state
       FROM candidates c
       JOIN political_parties p ON p.id = c.party_id
       JOIN constituencies co ON co.id = c.constituency_id
       ${whereClause}
       ORDER BY c.id ASC`
    )
    .all(...params);

  res.json({ candidates: rows });
});

publicRouter.get('/candidates/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT c.*, p.name as party_name, p.short_code as party_code, p.color_hex as party_color, p.logo_url as party_logo, p.symbol_name as party_symbol,
              co.name as constituency_name, co.district as constituency_district, co.state as constituency_state
       FROM candidates c
       JOIN political_parties p ON p.id = c.party_id
       JOIN constituencies co ON co.id = c.constituency_id
       WHERE c.id = ?`
    )
    .get(Number(req.params.id));

  if (!row) {
    res.status(404).json({ error: 'Candidate not found.' });
    return;
  }
  res.json({ candidate: row });
});

publicRouter.get('/parties', (_req, res) => {
  const parties = db.prepare('SELECT * FROM political_parties ORDER BY id ASC').all() as Array<Record<string, unknown>>;
  const candidates = db
    .prepare(
      `SELECT c.id, c.name, c.party_id, c.photo_url, co.name as constituency_name
       FROM candidates c
       JOIN constituencies co ON co.id = c.constituency_id
       WHERE c.is_published = 1
       ORDER BY c.name ASC`
    )
    .all() as Array<{ id: number; name: string; party_id: number; photo_url: string; constituency_name: string }>;

  const enriched = parties.map((p) => ({
    ...p,
    candidates: candidates.filter((c) => c.party_id === p.id),
  }));
  res.json({ parties: enriched });
});

publicRouter.get('/polling-areas', (req, res) => {
  const { district = '', constituency_id = '' } = req.query as Record<string, string>;
  const conditions: string[] = ["ps.polling_area != ''"];
  const params: unknown[] = [];

  if (district.trim()) {
    conditions.push('ps.district = ?');
    params.push(district.trim());
  }
  if (constituency_id) {
    conditions.push('ps.constituency_id = ?');
    params.push(Number(constituency_id));
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const rows = db
    .prepare(
      `SELECT ps.polling_area, ps.district, ps.constituency_id, co.name as constituency_name, co.state as state_name, COUNT(*) as booth_count
       FROM polling_stations ps
       JOIN constituencies co ON co.id = ps.constituency_id
       ${whereClause}
       GROUP BY ps.polling_area, ps.district, ps.constituency_id
       ORDER BY ps.district ASC, co.name ASC, ps.polling_area ASC`
    )
    .all(...params);

  res.json({ pollingAreas: rows });
});

publicRouter.get('/polling-stations', (req, res) => {
  const {
    q = '',
    state = '',
    district = '',
    constituency_id = '',
    polling_area = '',
    location_type = '',
    pin_code = '',
  } = req.query as Record<string, string>;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q.trim()) {
    conditions.push(
      '(ps.name LIKE ? OR ps.address LIKE ? OR ps.pin_code LIKE ? OR ps.district LIKE ? OR co.name LIKE ? OR ps.station_code LIKE ? OR ps.polling_area LIKE ? OR ps.booth_number LIKE ?)'
    );
    const like = `%${q.trim()}%`;
    params.push(like, like, like, like, like, like, like, like);
  }
  if (state.trim()) {
    conditions.push('co.state = ?');
    params.push(state.trim());
  }
  if (district.trim()) {
    conditions.push('ps.district = ?');
    params.push(district.trim());
  }
  if (constituency_id) {
    conditions.push('ps.constituency_id = ?');
    params.push(Number(constituency_id));
  }
  if (polling_area.trim()) {
    conditions.push('ps.polling_area = ?');
    params.push(polling_area.trim());
  }
  if (location_type.trim()) {
    conditions.push('ps.location_type = ?');
    params.push(location_type.trim());
  }
  if (pin_code.trim()) {
    conditions.push('ps.pin_code LIKE ?');
    params.push(`%${pin_code.trim()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT ps.*, co.name as constituency_name, co.state as state_name
       FROM polling_stations ps
       JOIN constituencies co ON co.id = ps.constituency_id
       ${whereClause}
       ORDER BY ps.district ASC, co.name ASC, ps.polling_area ASC, ps.id ASC`
    )
    .all(...params);

  res.json({ pollingStations: rows });
});

publicRouter.get('/track-application/:ref', (req, res) => {
  const ref = (req.params.ref || '').trim().toUpperCase();
  const app = db
    .prepare(
      `SELECT id, reference_number, category, district, constituency, status, created_at, updated_at
       FROM applications
       WHERE UPPER(reference_number) = ?`
    )
    .get(ref) as { id: number } | undefined;

  if (!app) {
    res.status(404).json({ error: `No demonstration application found with reference number "${ref}".` });
    return;
  }

  const history = db
    .prepare(
      'SELECT status, changed_by_name, remarks, created_at FROM application_history WHERE application_id = ? ORDER BY id ASC'
    )
    .all(app.id);

  res.json({ application: app, history });
});
