"use client";

import { useRef, useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { GhostButton, PageTitle, Pill, SelectField } from "@/components/admin/ui";
import Notice from "@/components/auth/Notice";
import { PIPELINE, ago, formatSize } from "@/lib/mockAdminData";

const ACCESS = [
  { value: "public", label: "Public", dot: "blue", hint: "Anyone, including guests" },
  { value: "student", label: "Student", dot: "gold", hint: "Students, staff, admins" },
  { value: "staff", label: "Staff", dot: "red", hint: "Staff and admins only" },
];
const ALLOWED = /\.(pdf|txt|md|docx)$/i;
const MAX = 10 * 1024 * 1024;

function Upload() {
  const { addDocument } = useAdmin();
  const [access, setAccess] = useState("public");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const input = useRef(null);

  function take(files) {
    setError(null);
    for (const f of files) {
      if (!ALLOWED.test(f.name)) return setError(`${f.name}: use PDF, DOCX, TXT or MD.`);
      if (f.size > MAX) return setError(`${f.name} is over 10 MB.`);
      addDocument(f, access);
    }
  }

  return (
    <section className="mb-10">
      <div role="radiogroup" aria-label="Who can see the document" className="grid grid-cols-3 gap-1.5 rounded-2xl bg-field p-1.5 sm:w-fit">
        {ACCESS.map((a) => (
          <button
            key={a.value}
            role="radio"
            aria-checked={access === a.value}
            onClick={() => setAccess(a.value)}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              access === a.value ? "bg-white text-crest-red shadow-md shadow-black/10" : "text-muted hover:text-ink"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{ACCESS.find((a) => a.value === access).hint}</p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); take([...e.dataTransfer.files]); }}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-6 py-12 text-center transition ${
          dragging ? "bg-crest-blue/20 shadow-[0_0_0_2px_var(--color-crest-blue)]" : "bg-crest-blue-soft hover:bg-crest-blue/15"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-crest-blue" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 16V4M7 9l5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <span className="font-semibold text-[#1d6bb3]">Drop files or tap to upload</span>
        <span className="text-xs text-muted">PDF, DOCX, TXT, MD · up to 10 MB</span>
        <input ref={input} type="file" multiple accept=".pdf,.txt,.md,.docx" className="sr-only" onChange={(e) => { take([...e.target.files]); e.target.value = ""; }} />
      </label>
      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
    </section>
  );
}

function Progress({ stage }) {
  return (
    <div className="w-full sm:w-52" aria-label={`Processing: ${PIPELINE[stage]}`}>
      <div className="flex gap-1">
        {PIPELINE.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i <= stage ? "bg-crest-blue" : "bg-white"}`} />
        ))}
      </div>
      <p className="mt-1.5 text-xs font-medium text-[#1d6bb3]">{PIPELINE[stage]}…</p>
    </div>
  );
}

function DocRow({ doc }) {
  const { setDocAccess, deleteDoc } = useAdmin();
  const [confirming, setConfirming] = useState(false);
  const ext = doc.filename.split(".").pop().toUpperCase();

  return (
    <li className="flex flex-col gap-4 rounded-2xl bg-field p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[11px] font-bold text-crest-red shadow-sm shadow-black/5">
          {ext}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{doc.title}</p>
          <p className="truncate text-sm text-muted">
            {doc.status === "ready" ? `${doc.chunks} chunks · ` : ""}
            {formatSize(doc.size)} · {ago(doc.minutesAgo)}
          </p>
        </div>
      </div>

      {doc.status === "processing" ? (
        <Progress stage={doc.stage} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <SelectField
            label={`Access for ${doc.title}`}
            value={doc.access}
            onChange={(a) => setDocAccess(doc.id, a)}
            options={ACCESS.map(({ value, label, dot }) => ({ value, label, dot }))}
            className="min-w-36"
          />
          {confirming ? (
            <>
              <GhostButton tone="danger" onClick={() => deleteDoc(doc.id)}>Delete</GhostButton>
              <GhostButton onClick={() => setConfirming(false)}>Cancel</GhostButton>
            </>
          ) : (
            <GhostButton tone="danger" onClick={() => setConfirming(true)}>Remove</GhostButton>
          )}
        </div>
      )}
    </li>
  );
}

export default function DocumentsPage() {
  const { docs } = useAdmin();
  return (
    <>
      <PageTitle>Documents</PageTitle>
      <Upload />
      <ul className="space-y-3">
        {docs.map((d) => (
          <DocRow key={d.id} doc={d} />
        ))}
      </ul>
    </>
  );
}
