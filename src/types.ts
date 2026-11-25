export type UserRole = 'voter' | 'officer' | 'admin' | 'super_admin';
export type LanguageCode = 'en' | 'ta' | 'hi';

export interface User {
  id: number;
  full_name: string;
  email: string;
  mobile: string;
  role: UserRole;
  state: string;
  district: string;
  constituency: string;
  language_pref: LanguageCode;
  is_active: number;
  permissions_json?: string;
  created_at?: string;
}

export interface VoterProfile {
  id: number;
  user_id: number;
  demo_ref_number: string;
  date_of_birth: string;
  gender: string;
  address: string;
  pin_code: string;
  polling_station_id: number | null;
  verification_status: string;
  updated_at: string;
  full_name?: string;
  email?: string;
  mobile?: string;
  state?: string;
  district?: string;
  constituency?: string;
  station_code?: string;
  polling_station_name?: string;
  polling_station_address?: string;
  polling_station_pin?: string;
  accessibility_facilities?: string;
  available_facilities?: string;
  latitude?: number;
  longitude?: number;
}

export interface Constituency {
  id: number;
  name: string;
  code: string;
  district: string;
  state: string;
  registered_demo_voters: number;
}

export interface PoliticalParty {
  id: number;
  name: string;
  short_code: string;
  symbol_name: string;
  logo_url: string;
  color_hex: string;
  description: string;
  website: string;
  manifesto_summary: string;
  founded_year: number;
  candidates?: Array<{
    id: number;
    name: string;
    photo_url: string;
    constituency_name: string;
  }>;
}

export interface Candidate {
  id: number;
  name: string;
  photo_url: string;
  party_id: number;
  constituency_id: number;
  education: string;
  experience: string;
  manifesto: string;
  declaration_url: string;
  is_published: number;
  age: number;
  party_name?: string;
  party_code?: string;
  party_color?: string;
  party_logo?: string;
  party_symbol?: string;
  constituency_name?: string;
  constituency_district?: string;
  constituency_state?: string;
}

export interface PollingStation {
  id: number;
  station_code: string;
  name: string;
  address: string;
  pin_code: string;
  district: string;
  constituency_id: number;
  constituency_name?: string;
  state_name?: string;
  polling_area?: string;
  booth_number?: string;
  location_type?: string;
  accessibility_facilities: string;
  available_facilities: string;
  latitude: number;
  longitude: number;
  image_url: string;
}

export interface ApplicationRecord {
  id: number;
  reference_number: string;
  user_id: number;
  assigned_officer_id: number | null;
  assigned_officer_name?: string;
  applicant_name: string;
  category: string;
  email: string;
  district: string;
  constituency: string;
  description: string;
  document_name: string;
  status: 'Submitted' | 'Under Review' | 'Action Required' | 'Approved' | 'Rejected' | 'Completed';
  created_at: string;
  updated_at: string;
}

export interface HistoryEntry {
  id?: number;
  status: string;
  changed_by_name: string;
  remarks: string;
  created_at: string;
}

export interface ComplaintRecord {
  id: number;
  reference_number: string;
  user_id: number;
  assigned_officer_id: number | null;
  complainant_name?: string;
  complainant_email?: string;
  assigned_officer_name?: string;
  category: string;
  subject: string;
  description: string;
  attachment_name: string;
  status: 'Submitted' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  officer_response: string;
  created_at: string;
  updated_at: string;
}

export interface ElectionEvent {
  id: number;
  title: string;
  election_type: string;
  phase: string;
  event_date: string;
  constituency: string;
  status: string;
  description: string;
  is_announcement: number;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  event_type: string;
  title: string;
  message: string;
  related_ref: string;
  is_read: number;
  created_at: string;
}

export interface VerificationRecord {
  id: number;
  verification_ref: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  demo_profile_name: string;
  demo_profile_code: string;
  result: 'Demo Verified' | 'Verification Unsuccessful' | 'Manual Review Required';
  confidence_note: string;
  manual_review_requested: number;
  manual_review_status: string;
  reviewed_by_name: string;
  review_remarks: string;
  created_at: string;
}

export interface QrTokenRecord {
  id: number;
  token_code: string;
  user_id: number;
  demo_ref_number: string;
  expires_at: string;
  is_used: number;
  used_at: string | null;
  verification_attempts: number;
  created_at: string;
  qrDataUrl?: string;
}

export interface SecurityEvent {
  id: number;
  event_type: string;
  user_id: number | null;
  actor_email: string;
  description: string;
  ip_address: string;
  status: 'Flagged' | 'Under Review' | 'Cleared' | 'Escalated';
  assigned_officer_id: number | null;
  assigned_officer_name?: string;
  officer_remarks: string;
  created_at: string;
  updated_at: string;
}

export interface DuplicateFlag {
  id: number;
  flag_type: string;
  entity_type: string;
  entity_ref: string;
  user_id: number | null;
  user_name?: string;
  user_email?: string;
  details: string;
  severity: string;
  status: 'Flagged' | 'Under Review' | 'Cleared' | 'Escalated';
  review_decision: string;
  reviewer_name?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_user_id: number | null;
  actor_name?: string | null;
  actor_email: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  created_at: string;
}
