import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildTamilNaduDataset } from './tamilNaduData.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'election_portal.db');
export const db = new Database(DB_PATH);

db.pragma('busy_timeout = 5000');
db.pragma('journal_mode = DELETE');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function generateCode(prefix: string): string {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  const ts = Date.now().toString().slice(-4);
  return `${prefix}-${ts}-${rand}`;
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      mobile TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('voter', 'officer', 'admin', 'super_admin')),
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      constituency TEXT NOT NULL,
      language_pref TEXT NOT NULL DEFAULT 'en' CHECK(language_pref IN ('en', 'ta', 'hi')),
      is_active INTEGER NOT NULL DEFAULT 1,
      permissions_json TEXT NOT NULL DEFAULT '{}',
      reset_token TEXT,
      reset_expires TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS constituencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      district TEXT NOT NULL,
      state TEXT NOT NULL,
      registered_demo_voters INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS political_parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      short_code TEXT NOT NULL UNIQUE,
      symbol_name TEXT NOT NULL,
      logo_url TEXT NOT NULL,
      color_hex TEXT NOT NULL,
      description TEXT NOT NULL,
      website TEXT NOT NULL,
      manifesto_summary TEXT NOT NULL,
      founded_year INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS polling_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      pin_code TEXT NOT NULL,
      district TEXT NOT NULL,
      constituency_id INTEGER NOT NULL REFERENCES constituencies(id) ON DELETE CASCADE,
      polling_area TEXT NOT NULL DEFAULT '',
      booth_number TEXT NOT NULL DEFAULT '',
      location_type TEXT NOT NULL DEFAULT 'School',
      accessibility_facilities TEXT NOT NULL,
      available_facilities TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      image_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS voter_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      demo_ref_number TEXT NOT NULL UNIQUE,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL,
      address TEXT NOT NULL,
      pin_code TEXT NOT NULL,
      polling_station_id INTEGER REFERENCES polling_stations(id) ON DELETE SET NULL,
      verification_status TEXT NOT NULL DEFAULT 'Pending',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS officers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      officer_code TEXT NOT NULL UNIQUE,
      assigned_district TEXT NOT NULL,
      assigned_constituency TEXT NOT NULL,
      designation TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      party_id INTEGER NOT NULL REFERENCES political_parties(id) ON DELETE CASCADE,
      constituency_id INTEGER NOT NULL REFERENCES constituencies(id) ON DELETE CASCADE,
      education TEXT NOT NULL,
      experience TEXT NOT NULL,
      manifesto TEXT NOT NULL,
      declaration_url TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1,
      age INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      applicant_name TEXT NOT NULL,
      category TEXT NOT NULL,
      email TEXT NOT NULL,
      district TEXT NOT NULL,
      constituency TEXT NOT NULL,
      description TEXT NOT NULL,
      document_name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Under Review', 'Action Required', 'Approved', 'Rejected', 'Completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS application_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      changed_by_name TEXT NOT NULL,
      remarks TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      attachment_name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Assigned', 'In Progress', 'Resolved', 'Closed')),
      officer_response TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS complaint_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      changed_by_name TEXT NOT NULL,
      remarks TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS elections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      election_type TEXT NOT NULL,
      phase TEXT NOT NULL,
      event_date TEXT NOT NULL,
      constituency TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      is_announcement INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_ref TEXT NOT NULL DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verification_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      verification_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      demo_profile_name TEXT NOT NULL,
      demo_profile_code TEXT NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('Demo Verified', 'Verification Unsuccessful', 'Manual Review Required')),
      confidence_note TEXT NOT NULL,
      manual_review_requested INTEGER NOT NULL DEFAULT 0,
      manual_review_status TEXT NOT NULL DEFAULT 'None',
      reviewed_by_name TEXT NOT NULL DEFAULT '',
      review_remarks TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS consent_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      consent_type TEXT NOT NULL,
      consent_version TEXT NOT NULL,
      accepted INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS qr_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_code TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      demo_ref_number TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_used INTEGER NOT NULL DEFAULT 0,
      used_at TEXT,
      verification_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS duplicate_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flag_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_ref TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      details TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Flagged' CHECK(status IN ('Flagged', 'Under Review', 'Cleared', 'Escalated')),
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      review_decision TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL CHECK(event_type IN ('Repeated Failed Login', 'Duplicate Demo Registration', 'Repeated Application Submission', 'Invalid Demo Token', 'Unauthorised Admin Access Attempt')),
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_email TEXT NOT NULL,
      description TEXT NOT NULL,
      ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
      status TEXT NOT NULL DEFAULT 'Flagged' CHECK(status IN ('Flagged', 'Under Review', 'Cleared', 'Escalated')),
      assigned_officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      officer_remarks TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS review_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_ref TEXT NOT NULL UNIQUE,
      case_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      target_ref TEXT NOT NULL,
      assigned_officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'In Review', 'Resolved')),
      decision TEXT NOT NULL DEFAULT '',
      remarks TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS failed_login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensurePollingStationColumns();
  seedDemoData();
  syncPortalUpdates();
}

function ensurePollingStationColumns(): void {
  const cols = db.prepare('PRAGMA table_info(polling_stations)').all() as Array<{ name: string }>;
  const colSet = new Set(cols.map((c) => c.name));
  if (!colSet.has('polling_area')) {
    db.exec("ALTER TABLE polling_stations ADD COLUMN polling_area TEXT NOT NULL DEFAULT ''");
  }
  if (!colSet.has('booth_number')) {
    db.exec("ALTER TABLE polling_stations ADD COLUMN booth_number TEXT NOT NULL DEFAULT ''");
  }
  if (!colSet.has('location_type')) {
    db.exec("ALTER TABLE polling_stations ADD COLUMN location_type TEXT NOT NULL DEFAULT 'School'");
  }
}

