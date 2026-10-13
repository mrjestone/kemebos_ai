"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { PIPELINE, SEED_DOCS, SEED_USERS } from "@/lib/mockAdminData";
import { clearSession, getSession } from "@/lib/mockSession";

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

// MOCK ONLY: in-memory admin state. Each action maps to one Flask endpoint later.
export default function AdminProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState(SEED_USERS);
  const [docs, setDocs] = useState(SEED_DOCS);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    setSession(getSession());
    setReady(true);
  }, []);

  const showToast = useCallback((text, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const patchUser = (id, patch) =>
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const patchDoc = (id, patch) =>
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  // Changes a user and offers an Undo that restores the previous values.
  function changeUser(id, patch, message) {
    const before = users.find((u) => u.id === id);
    const prev = Object.fromEntries(Object.keys(patch).map((k) => [k, before[k]]));
    patchUser(id, patch);
    showToast(message, () => {
      patchUser(id, prev);
      setToast(null);
    });
  }

  const actions = {
    approveUser: (id, role) => {
      const u = users.find((x) => x.id === id);
      changeUser(id, { status: "approved", role }, `${u.name} approved as ${role}`);
    },
    rejectUser: (id) => changeUser(id, { status: "rejected" }, `${users.find((x) => x.id === id).name} rejected`),
    setUserRole: (id, role) => changeUser(id, { role }, `Role changed to ${role}`),
    suspendUser: (id) => changeUser(id, { status: "suspended" }, `${users.find((x) => x.id === id).name} suspended`),
    reactivateUser: (id) => changeUser(id, { status: "approved" }, `${users.find((x) => x.id === id).name} reactivated`),

    addDocument: (file, access) => {
      const id = `d${Date.now()}`;
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      setDocs((ds) => [
        { id, title, filename: file.name, size: file.size, access, chunks: 0, status: "processing", stage: 0, minutesAgo: 0 },
        ...ds,
      ]);
      // Simulates the ingestion pipeline: upload -> extract -> chunk -> embed.
      PIPELINE.forEach((_, i) => {
        setTimeout(() => {
          if (i < PIPELINE.length - 1) patchDoc(id, { stage: i + 1 });
          else patchDoc(id, { status: "ready", chunks: Math.max(3, Math.round(file.size / 900)) });
        }, 800 * (i + 1));
      });
      showToast(`${title} uploaded as ${access}`);
    },
    setDocAccess: (id, access) => {
      const d = docs.find((x) => x.id === id);
      const prev = d.access;
      patchDoc(id, { access });
      showToast(`${d.title} is now ${access}`, () => {
        patchDoc(id, { access: prev });
        setToast(null);
      });
    },
    deleteDoc: (id) => {
      const d = docs.find((x) => x.id === id);
      setDocs((ds) => ds.filter((x) => x.id !== id));
      showToast(`${d.title} deleted`, () => {
        setDocs((ds) => [d, ...ds]);
        setToast(null);
      });
    },
  };

  const me = session && { id: "me", name: session.name, email: "you", role: "admin", status: "approved", minutesAgo: 0, isYou: true };
  const allUsers = me ? [me, ...users] : users;

  function signOut() {
    clearSession();
    setSession(null);
  }

  return (
    <AdminContext.Provider value={{ session, ready, users: allUsers, docs, toast, dismissToast: () => setToast(null), signOut, ...actions }}>
      {children}
    </AdminContext.Provider>
  );
}
