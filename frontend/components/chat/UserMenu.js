"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const initials = (name) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

const itemClass =
  "flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-medium transition hover:bg-field";

export default function UserMenu({ session, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.type === "keydown" ? e.key === "Escape" : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-3 rounded-full p-1 transition hover:bg-field sm:pr-3"
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-crest-blue text-sm font-bold text-white">
          {initials(session.name)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold">{session.name}</span>
          <span className="mt-0.5 block text-xs capitalize text-muted">{session.role}</span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="float-in absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl bg-white p-2 shadow-[0_16px_48px_-8px_rgba(27,36,51,0.28)]"
        >
          <div className="px-3 pb-2 pt-3">
            <p className="truncate text-sm font-semibold">{session.name}</p>
            <p className="mt-0.5 text-xs capitalize text-muted">{session.role}</p>
          </div>
          {session.role === "admin" && (
            <Link href="/admin" role="menuitem" className={`${itemClass} text-[#1d6bb3]`}>
              Admin dashboard
            </Link>
          )}
          {session.role === "admin" && (
            <Link href="/chat" role="menuitem" className={itemClass}>
              Chat
            </Link>
          )}
          <button role="menuitem" onClick={onSignOut} className={`${itemClass} text-crest-red`}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
