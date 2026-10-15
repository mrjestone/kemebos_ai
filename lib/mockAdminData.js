// MOCK ONLY: seed data for the admin area. Replaced by the Flask admin API.
export const SEED_USERS = [
  { id: "u1", name: "Neema Joseph", email: "neema.joseph@example.com", role: "student", status: "pending", minutesAgo: 25 },
  { id: "u2", name: "Baraka Mushi", email: "baraka.mushi@example.com", role: "staff", status: "pending", minutesAgo: 140 },
  { id: "u3", name: "Zawadi Komba", email: "zawadi.komba@example.com", role: "student", status: "pending", minutesAgo: 60 * 26 },
  { id: "u4", name: "Amina Juma", email: "amina.juma@example.com", role: "student", status: "approved", minutesAgo: 60 * 24 * 9 },
  { id: "u5", name: "Juma Rweyemamu", email: "juma.rweyemamu@example.com", role: "student", status: "approved", minutesAgo: 60 * 24 * 12 },
  { id: "u6", name: "Mwanaidi Said", email: "mwanaidi.said@example.com", role: "staff", status: "approved", minutesAgo: 60 * 24 * 20 },
  { id: "u7", name: "Peter Kaijage", email: "peter.kaijage@example.com", role: "staff", status: "approved", minutesAgo: 60 * 24 * 21 },
  { id: "u8", name: "Grace Mutabingwa", email: "grace.mutabingwa@example.com", role: "student", status: "approved", minutesAgo: 60 * 24 * 4 },
  { id: "u9", name: "Rashidi Ally", email: "rashidi.ally@example.com", role: "student", status: "suspended", minutesAgo: 60 * 24 * 30 },
  { id: "u10", name: "Fatuma Bakari", email: "fatuma.bakari@example.com", role: "student", status: "rejected", minutesAgo: 60 * 24 * 3 },
];

export const SEED_DOCS = [
  { id: "d1", title: "Parents Day Calendar", filename: "parents-day-calendar.pdf", size: 84_000, access: "public", chunks: 6, status: "ready", minutesAgo: 60 * 24 * 5 },
  { id: "d2", title: "Admission Guide", filename: "admission-guide.pdf", size: 212_000, access: "public", chunks: 14, status: "ready", minutesAgo: 60 * 24 * 5 },
  { id: "d3", title: "School Hours", filename: "school-hours.txt", size: 2_400, access: "public", chunks: 2, status: "ready", minutesAgo: 60 * 24 * 8 },
  { id: "d4", title: "Contact & Location", filename: "contact.txt", size: 1_800, access: "public", chunks: 2, status: "ready", minutesAgo: 60 * 24 * 8 },
  { id: "d5", title: "Fee Payment Procedure", filename: "fee-payment.docx", size: 56_000, access: "student", chunks: 5, status: "ready", minutesAgo: 60 * 24 * 3 },
  { id: "d6", title: "Exam Timetable", filename: "exam-timetable.pdf", size: 98_000, access: "student", chunks: 7, status: "ready", minutesAgo: 60 * 24 * 2 },
  { id: "d7", title: "Staff Leave Procedure", filename: "staff-leave.docx", size: 41_000, access: "staff", chunks: 4, status: "ready", minutesAgo: 60 * 24 * 6 },
  { id: "d8", title: "Finance & Budget Policy", filename: "budget-policy.pdf", size: 163_000, access: "staff", chunks: 11, status: "ready", minutesAgo: 60 * 24 * 6 },
];

export const PIPELINE = ["Uploading", "Extracting text", "Chunking", "Embedding"];

export function ago(minutes) {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 60 / 24)}d ago`;
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function agoFrom(iso) {
  // The API sends UTC times without a "Z"; without it the browser reads them as local time (3 hours off in Tanzania).
  const utc = typeof iso === "string" && !/(Z|[+-]\d\d:?\d\d)$/.test(iso) ? `${iso}Z` : iso;
  return ago((Date.now() - Date.parse(utc)) / 60000);
}
