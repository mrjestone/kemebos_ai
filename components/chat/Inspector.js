"use client";

import { useState } from "react";

const DOT = { public: "bg-crest-blue", student: "bg-crest-gold", staff: "bg-crest-red", admin: "bg-ink" };
const METHOD = { atlas: "Atlas Vector Search", scan: "Built-in similarity scan", none: "None" };

function Chip({ label, value }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

// Admin-only: shows exactly what the retrieval step found, and what was held back.
export default function Inspector({ inspector, sources, provider, totalMs }) {
  const [open, setOpen] = useState(false);
  const used = new Set(sources.map((s) => s.id));

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full px-1 py-1.5 text-xs font-semibold text-[#1d6bb3] transition hover:text-crest-blue"
      >
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
        Retrieval details
      </button>

      {open && (
        <div className="float-in mt-2 space-y-4 rounded-2xl bg-field p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Chip label="Search" value={METHOD[inspector.method] ?? inspector.method} />
            <Chip label="Search time" value={`${inspector.searchMs} ms`} />
            <Chip label="Model" value={provider ?? "…"} />
            <Chip label="Total" value={totalMs ? `${(totalMs / 1000).toFixed(1)} s` : "…"} />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">Chunks found for your access level</p>
            {inspector.retrieved.length === 0 ? (
              <p className="text-sm text-muted">Nothing found.</p>
            ) : (
              <ul className="space-y-2">
                {inspector.retrieved.map((h) => (
                  <li key={h.chunkId ?? h.id + h.score} className={used.has(h.id) ? "" : "opacity-55"}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[h.access]}`} />
                        <span className="truncate">{h.title}</span>
                        <span className="shrink-0 text-xs capitalize text-muted">{h.access}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-xs font-semibold">{h.score.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-crest-blue" style={{ width: `${Math.round(h.score * 100)}%` }} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{h.preview}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-muted">{used.has(h.id) ? "Sent to the model" : "Below the relevance cut-off"}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {inspector.blocked && (
            <div className="rounded-xl bg-amber-100 px-3 py-2.5 text-sm text-amber-900">
              <span className="font-semibold">Withheld:</span> “{inspector.blocked.title}” ({inspector.blocked.access}, score{" "}
              {inspector.blocked.score.toFixed(2)}) matched but is above this user&apos;s access level, so its text was never searched into the prompt.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
