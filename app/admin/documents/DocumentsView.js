"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { GhostButton, PageTitle, PrimaryButton, SelectField } from "@/components/admin/ui";
import Notice from "@/components/auth/Notice";
import { PIPELINE, agoFrom, formatSize } from "@/lib/mockAdminData";

const ACCESS = [
  { value: "public", label: "Public", dot: "blue", hint: "Anyone, including guests" },
  { value: "student", label: "Student", dot: "gold", hint: "Students, staff and admins" },
  { value: "staff", label: "Staff", dot: "red", hint: "Staff and admins only" },
  { value: "admin", label: "Admin", dot: "red", hint: "Admins only" },
];
const ALLOWED = /\.(pdf|txt|md|docx|json)$/i;
const MAX = 4 * 1024 * 1024; // the hosting platform caps request bodies at ~4.5 MB

function Segmented({ label, value, onChange, options, cols }) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid ${cols} gap-1.5 rounded-2xl bg-field p-1.5 sm:w-fit`}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
            value === o.value ? "bg-white text-crest-red shadow-md shadow-black/10" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Uploader({ access }) {
  const { uploadFiles } = useAdmin();
  const [dragging, setDragging] = useState(false);
  const [problems, setProblems] = useState([]);

  async function take(files) {
    const bad = [];
    const good = [];
    for (const f of files) {
      if (!ALLOWED.test(f.name)) bad.push({ file: f.name, message: "Use JSON, MD, TXT, PDF or DOCX." });
      else if (f.size > MAX) bad.push({ file: f.name, message: "Over the 4 MB limit." });
      else good.push(f);
    }
    setProblems(bad);
    if (good.length) setProblems([...bad, ...(await uploadFiles(good, access))]);
  }

  return (
    <>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); take([...e.dataTransfer.files]); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-6 py-12 text-center transition ${
          dragging ? "bg-crest-blue/20 shadow-[0_0_0_2px_var(--color-crest-blue)]" : "bg-crest-blue-soft hover:bg-crest-blue/15"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-crest-blue" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 16V4M7 9l5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <span className="font-semibold text-[#1d6bb3]">Drop files or tap to upload</span>
        <span className="text-xs text-muted">JSON, MD, TXT, PDF, DOCX · up to 4 MB</span>
        <input type="file" multiple accept=".pdf,.txt,.md,.docx,.json" className="sr-only" onChange={(e) => { take([...e.target.files]); e.target.value = ""; }} />
      </label>
      {problems.length > 0 && (
        <div className="mt-3 space-y-2">
          {problems.map((p, i) => (
            <Notice key={i} tone="error">
              <span className="font-semibold">{p.file}:</span> {p.message}
            </Notice>
          ))}
        </div>
      )}
    </>
  );
}

function EntryForm({ access }) {
  const { createEntry } = useAdmin();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const problem = await createEntry({ title: title.trim(), content: content.trim(), access });
    setBusy(false);
    if (problem) setError(problem);
    else {
      setTitle("");
      setContent("");
    }
  }

  const field = "w-full rounded-xl bg-field px-4 py-3.5 text-base outline-none transition placeholder:text-muted/60 focus:bg-white focus:shadow-[0_0_0_2px_var(--color-crest-blue),0_8px_24px_-8px_rgba(63,143,217,0.45)]";
  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title, e.g. Sports Day" aria-label="Title" maxLength={160} className={field} />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the information in English or Kiswahili…" aria-label="Content" rows={6} maxLength={50000} className={`${field} resize-y`} />
      <PrimaryButton type="submit" disabled={busy || !title.trim() || !content.trim()} className="w-full py-3.5 sm:w-auto sm:px-8">
        {busy ? "Adding…" : "Add entry"}
      </PrimaryButton>
    </form>
  );
}

function Progress({ stage = 0 }) {
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

function Editor({ doc, onClose }) {
  const { loadDoc, saveDoc } = useAdmin();
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadDoc(doc.id).then(
      (d) => !cancelled && setContent(d.content),
      () => !cancelled && setError("Couldn't load the text."),
    );
    return () => {
      cancelled = true;
    };
  }, [doc.id, loadDoc]);

  async function save() {
    setSaving(true);
    setError(null);
    const problem = await saveDoc(doc.id, { title: title.trim(), content });
    setSaving(false);
    if (problem) setError(problem);
    else onClose();
  }

  const field = "w-full rounded-xl bg-white px-4 py-3 text-base outline-none transition focus:shadow-[0_0_0_2px_var(--color-crest-blue)]";
  return (
    <div className="mt-4 space-y-3 sm:basis-full">
      {error && <Notice tone="error">{error}</Notice>}
      <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" className={field} />
      <textarea value={content ?? "Loading…"} disabled={content === null} onChange={(e) => setContent(e.target.value)} rows={8} aria-label="Content" className={`${field} resize-y`} />
      <div className="flex gap-2">
        <PrimaryButton onClick={save} disabled={saving || content === null || !title.trim() || !content.trim()}>
          {saving ? "Re-indexing…" : "Save"}
        </PrimaryButton>
        <GhostButton onClick={onClose}>Cancel</GhostButton>
      </div>
    </div>
  );
}

function DocRow({ doc }) {
  const { setDocAccess, deleteDoc, retryDoc } = useAdmin();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const ext = doc.filename ? doc.filename.split(".").pop().toUpperCase().slice(0, 4) : "TXT";

  return (
    <li className="flex flex-col gap-4 rounded-2xl bg-field p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[11px] font-bold text-crest-red shadow-sm shadow-black/5">{ext}</span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{doc.title}</p>
          <p className="truncate text-sm text-muted">
            {doc.status === "ready" ? `${doc.chunks} chunks · ` : ""}
            {doc.kind === "entry" ? "Written entry" : formatSize(doc.size)} · {agoFrom(doc.createdAt)}
          </p>
          {doc.status === "failed" && <p className="mt-1 text-sm font-medium text-crest-red">{doc.error ?? "Indexing failed."}</p>}
        </div>
      </div>

      {doc.status === "processing" ? (
        <Progress stage={doc.stage} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <SelectField label={`Access for ${doc.title}`} value={doc.access} onChange={(a) => setDocAccess(doc.id, a)} options={ACCESS.map(({ value, label, dot }) => ({ value, label, dot }))} className="min-w-36" />
          {doc.status === "failed" && <GhostButton onClick={() => retryDoc(doc.id)}>Retry</GhostButton>}
          {doc.status === "ready" && <GhostButton onClick={() => setEditing((e) => !e)}>{editing ? "Close" : "Edit"}</GhostButton>}
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
      {editing && <Editor doc={doc} onClose={() => setEditing(false)} />}
    </li>
  );
}

export default function DocumentsPage() {
  const { docs } = useAdmin();
  const [mode, setMode] = useState("upload");
  const [access, setAccess] = useState("public");

  return (
    <>
      <PageTitle>Knowledge</PageTitle>

      <section className="mb-10 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented label="How to add" value={mode} onChange={setMode} cols="grid-cols-2" options={[{ value: "upload", label: "Upload files" }, { value: "write", label: "Write an entry" }]} />
          <Segmented label="Who can see it" value={access} onChange={setAccess} cols="grid-cols-4" options={ACCESS} />
        </div>
        <p className="text-sm text-muted">{ACCESS.find((a) => a.value === access).hint}</p>
        {mode === "upload" ? <Uploader access={access} /> : <EntryForm access={access} />}
      </section>

      <ul className="space-y-3">
        {docs.map((d) => (
          <DocRow key={d.id} doc={d} />
        ))}
      </ul>
    </>
  );
}
