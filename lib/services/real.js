// Real implementation: talks to the FastAPI backend under /api.
// Same function names and return shapes as mock.js, so screens don't care which is used.

export class ApiError extends Error {
  constructor(status, code, data) {
    super(code || `HTTP ${status}`);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function request(path, { method = "GET", json, form, signal } = {}) {
  const init = { method, signal, headers: {} };
  if (json !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(json);
  }
  if (form) init.body = form;
  let res;
  try {
    res = await fetch(`/api${path}`, init);
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(0, "network");
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const detail = data?.detail;
    const code = typeof detail === "object" && !Array.isArray(detail) ? detail?.code : Array.isArray(detail) ? "validation" : null;
    throw new ApiError(res.status, code, detail);
  }
  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Fire-and-forget: wakes the backend (database + model connections) while the user reads the page.
export const warmup = () => fetch("/api/warmup").catch(() => {});

// ---------- auth ----------
export const auth = {
  me: async () => (await request("/auth/me")).user,
  login: async ({ email, password }) => (await request("/auth/login", { method: "POST", json: { email, password } })).user,
  signup: (form) => request("/auth/signup", { method: "POST", json: form }),
  logout: () => request("/auth/logout", { method: "POST" }).catch(() => {}),
};

// ---------- admin ----------
export const admin = {
  listUsers: async () => (await request("/admin/users")).users,
  approveUser: async (id, role) => (await request(`/admin/users/${id}/approve`, { method: "POST", json: { role } })).user,
  rejectUser: async (id) => (await request(`/admin/users/${id}/reject`, { method: "POST" })).user,
  patchUser: async (id, patch) => (await request(`/admin/users/${id}`, { method: "PATCH", json: patch })).user,
  resetPassword: async (id) => (await request(`/admin/users/${id}/reset-password`, { method: "POST" })).temporaryPassword,
  removeUser: (id) => request(`/admin/users/${id}`, { method: "DELETE" }),

  listDocs: async () => (await request("/admin/documents")).documents,
  getDoc: async (id) => (await request(`/admin/documents/${id}`)).document,
  // Resolves { documents, errors }; a fully failed upload throws with .data.errors
  uploadFiles: async (files, access) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("access", access);
    return request("/admin/documents", { method: "POST", form });
  },
  createEntry: async (entry) => (await request("/admin/documents/entries", { method: "POST", json: entry })).document,
  patchDoc: async (id, patch) => (await request(`/admin/documents/${id}`, { method: "PATCH", json: patch })).document,
  reindexDoc: async (id) => (await request(`/admin/documents/${id}/reindex`, { method: "POST" })).document,
  deleteDoc: (id) => request(`/admin/documents/${id}`, { method: "DELETE" }),
};

// ---------- chat ----------
// Async generator of { event, data } parsed from the server-sent-event stream:
//   meta -> token... -> done   (or error)
export async function* chatStream({ message, history, signal }) {
  let res;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") return;
    yield { event: "error", data: { code: "network" } };
    return;
  }
  if (!res.ok || !res.body) {
    yield { event: "error", data: { code: res.status === 422 ? "validation" : "server_error" } };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const event = /^event: (.+)$/m.exec(block)?.[1];
        const raw = /^data: (.+)$/m.exec(block)?.[1];
        if (event && raw) yield { event, data: JSON.parse(raw) };
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") yield { event: "error", data: { code: "network" } };
  }
}
