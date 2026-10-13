// MOCK ONLY: stands in for the real JWT session cookie from the Flask backend.
const KEY = "kk_session";

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

// Mock rule: "admin" in the email -> admin, "staff" -> staff, else student.
export function sessionFromEmail(email) {
  const name = email.split("@")[0].replace(/[._-]+/g, " ");
  const role = email.includes("admin") ? "admin" : email.includes("staff") ? "staff" : "student";
  return { name: name.replace(/\b\w/g, (c) => c.toUpperCase()), role };
}
