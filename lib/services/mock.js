// Mock implementation (offline demo fallback). Same interface as real.js.
// State lives in memory only: a page refresh resets it.
import { SEED_DOCS, SEED_USERS } from "@/lib/mockAdminData";
import { answerQuestion } from "@/lib/mockKnowledge";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (minutesAgo) => new Date(Date.now() - minutesAgo * 60000).toISOString();
const KEY = "kk_session";

export class ApiError extends Error {
  constructor(status, code, data) {
    super(code || `HTTP ${status}`);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export const warmup = () => {};

// ---------- session (localStorage stands in for the cookie) ----------
function readSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

const users = SEED_USERS.map(({ minutesAgo, ...u }) => ({ ...u, createdAt: iso(minutesAgo) }));
const docs = SEED_DOCS.map(({ minutesAgo, stage, ...d }) => ({ ...d, kind: "seed", error: null, createdAt: iso(minutesAgo) }));

export const auth = {
  me: async () => {
    const s = readSession();
    return s ? { id: "me", email: s.email ?? "you", status: "approved", createdAt: iso(0), ...s } : null;
  },
  login: async ({ email, password }) => {
    await sleep(700);
    if (email.includes("pending")) throw new ApiError(403, "pending");
    if (password.includes("wrong")) throw new ApiError(401, "invalid");
    const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const role = email.includes("admin") ? "admin" : email.includes("staff") ? "staff" : "student";
    const session = { name, role, email };
    try {
      localStorage.setItem(KEY, JSON.stringify(session));
    } catch {}
    return { id: "me", status: "approved", createdAt: iso(0), ...session };
  },
  signup: async ({ email }) => {
    await sleep(800);
    if (email.includes("taken")) throw new ApiError(409, "email_taken");
    return { status: "pending" };
  },
  logout: async () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
  },
};

// ---------- admin ----------
const find = (list, id) => list.find((x) => x.id === id);

export const admin = {
  listUsers: async () => {
    await sleep(150);
    const s = readSession();
    const me = s && { id: "me", name: s.name, email: "you", role: "admin", status: "approved", createdAt: iso(0), isYou: true };
    return [...(me ? [me] : []), ...users.map((u) => ({ ...u }))];
  },
  approveUser: async (id, role) => Object.assign(find(users, id), { status: "approved", role }),
  rejectUser: async (id) => Object.assign(find(users, id), { status: "rejected" }),
  patchUser: async (id, patch) => Object.assign(find(users, id), patch),
  resetPassword: async () => "Temp-Pass-123",
  removeUser: async (id) => void users.splice(users.indexOf(find(users, id)), 1),

  listDocs: async () => {
    await sleep(150);
    return docs.map((d) => ({ ...d }));
  },
  getDoc: async (id) => ({ ...find(docs, id), content: find(docs, id).content ?? "(sample content)" }),
  uploadFiles: async (files, access) => {
    await sleep(3400); // the UI shows the 4 pipeline stages meanwhile
    const created = [];
    const errors = [];
    for (const f of files) {
      if (!/\.(pdf|txt|md|docx|json)$/i.test(f.name)) {
        errors.push({ file: f.name, message: "Use JSON, MD, TXT, PDF or DOCX." });
        continue;
      }
      const title = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const doc = { id: `d${Date.now()}${created.length}`, title, filename: f.name, size: f.size, access, kind: "file", status: "ready", chunks: Math.max(3, Math.round(f.size / 900)), error: null, createdAt: iso(0) };
      docs.unshift(doc);
      created.push({ ...doc });
    }
    if (!created.length) throw new ApiError(422, null, { errors });
    return { documents: created, errors };
  },
  createEntry: async ({ title, content, access }) => {
    await sleep(1500);
    const doc = { id: `d${Date.now()}`, title, filename: null, size: content.length, access, kind: "entry", status: "ready", chunks: Math.max(1, Math.round(content.length / 900)), error: null, createdAt: iso(0), content };
    docs.unshift(doc);
    return { ...doc };
  },
  patchDoc: async (id, patch) => Object.assign(find(docs, id), patch),
  reindexDoc: async (id) => find(docs, id),
  deleteDoc: async (id) => void docs.splice(docs.indexOf(find(docs, id)), 1),
};

// ---------- chat ----------
export async function* chatStream({ message, signal }) {
  const role = readSession()?.role ?? "guest";
  const a = answerQuestion(message, role);
  yield { event: "meta", data: { sources: a.sources.map((s) => ({ ...s, score: null })), denied: a.denied } };
  await sleep(700);
  for (const word of a.text.split(/(\s+)/)) {
    if (signal?.aborted) return;
    yield { event: "token", data: { t: word } };
    await sleep(35);
  }
  yield { event: "done", data: { provider: null } };
}
