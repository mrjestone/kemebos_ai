"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { PIPELINE } from "@/lib/mockAdminData";
import { admin, auth } from "@/lib/services";

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

const ERROR_TEXT = {
  network: "Can't reach the server.",
  db_unavailable: "The database is temporarily unavailable.",
  validation: "Please check the details and try again.",
};

function errorText(err) {
  return err?.data?.errors?.[0]?.message ?? ERROR_TEXT[err?.code] ?? (err?.status === 403 ? "Not allowed." : "Something went wrong.");
}

// Admin state. Every action calls the backend (or the mock), then updates the lists.
export default function AdminProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((text, undo, tone = "info") => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, undo, tone });
    toastTimer.current = setTimeout(() => setToast(null), tone === "error" ? 6000 : 5000);
  }, []);
  const fail = useCallback((err) => showToast(errorText(err), undefined, "error"), [showToast]);

  const load = useCallback(async () => {
    try {
      const [u, d] = await Promise.all([admin.listUsers(), admin.listDocs()]);
      setUsers(u);
      setDocs(d);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    auth
      .me()
      .then(async (me) => {
        setSession(me);
        if (me?.role === "admin") await load();
      })
      .catch(() => setSession(null))
      .finally(() => setReady(true));
  }, [load]);

  const putUser = (u) => setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, ...u } : x)));
  const putDoc = (d) => setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, ...d } : x)));

  // ---------- users ----------
  async function changeUser(id, call, message) {
    const before = users.find((u) => u.id === id);
    try {
      const updated = await call();
      putUser(updated);
      showToast(message(updated), async () => {
        setToast(null);
        try {
          putUser(await admin.patchUser(id, { status: before.status, role: before.role }));
        } catch (err) {
          fail(err);
        }
      });
    } catch (err) {
      fail(err);
    }
  }

  const userActions = {
    approveUser: (id, role) => changeUser(id, () => admin.approveUser(id, role), (u) => `${u.name} approved as ${role}`),
    rejectUser: (id) => changeUser(id, () => admin.rejectUser(id), (u) => `${u.name} rejected`),
    setUserRole: (id, role) => changeUser(id, () => admin.patchUser(id, { role }), () => `Role changed to ${role}`),
    suspendUser: (id) => changeUser(id, () => admin.patchUser(id, { status: "suspended" }), (u) => `${u.name} suspended`),
    reactivateUser: (id) => changeUser(id, () => admin.patchUser(id, { status: "approved" }), (u) => `${u.name} reactivated`),
    // Resolves the temporary password (shown once) or null on failure
    resetPassword: async (id) => {
      try {
        return await admin.resetPassword(id);
      } catch (err) {
        fail(err);
        return null;
      }
    },
  };

  // ---------- knowledge ----------
  // Shows placeholder rows that step through the pipeline while the server works.
  function track(placeholders) {
    setDocs((ds) => [...placeholders, ...ds]);
    let stage = 0;
    const timer = setInterval(() => {
      stage = Math.min(stage + 1, PIPELINE.length - 1);
      setDocs((ds) => ds.map((d) => (placeholders.some((p) => p.id === d.id) ? { ...d, stage } : d)));
    }, 900);
    return () => {
      clearInterval(timer);
      setDocs((ds) => ds.filter((d) => !placeholders.some((p) => p.id === d.id)));
    };
  }

  const placeholder = (title, access, size = 0, filename = null) => ({
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title, filename, size, access, kind: "file", status: "processing", stage: 0, chunks: 0, createdAt: new Date().toISOString(),
  });

  const docActions = {
    // Resolves an array of { file, message } problems (empty when everything worked)
    uploadFiles: async (files, access) => {
      const done = track(files.map((f) => placeholder(f.name, access, f.size, f.name)));
      try {
        const res = await admin.uploadFiles(files, access);
        done();
        setDocs((ds) => [...res.documents, ...ds]);
        if (res.documents.length) showToast(`${res.documents.length} added to the knowledge base`);
        return res.errors;
      } catch (err) {
        done();
        return err?.data?.errors ?? [{ file: "Upload", message: errorText(err) }];
      }
    },
    createEntry: async (entry) => {
      const done = track([placeholder(entry.title, entry.access, entry.content.length)]);
      try {
        const doc = await admin.createEntry(entry);
        done();
        setDocs((ds) => [doc, ...ds]);
        showToast(`${doc.title} added`);
        return null;
      } catch (err) {
        done();
        return errorText(err);
      }
    },
    setDocAccess: async (id, access) => {
      const before = docs.find((d) => d.id === id).access;
      try {
        const updated = await admin.patchDoc(id, { access });
        putDoc(updated);
        showToast(`${updated.title} is now ${access}`, async () => {
          setToast(null);
          try {
            putDoc(await admin.patchDoc(id, { access: before }));
          } catch (err) {
            fail(err);
          }
        });
      } catch (err) {
        fail(err);
      }
    },
    loadDoc: (id) => admin.getDoc(id),
    // Edit text/title: re-chunks and re-embeds on the server. Resolves an error message or null
    saveDoc: async (id, changes) => {
      try {
        putDoc(await admin.patchDoc(id, changes));
        showToast("Saved and re-indexed");
        return null;
      } catch (err) {
        return errorText(err);
      }
    },
    retryDoc: async (id) => {
      putDoc({ id, status: "processing", stage: 0, error: null });
      try {
        putDoc(await admin.reindexDoc(id));
        showToast("Indexed");
      } catch (err) {
        putDoc({ id, status: "failed", error: errorText(err) });
      }
    },
    deleteDoc: async (id) => {
      const title = docs.find((d) => d.id === id)?.title;
      try {
        await admin.deleteDoc(id);
        setDocs((ds) => ds.filter((d) => d.id !== id));
        showToast(`${title} deleted`);
      } catch (err) {
        fail(err);
      }
    },
  };

  async function signOut() {
    await auth.logout();
    setSession(null);
  }

  const allUsers = users.map((u) => ({ ...u, isYou: u.id === session?.id }));

  return (
    <AdminContext.Provider
      value={{ session, ready, loadError, reload: load, users: allUsers, docs, toast, dismissToast: () => setToast(null), signOut, ...userActions, ...docActions }}
    >
      {children}
    </AdminContext.Provider>
  );
}
