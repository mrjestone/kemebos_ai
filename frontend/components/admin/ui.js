"use client";

import { useEffect, useRef, useState } from "react";

export const initials = (name) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

export function Avatar({ name, tone = "blue" }) {
  const bg = tone === "gold" ? "bg-crest-gold text-crest-red-deep" : tone === "red" ? "bg-crest-red text-white" : "bg-crest-blue text-white";
  return (
    <span aria-hidden className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${bg}`}>
      {initials(name)}
    </span>
  );
}

const PILL = {
  public: "bg-crest-blue-soft text-[#1d6bb3]",
  student: "bg-amber-100 text-amber-800",
  staff: "bg-red-50 text-crest-red",
  admin: "bg-crest-red text-white",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-50 text-emerald-700",
  suspended: "bg-field text-muted",
  rejected: "bg-red-50 text-crest-red",
  processing: "bg-crest-blue-soft text-[#1d6bb3]",
  ready: "bg-emerald-50 text-emerald-700",
};

export function Pill({ kind, children }) {
  return (
    <span className={`inline-block w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${PILL[kind]}`}>
      {children ?? kind}
    </span>
  );
}

const DOT = { blue: "bg-crest-blue", gold: "bg-crest-gold", red: "bg-crest-red" };

// Custom dropdown (replaces the native <select>): keyboard + screen-reader friendly.
export function SelectField({ label, value, onChange, options, disabled, className = "" }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const current = opts.find((o) => o.value === value) ?? opts[0];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState({ up: false, right: false });
  const wrapper = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !wrapper.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function toggle() {
    if (disabled) return;
    if (!open) {
      const r = trigger.current.getBoundingClientRect();
      const need = opts.length * 44 + 24;
      setPlacement({
        up: window.innerHeight - r.bottom < need && r.top > window.innerHeight - r.bottom,
        right: r.left > window.innerWidth / 2,
      });
      setActive(Math.max(0, opts.findIndex((o) => o.value === value)));
    }
    setOpen((o) => !o);
  }

  function choose(o) {
    setOpen(false);
    trigger.current?.focus();
    if (o.value !== value) onChange(o.value);
  }

  function onKeyDown(e) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        toggle();
      }
      return;
    }
    if (e.key === "Escape" || e.key === "Tab") setOpen(false);
    else if (e.key === "ArrowDown") (e.preventDefault(), setActive((i) => (i + 1) % opts.length));
    else if (e.key === "ArrowUp") (e.preventDefault(), setActive((i) => (i - 1 + opts.length) % opts.length));
    else if (e.key === "Enter" || e.key === " ") (e.preventDefault(), choose(opts[active]));
  }

  return (
    <div ref={wrapper} className={`relative ${className}`}>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className="flex min-h-11 w-full items-center gap-2.5 rounded-xl bg-white px-3.5 text-sm font-semibold shadow-sm shadow-black/5 outline-none transition hover:shadow-md hover:shadow-black/10 focus-visible:shadow-[0_0_0_2px_var(--color-crest-blue)] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
      >
        {current.dot && <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[current.dot]}`} />}
        <span className="flex-1 text-left">{current.label}</span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className={`float-in absolute z-30 w-max min-w-full rounded-2xl bg-white p-1.5 shadow-[0_16px_48px_-8px_rgba(27,36,51,0.3)] ${
            placement.up ? "bottom-full mb-2" : "top-full mt-2"
          } ${placement.right ? "right-0" : "left-0"}`}
        >
          {opts.map((o, i) => (
            <li key={o.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
                className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium transition ${
                  i === active ? "bg-field" : ""
                } ${o.value === value ? "text-crest-red" : ""}`}
              >
                {o.dot && <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[o.dot]}`} />}
                <span className="flex-1">{o.label}</span>
                {o.value === value && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PrimaryButton({ className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-xl bg-crest-red px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-crest-red/25 transition hover:bg-crest-red-dark active:scale-[0.98] disabled:opacity-50 ${className}`}
    />
  );
}

export function GhostButton({ tone = "default", className = "", ...props }) {
  const color = tone === "danger" ? "text-crest-red hover:bg-red-50" : "text-muted hover:bg-field hover:text-ink";
  return (
    <button {...props} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${color} ${className}`} />
  );
}

export function PageTitle({ children, action }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {action}
    </div>
  );
}

export function Empty({ title }) {
  return (
    <div className="grid place-items-center rounded-2xl bg-field px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-emerald-600 shadow-md shadow-black/5">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <p className="mt-4 font-semibold">{title}</p>
    </div>
  );
}
