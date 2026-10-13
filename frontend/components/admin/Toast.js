"use client";

import { useAdmin } from "./AdminProvider";

export default function Toast() {
  const { toast, dismissToast } = useAdmin();
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
      <div
        key={toast.id}
        role="status"
        className="float-in pointer-events-auto flex items-center gap-4 rounded-full bg-ink py-3 pl-6 pr-3 text-sm font-medium text-white shadow-2xl shadow-black/30"
      >
        <span>{toast.text}</span>
        {toast.undo ? (
          <button onClick={toast.undo} className="rounded-full px-3 py-1.5 font-semibold text-crest-gold transition hover:bg-white/10">
            Undo
          </button>
        ) : (
          <button onClick={dismissToast} aria-label="Dismiss" className="rounded-full px-3 py-1.5 text-white/60 hover:text-white">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
