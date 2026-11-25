import { jsPDF } from 'jspdf';
import type { UserRole, VoterProfile } from '../types';

export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'XMLHttpRequest');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const errObj = data as { error?: string; message?: string };
    throw new Error(errObj?.error || errObj?.message || `Request failed (${res.status})`);
  }

  return data as T;
}

export function getDashboardRouteForRole(role: UserRole): string {
  switch (role) {
    case 'officer':
      return 'officer-dashboard';
    case 'admin':
      return 'admin-dashboard';
    case 'super_admin':
      return 'super-admin-dashboard';
    default:
      return 'voter-dashboard';
  }
}

export function downloadVoterProfilePdf(profile: VoterProfile): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Navy header band
  doc.setFillColor(15, 37, 68);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('SMART ELECTION PORTAL', 16, 15);
  doc.setFontSize(10);
  doc.text('Educational Demonstration — Digital Voter Profile Summary', 16, 23);

  // Explicit demonstration notice box
  doc.setFillColor(254, 243, 199);
  doc.rect(14, 38, 182, 14, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFontSize(11);
  doc.text('DEMONSTRATION DOCUMENT – NOT AN OFFICIAL VOTER ID', 105, 47, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text('Voter Profile Record (Fictional Demonstration Data)', 16, 64);
  doc.setDrawColor(203, 213, 225);
  doc.line(16, 67, 194, 67);

  const rows: Array<[string, string]> = [
    ['Demo Reference Number', profile.demo_ref_number || 'N/A'],
    ['Full Name', profile.full_name || 'N/A'],
    ['Email Address', profile.email || 'N/A'],
    ['Test Mobile Number', profile.mobile || 'N/A'],
    ['Date of Birth', profile.date_of_birth || 'N/A'],
    ['Gender', profile.gender || 'N/A'],
    ['Verification Status', profile.verification_status || 'Pending'],
    ['Constituency', profile.constituency || 'N/A'],
    ['District / State', `${profile.district || ''}, ${profile.state || ''}`],
    ['Demo Address', `${profile.address || ''} — ${profile.pin_code || ''}`],
    ['Assigned Polling Station', profile.polling_station_name || 'Not Assigned'],
    ['Station Code', profile.station_code || 'N/A'],
  ];

  let y = 78;
  doc.setFontSize(10);
  for (const [label, value] of rows) {
    doc.setTextColor(71, 85, 105);
    doc.text(label, 16, y);
    doc.setTextColor(15, 23, 42);
    doc.text(String(value).slice(0, 72), 78, y);
    doc.setDrawColor(241, 245, 249);
    doc.line(16, y + 3, 194, y + 3);
    y += 10;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Disclaimer: Independent educational demonstration project. Not affiliated with any government authority.',
    16,
    272
  );
  doc.text(`Generated on ${new Date().toISOString()}`, 16, 278);

  doc.save(`${profile.demo_ref_number || 'demo-voter-profile'}.pdf`);
}

export function downloadReportPdf(title: string, rows: Array<Record<string, unknown>>): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFillColor(15, 37, 68);
  doc.rect(0, 0, 297, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(`Smart Election Portal — ${title}`, 14, 15);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.text(`Fictional Educational Demonstration Report | Exported ${new Date().toLocaleString()}`, 14, 31);

  if (rows.length === 0) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text('No matching demonstration records found for this filter.', 14, 46);
    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    return;
  }

  const keys = Object.keys(rows[0]).slice(0, 7);
  const colWidth = Math.floor(268 / keys.length);
  let y = 42;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 5, 268, 8, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  keys.forEach((k, idx) => {
    doc.text(k.replace(/_/g, ' ').slice(0, 20), 16 + idx * colWidth, y);
  });

  y += 8;
  doc.setFontSize(8);
  for (const row of rows.slice(0, 28)) {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    keys.forEach((k, idx) => {
      const val = String(row[k] ?? '').replace(/\s+/g, ' ').slice(0, 24);
      doc.text(val, 16 + idx * colWidth, y);
    });
    y += 7;
  }

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