function seedDemoData(): void {
  const existingUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (existingUsers.cnt > 0) {
    return;
  }

  const demoPassHash = hashPassword('DemoPass@2026');

  const seedTx = db.transaction(() => {
    // 1. Constituencies (5)
    const constituencies = [
      { name: 'Chennai Central Demo', code: 'DEMO-CC-01', district: 'Chennai', state: 'Tamil Nadu', voters: 148200 },
      { name: 'Coimbatore North Demo', code: 'DEMO-CN-02', district: 'Coimbatore', state: 'Tamil Nadu', voters: 132450 },
      { name: 'Madurai East Demo', code: 'DEMO-ME-03', district: 'Madurai', state: 'Tamil Nadu', voters: 119800 },
      { name: 'Bengaluru South Demo', code: 'DEMO-BS-04', district: 'Bengaluru Urban', state: 'Karnataka', voters: 164900 },
      { name: 'New Delhi Civic Demo', code: 'DEMO-ND-05', district: 'New Delhi', state: 'Delhi', voters: 141300 },
    ];
    const insertConst = db.prepare(
      'INSERT INTO constituencies (name, code, district, state, registered_demo_voters) VALUES (?, ?, ?, ?, ?)'
    );
    const constIds: number[] = [];
    for (const c of constituencies) {
      const r = insertConst.run(c.name, c.code, c.district, c.state, c.voters);
      constIds.push(Number(r.lastInsertRowid));
    }

    // 2. Political Parties (5) - using clean inline SVG data URIs for crisp vector emblems
    const makePartySvg = (bg: string, letter: string) =>
      `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="16" fill="${bg}"/><circle cx="48" cy="48" r="28" fill="none" stroke="white" stroke-width="3" opacity="0.85"/><text x="48" y="56" font-family="sans-serif" font-size="26" font-weight="700" fill="white" text-anchor="middle">${letter}</text></svg>`
      )}`;

    const parties = [
      {
        name: 'Civic Progress Alliance',
        short_code: 'CPA',
        symbol_name: 'Sun & Gear',
        logo_url: makePartySvg('#1D4ED8', 'CPA'),
        color_hex: '#1D4ED8',
        description: 'Fictional demonstration party focused on digital municipal governance, public transit, and educational infrastructure.',
        website: 'https://demo-cpa.example.edu',
        manifesto_summary: 'Open civic budgets, accessible transit corridors, neighborhood learning centers, and clean energy grids.',
        founded_year: 2012,
      },
      {
        name: 'People First Democratic Forum',
        short_code: 'PFDF',
        symbol_name: 'Open Book',
        logo_url: makePartySvg('#0F766E', 'PF'),
        color_hex: '#0F766E',
        description: 'Fictional demonstration party emphasizing healthcare clinics, rural connectivity, and public library modernization.',
        website: 'https://demo-pfdf.example.edu',
        manifesto_summary: 'Primary health access within 3 km, transparent local procurement, and vocational skill stipends.',
        founded_year: 2008,
      },
      {
        name: 'National Heritage & Reform Front',
        short_code: 'NHRF',
        symbol_name: 'Golden Torch',
        logo_url: makePartySvg('#D97706', 'NH'),
        color_hex: '#D97706',
        description: 'Fictional demonstration party advocating small enterprise credit, heritage conservation, and streamlined civic permits.',
        website: 'https://demo-nhrf.example.edu',
        manifesto_summary: 'Single-window artisan licensing, water body restoration, and heritage district preservation.',
        founded_year: 2005,
      },
      {
        name: 'Green Horizon Civic Coalition',
        short_code: 'GHCC',
        symbol_name: 'Oak Leaf',
        logo_url: makePartySvg('#15803D', 'GH'),
        color_hex: '#15803D',
        description: 'Fictional demonstration coalition dedicated to urban tree canopy expansion, solar microgrids, and zero-waste wards.',
        website: 'https://demo-ghcc.example.edu',
        manifesto_summary: '100% ward-level waste sorting, rainwater harvesting mandates, and pedestrian-safe civic zones.',
        founded_year: 2018,
      },
      {
        name: 'United Citizen Welfare Movement',
        short_code: 'UCWM',
        symbol_name: 'Civic Scales',
        logo_url: makePartySvg('#4338CA', 'UC'),
        color_hex: '#4338CA',
        description: 'Fictional demonstration movement centered on accessibility standards, senior citizen support, and public accountability.',
        website: 'https://demo-ucwm.example.edu',
        manifesto_summary: 'Barrier-free public buildings, quarterly ward town halls, and digital grievance resolution guarantees.',
        founded_year: 2015,
      },
    ];
    const insertParty = db.prepare(
      'INSERT INTO political_parties (name, short_code, symbol_name, logo_url, color_hex, description, website, manifesto_summary, founded_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const partyIds: number[] = [];
    for (const p of parties) {
      const r = insertParty.run(p.name, p.short_code, p.symbol_name, p.logo_url, p.color_hex, p.description, p.website, p.manifesto_summary, p.founded_year);
      partyIds.push(Number(r.lastInsertRowid));
    }

    // 3. Polling Stations (10)
    const stations = [
      { code: 'PS-DEMO-101', name: 'Govt Model Higher Secondary School', address: '14 Anna Salai, Teynampet', pin: '600018', district: 'Chennai', cid: constIds[0], access: 'Wheelchair Ramp, Tactile Path, Accessible Restroom, Braille Signage', avail: 'Drinking Water, Shaded Waiting Hall, Help Desk, First Aid Kit', lat: 13.0418, lng: 80.2512 },
      { code: 'PS-DEMO-102', name: 'Egmore Civic Community Hall', address: '82 Pantheon Road, Egmore', pin: '600008', district: 'Chennai', cid: constIds[0], access: 'Wheelchair Ramp, Ground Floor Booth, Priority Senior Lane', avail: 'Drinking Water, Seating Area, Help Desk, Backup Lighting', lat: 13.0732, lng: 80.2609 },
      { code: 'PS-DEMO-103', name: 'RS Puram Municipal Primary School', address: '27 Diwan Bahadur Road, RS Puram', pin: '641002', district: 'Coimbatore', cid: constIds[1], access: 'Wheelchair Ramp, Volunteer Escort, Accessible Restroom', avail: 'Drinking Water, Covered Courtyard, First Aid Kit', lat: 11.0086, lng: 76.9498 },
      { code: 'PS-DEMO-104', name: 'Gandhipuram Civic Auditorium', address: '110 Cross Cut Road, Gandhipuram', pin: '641012', district: 'Coimbatore', cid: constIds[1], access: 'Elevator Access, Tactile Floor Guide, Wheelchair Available', avail: 'Drinking Water, Air-Ventilated Hall, Help Desk, Parking Bay', lat: 11.0168, lng: 76.9674 },
      { code: 'PS-DEMO-105', name: 'Anna Nagar Public Library Annex', address: '54 East Main Road, Anna Nagar', pin: '625020', district: 'Madurai', cid: constIds[2], access: 'Wheelchair Ramp, Wide Entry Doors, Braille Voter Guide', avail: 'Drinking Water, Shaded Seating, Help Desk', lat: 9.9252, lng: 78.1445 },
      { code: 'PS-DEMO-106', name: 'Tallakulam Municipal High School', address: '9 Alagar Kovil Road, Tallakulam', pin: '625002', district: 'Madurai', cid: constIds[2], access: 'Wheelchair Ramp, Ground Floor Booth, Hearing Loop Desk', avail: 'Drinking Water, Waiting Canopy, First Aid Station', lat: 9.9369, lng: 78.1332 },
      { code: 'PS-DEMO-107', name: 'Jayanagar Civic Learning Centre', address: '4th Block, 11th Main, Jayanagar', pin: '560011', district: 'Bengaluru Urban', cid: constIds[3], access: 'Wheelchair Ramp, Tactile Path, Accessible Restroom, Priority Queue', avail: 'Drinking Water, Covered Waiting Area, Help Desk, Solar Backup', lat: 12.9279, lng: 77.5831 },
      { code: 'PS-DEMO-108', name: 'Koramangala Polytechnic Hall', address: '80 Feet Road, 4th Block, Koramangala', pin: '560034', district: 'Bengaluru Urban', cid: constIds[3], access: 'Step-Free Entrance, Wheelchair Assistance, Braille Signage', avail: 'Drinking Water, Seating Benches, First Aid Kit, Help Desk', lat: 12.9352, lng: 77.6245 },
      { code: 'PS-DEMO-109', name: 'Chanakyapuri Civic Academy', address: '18 Diplomatic Enclave Marg, Chanakyapuri', pin: '110021', district: 'New Delhi', cid: constIds[4], access: 'Wheelchair Ramp, Tactile Flooring, Accessible Restroom', avail: 'Drinking Water, Shaded Pavilion, Help Desk, Medical Corner', lat: 28.5975, lng: 77.1856 },
      { code: 'PS-DEMO-110', name: 'Connaught Place Municipal Centre', address: 'Block M, Outer Circle, Connaught Place', pin: '110001', district: 'New Delhi', cid: constIds[4], access: 'Step-Free Ramp, Elevator, Sign Language Desk', avail: 'Drinking Water, Waiting Lounge, Help Desk, Backup Power', lat: 28.6315, lng: 77.2167 },
    ];
    const insertStation = db.prepare(
      'INSERT INTO polling_stations (station_code, name, address, pin_code, district, constituency_id, accessibility_facilities, available_facilities, latitude, longitude, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const stationIds: number[] = [];
    for (const s of stations) {
      const r = insertStation.run(
        s.code,
        s.name,
        s.address,
        s.pin,
        s.district,
        s.cid,
        s.access,
        s.avail,
        s.lat,
        s.lng,
        '/src/assets/images/polling_station_facade_1795605888794.jpg'
      );
      stationIds.push(Number(r.lastInsertRowid));
    }

    // 4. Users: 10 Voters + 5 Officers + 2 Admins + 1 Super Admin = 18 users
    const insertUser = db.prepare(
      'INSERT INTO users (full_name, email, mobile, password_hash, role, state, district, constituency, language_pref, is_active, permissions_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    const voterUsersData = [
      { name: 'Ananya Krishnan', email: 'voter1@demo.edu', mobile: '9000010001', state: 'Tamil Nadu', district: 'Chennai', constituency: 'Chennai Central Demo', dob: '1994-05-14', gender: 'Female', address: '22 Luz Church Road, Mylapore, Chennai', pin: '600004', ps: stationIds[0], vstatus: 'Demo Verified' },
      { name: 'Karthik Subramanian', email: 'voter2@demo.edu', mobile: '9000010002', state: 'Tamil Nadu', district: 'Chennai', constituency: 'Chennai Central Demo', dob: '1989-11-02', gender: 'Male', address: '15 Halls Road, Egmore, Chennai', pin: '600008', ps: stationIds[1], vstatus: 'Pending' },
      { name: 'Meenakshi Sundaram', email: 'voter3@demo.edu', mobile: '9000010003', state: 'Tamil Nadu', district: 'Coimbatore', constituency: 'Coimbatore North Demo', dob: '1991-03-21', gender: 'Female', address: '48 Cowley Brown Road, RS Puram, Coimbatore', pin: '641002', ps: stationIds[2], vstatus: 'Demo Verified' },
      { name: 'Aravind Rajagopal', email: 'voter4@demo.edu', mobile: '9000010004', state: 'Tamil Nadu', district: 'Coimbatore', constituency: 'Coimbatore North Demo', dob: '1985-08-19', gender: 'Male', address: '109 Sathy Road, Gandhipuram, Coimbatore', pin: '641012', ps: stationIds[3], vstatus: 'Manual Review Required' },
      { name: 'Divya Bharathi', email: 'voter5@demo.edu', mobile: '9000010005', state: 'Tamil Nadu', district: 'Madurai', constituency: 'Madurai East Demo', dob: '1997-01-09', gender: 'Female', address: '31 Kuruvikaran Salai, Anna Nagar, Madurai', pin: '625020', ps: stationIds[4], vstatus: 'Demo Verified' },
      { name: 'Praveen Kumar', email: 'voter6@demo.edu', mobile: '9000010006', state: 'Tamil Nadu', district: 'Madurai', constituency: 'Madurai East Demo', dob: '1992-07-28', gender: 'Male', address: '7 Gokhale Road, Tallakulam, Madurai', pin: '625002', ps: stationIds[5], vstatus: 'Pending' },
      { name: 'SnehaDeshmukh', email: 'voter7@demo.edu', mobile: '9000010007', state: 'Karnataka', district: 'Bengaluru Urban', constituency: 'Bengaluru South Demo', dob: '1995-12-03', gender: 'Female', address: '88 9th Main Road, Jayanagar, Bengaluru', pin: '560011', ps: stationIds[6], vstatus: 'Demo Verified' },
      { name: 'Rohan Kulkarni', email: 'voter8@demo.edu', mobile: '9000010008', state: 'Karnataka', district: 'Bengaluru Urban', constituency: 'Bengaluru South Demo', dob: '1988-04-17', gender: 'Male', address: '12 1st Cross, Koramangala, Bengaluru', pin: '560034', ps: stationIds[7], vstatus: 'Pending' },
      { name: 'Neha Sharma', email: 'voter9@demo.edu', mobile: '9000010009', state: 'Delhi', district: 'New Delhi', constituency: 'New Delhi Civic Demo', dob: '1993-09-25', gender: 'Female', address: '45 Satya Marg, Chanakyapuri, New Delhi', pin: '110021', ps: stationIds[8], vstatus: 'Demo Verified' },
      { name: 'Vikram Malhotra', email: 'voter10@demo.edu', mobile: '9000010010', state: 'Delhi', district: 'New Delhi', constituency: 'New Delhi Civic Demo', dob: '1984-06-11', gender: 'Male', address: '19 Barakhamba Lane, Connaught Place, New Delhi', pin: '110001', ps: stationIds[9], vstatus: 'Manual Review Required' },
    ];

    const voterIds: number[] = [];
    const insertProfile = db.prepare(
      'INSERT INTO voter_profiles (user_id, demo_ref_number, date_of_birth, gender, address, pin_code, polling_station_id, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    voterUsersData.forEach((v, idx) => {
      const displayName = v.name === 'SnehaDeshmukh' ? 'Sneha Deshmukh' : v.name;
      const r = insertUser.run(displayName, v.email, v.mobile, demoPassHash, 'voter', v.state, v.district, v.constituency, 'en', 1, JSON.stringify({ portal: true }));
      const uid = Number(r.lastInsertRowid);
      voterIds.push(uid);
      const refNum = `DEMO-VTR-2026-${String(idx + 1).padStart(4, '0')}`;
      insertProfile.run(uid, refNum, v.dob, v.gender, v.address, v.pin, v.ps, v.vstatus);
    });

    const officersData = [
      { name: 'Rajeshwari Natarajan', email: 'officer1@demo.edu', mobile: '9100020001', state: 'Tamil Nadu', district: 'Chennai', constituency: 'Chennai Central Demo', code: 'OFF-DEMO-01', designation: 'Electoral Registration Officer (Demo)' },
      { name: 'Senthil Murugan', email: 'officer2@demo.edu', mobile: '9100020002', state: 'Tamil Nadu', district: 'Coimbatore', constituency: 'Coimbatore North Demo', code: 'OFF-DEMO-02', designation: 'Assistant Electoral Officer (Demo)' },
      { name: 'Lakshmi Narayanan', email: 'officer3@demo.edu', mobile: '9100020003', state: 'Tamil Nadu', district: 'Madurai', constituency: 'Madurai East Demo', code: 'OFF-DEMO-03', designation: 'Verification & Grievance Officer (Demo)' },
      { name: 'Siddharth Rao', email: 'officer4@demo.edu', mobile: '9100020004', state: 'Karnataka', district: 'Bengaluru Urban', constituency: 'Bengaluru South Demo', code: 'OFF-DEMO-04', designation: 'Electoral Registration Officer (Demo)' },
      { name: 'Pooja Verma', email: 'officer5@demo.edu', mobile: '9100020005', state: 'Delhi', district: 'New Delhi', constituency: 'New Delhi Civic Demo', code: 'OFF-DEMO-05', designation: 'Assistant Electoral Officer (Demo)' },
    ];
    const officerUserIds: number[] = [];
    const insertOfficer = db.prepare(
      'INSERT INTO officers (user_id, officer_code, assigned_district, assigned_constituency, designation, is_available) VALUES (?, ?, ?, ?, ?, 1)'
    );
    for (const o of officersData) {
      const r = insertUser.run(o.name, o.email, o.mobile, demoPassHash, 'officer', o.state, o.district, o.constituency, 'en', 1, JSON.stringify({ review_applications: true, manage_complaints: true, manual_verification: true }));
      const uid = Number(r.lastInsertRowid);
      officerUserIds.push(uid);
      insertOfficer.run(uid, o.code, o.district, o.constituency, o.designation);
    }

    const adminsData = [
      { name: 'Dr. Kavitha Venkat', email: 'admin1@demo.edu', mobile: '9200030001', state: 'Tamil Nadu', district: 'Chennai', constituency: 'Chennai Central Demo' },
      { name: 'Mahesh Chandra', email: 'admin2@demo.edu', mobile: '9200030002', state: 'Delhi', district: 'New Delhi', constituency: 'New Delhi Civic Demo' },
    ];
    const adminUserIds: number[] = [];
    for (const a of adminsData) {
      const r = insertUser.run(a.name, a.email, a.mobile, demoPassHash, 'admin', a.state, a.district, a.constituency, 'en', 1, JSON.stringify({ manage_candidates: true, manage_parties: true, manage_stations: true, view_reports: true, security_monitoring: true }));
      adminUserIds.push(Number(r.lastInsertRowid));
    }

    const superRes = insertUser.run(
      'Sakthipriya G',
      'superadmin@demo.edu',
      '9300040001',
      demoPassHash,
      'super_admin',
      'Delhi',
      'New Delhi',
      'New Delhi Civic Demo',
      'en',
      1,
      JSON.stringify({ full_system_control: true, manage_admins: true, manage_modules: true, audit_access: true })
    );
    const superAdminId = Number(superRes.lastInsertRowid);

    // 5. Candidates (10)
    const p1 = '/src/assets/images/candidate_portrait_1_1795605887697.jpg';
    const p2 = '/src/assets/images/candidate_portrait_2_1795605887721.jpg';
    const p3 = '/src/assets/images/candidate_portrait_3_1795605888220.jpg';
    const candidatesData = [
      { name: 'Priya Balasubramanian', photo: p1, pid: partyIds[0], cid: constIds[0], edu: 'M.P.A., University of Madras', exp: '11 years in municipal urban planning and public library committees', manifesto: 'Expand neighborhood drainage upgrades, solar-lit walkways, and ward-level citizen service kiosks.', decl: 'https://demo-declarations.example.edu/cand-01', age: 39 },
      { name: 'Raghavan Sundar', photo: p2, pid: partyIds[1], cid: constIds[0], edu: 'M.A. Economics, Loyola College', exp: '14 years as community health trust coordinator and school board member', manifesto: 'Establish 24-hour primary clinics in every ward and digitize public school science labs.', decl: 'https://demo-declarations.example.edu/cand-02', age: 44 },
      { name: 'Padma Venkataraman', photo: p3, pid: partyIds[2], cid: constIds[1], edu: 'M.Com., Bharathiar University', exp: '18 years advising small textile cooperatives and local trade chambers', manifesto: 'Streamline micro-enterprise credit desks and modernize suburban bus terminals.', decl: 'https://demo-declarations.example.edu/cand-03', age: 54 },
      { name: 'Suresh Natarajan', photo: p2, pid: partyIds[3], cid: constIds[1], edu: 'B.E. Civil Engineering, PSG Tech', exp: '12 years in watershed restoration and sustainable building audits', manifesto: 'Restore five urban lakes, expand shaded cycling lanes, and mandate ward composting.', decl: 'https://demo-declarations.example.edu/cand-04', age: 41 },
      { name: 'Kalyani Thirumalai', photo: p1, pid: partyIds[4], cid: constIds[2], edu: 'LL.B., Madurai Kamaraj University', exp: '10 years in legal aid clinics and accessibility advocacy forums', manifesto: 'Audit all municipal buildings for barrier-free access and publish monthly civic spend ledgers.', decl: 'https://demo-declarations.example.edu/cand-05', age: 37 },
      { name: 'Gopalakrishnan V.', photo: p2, pid: partyIds[0], cid: constIds[2], edu: 'M.Sc. Public Policy, Anna University', exp: '15 years in agricultural market logistics and rural road boards', manifesto: 'Upgrade cold-storage hubs near markets and improve inter-town commuter rail frequency.', decl: 'https://demo-declarations.example.edu/cand-06', age: 47 },
      { name: 'Nandini Hegde', photo: p1, pid: partyIds[3], cid: constIds[3], edu: 'M.Tech Environmental Engg, RVCE', exp: '9 years in urban stormwater engineering and civic greening drives', manifesto: 'Zero-flooding stormwater corridors, 50,000 native avenue trees, and electric feeder buses.', decl: 'https://demo-declarations.example.edu/cand-07', age: 36 },
      { name: 'Prashanth Gowda', photo: p2, pid: partyIds[2], cid: constIds[3], edu: 'MBA, Bengaluru University', exp: '13 years managing civic technology incubators and youth skill centers', manifesto: 'Neighborhood coworking hubs, transparent tender tracking, and safer pedestrian crossings.', decl: 'https://demo-declarations.example.edu/cand-08', age: 43 },
      { name: 'Vasundhara Kapoor', photo: p3, pid: partyIds[1], cid: constIds[4], edu: 'Ph.D. Sociology, Delhi University', exp: '20 years in senior welfare boards and municipal education panels', manifesto: 'Expand geriatric day-care centers, community reading rooms, and clean air monitoring.', decl: 'https://demo-declarations.example.edu/cand-09', age: 56 },
      { name: 'Aditya Deshpande', photo: p2, pid: partyIds[4], cid: constIds[4], edu: 'M.A. Political Science, JNU', exp: '11 years in civic budget research and resident welfare associations', manifesto: 'Standardize grievance SLAs to 7 days and introduce accessible digital public notice boards.', decl: 'https://demo-declarations.example.edu/cand-10', age: 40 },
    ];
    const insertCand = db.prepare(
      'INSERT INTO candidates (name, photo_url, party_id, constituency_id, education, experience, manifesto, declaration_url, is_published, age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)'
    );
    for (const c of candidatesData) {
      insertCand.run(c.name, c.photo, c.pid, c.cid, c.edu, c.exp, c.manifesto, c.decl, c.age);
    }

    // 6. Applications (15) + Application History
    const appCategories = [
      'New Registration Demonstration',
      'Profile Correction',
      'Address Update',
      'Accessibility Assistance',
      'Document Assistance',
    ];
    const appStatuses = ['Submitted', 'Under Review', 'Action Required', 'Approved', 'Rejected', 'Completed'];
    const insertApp = db.prepare(
      'INSERT INTO applications (reference_number, user_id, assigned_officer_id, applicant_name, category, email, district, constituency, description, document_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertAppHist = db.prepare(
      'INSERT INTO application_history (application_id, status, changed_by_user_id, changed_by_name, remarks, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (let i = 0; i < 15; i++) {
      const voterIdx = i % voterIds.length;
      const v = voterUsersData[voterIdx];
      const displayName = v.name === 'SnehaDeshmukh' ? 'Sneha Deshmukh' : v.name;
      const uid = voterIds[voterIdx];
      const offIdx = Math.floor(voterIdx / 2) % officerUserIds.length;
      const offId = officerUserIds[offIdx];
      const offName = officersData[offIdx].name;
      const cat = appCategories[i % appCategories.length];
      const status = appStatuses[i % appStatuses.length];
      const ref = `APP-DEMO-2026-${String(1001 + i)}`;
      const dayOffset = 15 - i;
      const createdTs = new Date(Date.now() - dayOffset * 86400000).toISOString();
      const updatedTs = new Date(Date.now() - Math.max(0, dayOffset - 1) * 86400000).toISOString();

      const res = insertApp.run(
        ref,
        uid,
        offId,
        displayName,
        cat,
        v.email,
        v.district,
        v.constituency,
        `Demonstration request for ${cat.toLowerCase()} in ${v.constituency}. Supporting fictional reference attached for review.`,
        `demo_supporting_doc_${i + 1}.pdf`,
        status,
        createdTs,
        updatedTs
      );
      const appId = Number(res.lastInsertRowid);
      insertAppHist.run(appId, 'Submitted', uid, displayName, 'Application submitted through Smart Election Portal demonstration form.', createdTs);
      if (status !== 'Submitted') {
        insertAppHist.run(appId, 'Under Review', offId, offName, 'Assigned to constituency officer for initial verification.', updatedTs);
      }
      if (status === 'Action Required' || status === 'Approved' || status === 'Rejected' || status === 'Completed') {
        const remarkMap: Record<string, string> = {
          'Action Required': 'Please confirm updated residential PIN code in the demonstration profile.',
          Approved: 'All demonstration details verified against fictional constituency roll.',
          Rejected: 'Duplicate demonstration request detected; please refer to your active approved record.',
          Completed: 'Record updated and demonstration profile notice issued.',
        };
        insertAppHist.run(appId, status, offId, offName, remarkMap[status], updatedTs);
      }
    }

    // 7. Complaints (10) + Complaint History
    const compCategories = [
      'Application Issue',
      'Polling Information',
      'Accessibility Issue',
      'Portal Technical Issue',
      'General Enquiry',
    ];
    const compStatuses = ['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
    const insertComp = db.prepare(
      'INSERT INTO complaints (reference_number, user_id, assigned_officer_id, category, subject, description, attachment_name, status, officer_response, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertCompHist = db.prepare(
      'INSERT INTO complaint_history (complaint_id, status, changed_by_user_id, changed_by_name, remarks, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (let i = 0; i < 10; i++) {
      const uid = voterIds[i];
      const v = voterUsersData[i];
      const displayName = v.name === 'SnehaDeshmukh' ? 'Sneha Deshmukh' : v.name;
      const offIdx = Math.floor(i / 2) % officerUserIds.length;
      const offId = officerUserIds[offIdx];
      const offName = officersData[offIdx].name;
      const cat = compCategories[i % compCategories.length];
      const status = compStatuses[i % compStatuses.length];
      const ref = `CMP-DEMO-2026-${String(2001 + i)}`;
      const createdTs = new Date(Date.now() - (12 - i) * 86400000).toISOString();
      const updatedTs = new Date(Date.now() - (10 - Math.min(9, i)) * 86400000).toISOString();
      const response = status === 'Resolved' || status === 'Closed'
        ? 'Demonstration issue verified and updated in the constituency register.'
        : status === 'In Progress'
        ? 'Officer is currently coordinating with the polling station accessibility desk.'
        : '';

      const res = insertComp.run(
        ref,
        uid,
        offId,
        cat,
        `${cat} enquiry — ${v.constituency}`,
        `Demonstration grievance regarding ${cat.toLowerCase()} for station coverage in ${v.district}.`,
        `demo_attachment_${i + 1}.png`,
        status,
        response,
        createdTs,
        updatedTs
      );
      const compId = Number(res.lastInsertRowid);
      insertCompHist.run(compId, 'Submitted', uid, displayName, 'Grievance registered in demonstration portal.', createdTs);
      if (status !== 'Submitted') {
        insertCompHist.run(compId, status, offId, offName, response || 'Assigned to constituency grievance officer.', updatedTs);
      }
    }

    // 8. Notifications (20)
    const insertNotif = db.prepare(
      'INSERT INTO notifications (user_id, event_type, title, message, related_ref, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const notifTemplates = [
      { type: 'Application submitted', title: 'Application Received', msg: 'Your demonstration application has been registered in the queue.' },
      { type: 'Application status changed', title: 'Application Status Updated', msg: 'An election officer reviewed your demonstration application.' },
      { type: 'Additional information requested', title: 'Action Required on Application', msg: 'Please review officer remarks and update your demonstration details.' },
      { type: 'Complaint submitted', title: 'Grievance Logged', msg: 'Your grievance reference has been assigned for review.' },
      { type: 'Complaint resolved', title: 'Grievance Resolved', msg: 'Your demonstration grievance has been resolved by the constituency officer.' },
      { type: 'Demo verification completed', title: 'Simulated Verification Recorded', msg: 'Your simulated verification status has been updated in your profile.' },
      { type: 'Security review updated', title: 'Security Case Update', msg: 'A security monitoring review entry was updated by an officer.' },
    ];
    for (let i = 0; i < 20; i++) {
      const targetUser = i < 14 ? voterIds[i % voterIds.length] : officerUserIds[i % officerUserIds.length];
      const tpl = notifTemplates[i % notifTemplates.length];
      const ts = new Date(Date.now() - (20 - i) * 3600000 * 6).toISOString();
      insertNotif.run(
        targetUser,
        tpl.type,
        tpl.title,
        tpl.msg,
        i % 2 === 0 ? `APP-DEMO-2026-${1001 + (i % 15)}` : `CMP-DEMO-2026-${2001 + (i % 10)}`,
        i % 3 === 0 ? 1 : 0,
        ts
      );
    }

    // 9. Security Events (10) + Duplicate Flags + Review Cases
    const secTypes = [
      'Repeated Failed Login',
      'Duplicate Demo Registration',
      'Repeated Application Submission',
      'Invalid Demo Token',
      'Unauthorised Admin Access Attempt',
    ];
    const secStatuses = ['Flagged', 'Under Review', 'Cleared', 'Escalated'];
    const insertSec = db.prepare(
      'INSERT INTO security_events (event_type, user_id, actor_email, description, ip_address, status, assigned_officer_id, officer_remarks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (let i = 0; i < 10; i++) {
      const stype = secTypes[i % secTypes.length];
      const sstatus = secStatuses[i % secStatuses.length];
      const offId = officerUserIds[i % officerUserIds.length];
      const ts = new Date(Date.now() - (10 - i) * 7200000 * 5).toISOString();
      insertSec.run(
        stype,
        voterIds[i % voterIds.length],
        voterUsersData[i % voterUsersData.length].email,
        `Demonstration security alert: ${stype} simulated or detected during portal audit #${i + 1}.`,
        `192.0.2.${10 + i}`,
        sstatus,
        offId,
        sstatus === 'Cleared' ? 'Verified as benign test activity during demonstration.' : sstatus === 'Escalated' ? 'Escalated to administrator review queue.' : '',
        ts,
        ts
      );
    }

    const insertDup = db.prepare(
      'INSERT INTO duplicate_flags (flag_type, entity_type, entity_ref, user_id, details, severity, status, reviewed_by, review_decision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertDup.run('Duplicate Demo Reference', 'voter_profile', 'DEMO-VTR-2026-0004', voterIds[3], 'Address overlap flagged for routine officer verification.', 'Medium', 'Under Review', officerUserIds[1], 'Pending address proof inspection');
    insertDup.run('Repeated Application Submission', 'application', 'APP-DEMO-2026-1005', voterIds[4], 'Two submissions recorded within 24 hours for Profile Correction.', 'Low', 'Cleared', officerUserIds[2], 'Confirmed single active record retained.');
    insertDup.run('Duplicate Demo Registration', 'user', 'voter8@demo.edu', voterIds[7], 'Attempted secondary test account registration with matching phone.', 'High', 'Flagged', null, '');

    // 10. Elections & Announcements (6)
    const insertElection = db.prepare(
      'INSERT INTO elections (title, election_type, phase, event_date, constituency, status, description, is_announcement) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertElection.run('General Municipal Civic Roll Revision (Demo)', 'Roll Revision', 'Phase I', '2026-12-10', 'All Demo Constituencies', 'Ongoing', 'Fictional electoral roll revision window for address updates and accessibility registrations.', 1);
    insertElection.run('Draft Demonstration Roll Publication', 'Notice', 'Phase I', '2026-12-18', 'Chennai Central Demo', 'Upcoming', 'Publication of consolidated fictional demonstration roll for public verification.', 1);
    insertElection.run('Polling Station Accessibility Audit Day', 'Inspection', 'Pre-Poll', '2027-01-05', 'All Demo Constituencies', 'Scheduled', 'Facility verification for wheelchair ramps, tactile guides, and priority lanes.', 0);
    insertElection.run('Candidate Declaration Archive Freeze', 'Candidate Filing', 'Phase II', '2027-01-14', 'Coimbatore North Demo', 'Scheduled', 'Closing date for fictional candidate profile declarations in the directory.', 1);
    insertElection.run('Mock Civic Awareness Camp', 'Civic Outreach', 'Outreach', '2027-01-22', 'Bengaluru South Demo', 'Scheduled', 'Educational demonstration on voter services, QR token verification, and grievance tracking.', 0);
    insertElection.run('Simulated Election Readiness Briefing', 'Demonstration', 'Phase III', '2027-02-02', 'New Delhi Civic Demo', 'Upcoming', 'Administrative demonstration briefing for election officers and station coordinators.', 0);

    // 11. Verification Records & Consent Records
    const insertConsent = db.prepare(
      'INSERT INTO consent_records (user_id, consent_type, consent_version, accepted) VALUES (?, ?, ?, 1)'
    );
    const insertVerif = db.prepare(
      'INSERT INTO verification_records (verification_ref, user_id, demo_profile_name, demo_profile_code, result, confidence_note, manual_review_requested, manual_review_status, reviewed_by_name, review_remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertConsent.run(voterIds[0], 'Simulated Face Verification Demo', 'v1.0');
    insertVerif.run('VRF-DEMO-9001', voterIds[0], 'Fictional Demo Profile A (Chennai)', 'SIM-PROF-01', 'Demo Verified', 'Simulated profile check succeeded without collecting biometrics.', 0, 'None', '', '');
    insertConsent.run(voterIds[3], 'Simulated Face Verification Demo', 'v1.0');
    insertVerif.run('VRF-DEMO-9002', voterIds[3], 'Fictional Demo Profile B (Coimbatore)', 'SIM-PROF-02', 'Manual Review Required', 'Simulated mismatch threshold triggered manual officer review workflow.', 1, 'Pending', '', '');

    db.prepare(
      'INSERT INTO review_cases (case_ref, case_type, target_id, target_ref, assigned_officer_id, status, decision, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('CASE-DEMO-301', 'Manual Verification', 2, 'VRF-DEMO-9002', officerUserIds[1], 'Open', '', 'Awaiting constituency officer confirmation');

    // 12. QR Tokens
    const futureExp = new Date(Date.now() + 86400000).toISOString();
    const pastExp = new Date(Date.now() - 3600000).toISOString();
    db.prepare(
      'INSERT INTO qr_tokens (token_code, user_id, demo_ref_number, expires_at, is_used, verification_attempts) VALUES (?, ?, ?, ?, 0, 0)'
    ).run('DEMO-QR-2026-VALID1', voterIds[0], 'DEMO-VTR-2026-0001', futureExp);
    db.prepare(
      'INSERT INTO qr_tokens (token_code, user_id, demo_ref_number, expires_at, is_used, used_at, verification_attempts) VALUES (?, ?, ?, ?, 1, ?, 1)'
    ).run('DEMO-QR-2026-USED02', voterIds[2], 'DEMO-VTR-2026-0003', futureExp, new Date(Date.now() - 1800000).toISOString());
    db.prepare(
      'INSERT INTO qr_tokens (token_code, user_id, demo_ref_number, expires_at, is_used, verification_attempts) VALUES (?, ?, ?, ?, 0, 0)'
    ).run('DEMO-QR-2026-EXP003', voterIds[4], 'DEMO-VTR-2026-0005', pastExp);

    // 13. Audit Logs
    const insertAudit = db.prepare(
      'INSERT INTO audit_logs (actor_user_id, actor_email, actor_role, action, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertAudit.run(superAdminId, 'superadmin@demo.edu', 'super_admin', 'SYSTEM_INITIALIZED', 'system', 'bootstrap', 'Initial demonstration dataset seeded for Smart Election Portal.');
    insertAudit.run(adminUserIds[0], 'admin1@demo.edu', 'admin', 'CANDIDATES_PUBLISHED', 'candidates', 'all', 'Published 10 fictional candidate profiles across 5 constituencies.');
    insertAudit.run(officerUserIds[0], 'officer1@demo.edu', 'officer', 'APPLICATION_REVIEWED', 'application', 'APP-DEMO-2026-1004', 'Approved demonstration application after roll check.');

    // 14. System Settings
    const insertSetting = db.prepare(
      'INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)'
    );
    insertSetting.run('portal_name', 'Smart Election Portal', 'Public portal display title');
    insertSetting.run('demo_mode_banner', 'enabled', 'Display educational demonstration disclaimer banner across portal');
    insertSetting.run('module_face_verification_demo', 'enabled', 'Enable simulated face verification demonstration module');
    insertSetting.run('module_qr_verification', 'enabled', 'Enable demonstration QR token generator and validator');
    insertSetting.run('module_pollbot', 'enabled', 'Enable PollBot civic FAQ and AI assistant');
    insertSetting.run('max_failed_login_threshold', '3', 'Failed logins before raising security monitoring alert');
    insertSetting.run('qr_token_ttl_minutes', '15', 'Expiry duration in minutes for newly generated demo QR tokens');
  });

  seedTx();
}

function syncPortalUpdates(): void {
  const tx = db.transaction(() => {
    // Ensure Super Admin display name is Sakthipriya G
    db.prepare("UPDATE users SET full_name = 'Sakthipriya G' WHERE email = 'superadmin@demo.edu' OR role = 'super_admin'").run();

    // Backfill polling_area, booth_number, and location_type for legacy PS-DEMO entries
    const legacyMeta: Record<string, { area: string; booth: string; type: string }> = {
      'PS-DEMO-101': { area: 'Teynampet & Anna Salai', booth: 'Booth 01 – Main Wing', type: 'School' },
      'PS-DEMO-102': { area: 'Egmore Pantheon Road', booth: 'Booth 02 – Ground Hall', type: 'Community Hall' },
      'PS-DEMO-103': { area: 'RS Puram Diwan Bahadur Road', booth: 'Booth 01 – West Classroom', type: 'School' },
      'PS-DEMO-104': { area: 'Gandhipuram Cross Cut', booth: 'Booth 02 – Civic Wing', type: 'Civic Centre' },
      'PS-DEMO-105': { area: 'Madurai Anna Nagar East', booth: 'Booth 01 – Reading Hall', type: 'Public Library' },
      'PS-DEMO-106': { area: 'Tallakulam Alagar Kovil Road', booth: 'Booth 02 – Block A', type: 'School' },
      'PS-DEMO-107': { area: 'Jayanagar 4th Block', booth: 'Booth 01 – Ground Wing', type: 'Civic Centre' },
      'PS-DEMO-108': { area: 'Koramangala 4th Block', booth: 'Booth 02 – Polytechnic Hall', type: 'College' },
      'PS-DEMO-109': { area: 'Chanakyapuri Enclave', booth: 'Booth 01 – Main Block', type: 'Civic Centre' },
      'PS-DEMO-110': { area: 'Connaught Place Outer Circle', booth: 'Booth 02 – Ground Hall', type: 'Civic Centre' },
    };
    const updateLegacyStmt = db.prepare(
      "UPDATE polling_stations SET polling_area = ?, booth_number = ?, location_type = ? WHERE station_code = ? AND (polling_area = '' OR booth_number = '')"
    );
    for (const [code, meta] of Object.entries(legacyMeta)) {
      updateLegacyStmt.run(meta.area, meta.booth, meta.type, code);
    }

    // Upsert Complete Tamil Nadu District -> Constituency -> Polling Area -> Booth dataset
    const { constituencies, booths } = buildTamilNaduDataset();
    const insertConst = db.prepare(
      'INSERT OR IGNORE INTO constituencies (name, code, district, state, registered_demo_voters) VALUES (?, ?, ?, ?, ?)'
    );
    for (const c of constituencies) {
      insertConst.run(c.name, c.code, c.district, c.state, c.registered_demo_voters);
    }

    const constRows = db.prepare('SELECT id, name FROM constituencies').all() as Array<{ id: number; name: string }>;
    const constMap = new Map(constRows.map((c) => [c.name, c.id]));

    const insertBooth = db.prepare(
      `INSERT OR IGNORE INTO polling_stations
       (station_code, name, address, pin_code, district, constituency_id, polling_area, booth_number, location_type, accessibility_facilities, available_facilities, latitude, longitude, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const b of booths) {
      const cid = constMap.get(b.constituency_name);
      if (!cid) continue;
      insertBooth.run(
        b.station_code,
        b.name,
        b.address,
        b.pin_code,
        b.district,
        cid,
        b.polling_area,
        b.booth_number,
        b.location_type,
        b.accessibility_facilities,
        b.available_facilities,
        b.latitude,
        b.longitude,
        '/src/assets/images/polling_station_facade_1795605888794.jpg'
      );
    }

    const auditCount = (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as { c: number }).c;
    if (auditCount <= 4) {
      const superAdmin = db.prepare("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1").get() as
        | { id: number }
        | undefined;
      const admin1 = db.prepare("SELECT id FROM users WHERE email = 'admin1@demo.edu' LIMIT 1").get() as
        | { id: number }
        | undefined;
      const officer1 = db.prepare("SELECT id FROM users WHERE email = 'officer1@demo.edu' LIMIT 1").get() as
        | { id: number }
        | undefined;

      const insAudit = db.prepare(
        'INSERT INTO audit_logs (actor_user_id, actor_email, actor_role, action, resource_type, resource_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const now = Date.now();
      const samples: Array<[number | null, string, string, string, string, string, string, number]> = [
        [superAdmin?.id ?? null, 'superadmin@demo.edu', 'super_admin', 'SYSTEM_SETTINGS_UPDATED', 'system_settings', 'config', 'Modified settings: qr_token_ttl_minutes: "10" -> "15"; max_failed_login_threshold: "5" -> "3"', 18],
        [admin1?.id ?? null, 'admin1@demo.edu', 'admin', 'POLLING_STATION_UPDATED', 'polling_station', 'TN-CHE-012-01', 'Updated Govt. Boys Higher Secondary School, Perambur (Chennai) — fields: accessibility, facilities', 14],
        [superAdmin?.id ?? null, 'superadmin@demo.edu', 'super_admin', 'USER_ROLE_CHANGED', 'user', '12', 'Changed role for officer2@demo.edu from "voter" to "officer"', 10],
        [admin1?.id ?? null, 'admin1@demo.edu', 'admin', 'POLLING_STATION_CREATED', 'polling_station', 'TN-CHE-027-02', 'Added Sathyabama Civic Engineering Auditorium (Sholinganallur, Chennai)', 7],
        [officer1?.id ?? null, 'officer1@demo.edu', 'officer', 'SECURITY_EVENT_UPDATED', 'security_event', '1', 'Status -> Under Review (Verified IP audit trail)', 4],
        [superAdmin?.id ?? null, 'superadmin@demo.edu', 'super_admin', 'SYSTEM_SETTINGS_UPDATED', 'system_settings', 'config', 'Verified module_pollbot = "enabled" and demo_mode_banner = "enabled"', 2],
      ];
      for (const [uid, email, role, act, rtype, rid, det, hrsAgo] of samples) {
        insAudit.run(uid, email, role, act, rtype, rid, det, new Date(now - hrsAgo * 3600000).toISOString());
      }
    }

    // Ensure every constituency has a multi-party slate of demonstration candidates
    const allConsts = db
      .prepare('SELECT id, name, code, district, state FROM constituencies ORDER BY id ASC')
      .all() as Array<{ id: number; name: string; code: string; district: string; state: string }>;
    const allParties = db.prepare('SELECT id FROM political_parties ORDER BY id ASC').all() as Array<{ id: number }>;

    if (allParties.length > 0) {
      const photos = [
        '/src/assets/images/candidate_portrait_1_1795605887697.jpg',
        '/src/assets/images/candidate_portrait_2_1795605887721.jpg',
        '/src/assets/images/candidate_portrait_3_1795605888220.jpg',
      ];
      const firstNames = [
        'Aravindhan', 'Kaviyarasu', 'Deepika', 'Manikandan', 'Soundarya', 'Vigneshwaran',
        'Nandhini', 'Sathishkumar', 'Pavithra', 'Karthikeyan', 'Aishwarya', 'Dineshkumar',
        'Revathi', 'Balasubramanian', 'Janani', 'Thirumavalavan', 'Subbulakshmi', 'Elangovan',
        'Meenambal', 'Prabhakaran', 'Tamilselvi', 'Saravanan', 'Gayathri', 'Muthukumar',
      ];
      const lastNames = [
        'S.', 'Natarajan', 'Sundaram', 'Ramasamy', 'Krishnamoorthy', 'Murugesan',
        'Venkatesan', 'Palanisamy', 'Subramanian', 'Perumal', 'Rajendran', 'Selvam',
        'Annadurai', 'Chidambaram', 'Arumugam', 'Dhandapani', 'Kandasamy', 'Shanmugam',
      ];
      const degrees = [
        'M.A. Public Administration, University of Madras',
        'B.E. Civil Engineering, Anna University',
        'M.Com., Bharathiar University',
        'LL.B., Tamil Nadu Dr. Ambedkar Law University',
        'M.Sc. Environmental Science, Bharathidasan University',
        'M.B.A. Rural Management, Madurai Kamaraj University',
        'B.Sc. Agriculture, TNAU Coimbatore',
        'M.A. Economics, Loyola College, Chennai',
        'Ph.D. Urban Studies, Periyar University, Salem',
        'M.Tech. Water Resources, NIT Tiruchirappalli',
      ];
      const expTemplates = [
        'years coordinating municipal water-body restoration and neighborhood civic committees',
        'years on district school infrastructure boards and public library modernization panels',
        'years advising cooperative societies, rural transit routes, and accessibility audits',
        'years managing primary healthcare outreach camps and youth skill development centers',
        'years in urban drainage planning, solar streetlight drives, and citizen grievance desks',
      ];
      const manifestoTemplates = [
        'Strengthen neighborhood primary health clinics, expand shaded pedestrian walkways, and upgrade government school science laboratories.',
        'Modernize municipal stormwater drainage, improve last-mile public bus connectivity, and digitize local civic service centers.',
        'Promote rainwater harvesting in every ward, support small artisan credit desks, and ensure barrier-free public buildings.',
        'Upgrade local market cold-storage facilities, restore community lakes, and publish transparent ward-level project trackers.',
        'Expand vocational skill centers for youth, improve street lighting safety corridors, and accelerate grievance resolution SLAs.',
      ];

      const featuredNames = new Set([
        'Perambur',
        'Sholinganallur',
        'Velachery',
        'Tambaram',
        'Avadi',
        'Coimbatore North',
        'Madurai East',
        'Salem North',
        'Tiruchirappalli East',
      ]);

      const countStmt = db.prepare('SELECT COUNT(*) as c FROM candidates WHERE constituency_id = ?');
      const insertCandStmt = db.prepare(
        'INSERT INTO candidates (name, photo_url, party_id, constituency_id, education, experience, manifesto, declaration_url, is_published, age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)'
      );

      allConsts.forEach((c, cIdx) => {
        const existingCount = (countStmt.get(c.id) as { c: number }).c;
        const targetCount = featuredNames.has(c.name) ? 3 : 2;
        for (let slot = existingCount; slot < targetCount; slot++) {
          const seed = cIdx * 7 + slot * 13;
          const fullName = `${firstNames[seed % firstNames.length]} ${lastNames[(seed * 3 + slot) % lastNames.length]}`;
          const photo = photos[(seed + slot) % photos.length];
          const partyId = allParties[(cIdx + slot) % allParties.length].id;
          const edu = degrees[(seed + slot * 2) % degrees.length];
          const yrs = 8 + ((seed + slot) % 14);
          const exp = `${yrs} ${expTemplates[(seed + slot) % expTemplates.length]} in ${c.district}`;
          const manifesto = `${c.name} (${c.district}) civic priority: ${manifestoTemplates[(seed + slot * 3) % manifestoTemplates.length]}`;
          const declUrl = `https://demo-declarations.example.edu/${c.code.toLowerCase()}-${slot + 1}`;
          const age = 34 + ((seed * 5) % 24);
          insertCandStmt.run(fullName, photo, partyId, c.id, edu, exp, manifesto, declUrl, age);
        }
      });
    }
  });

  tx();
}
