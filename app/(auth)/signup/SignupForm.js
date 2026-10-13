"use client";

import Link from "next/link";
import { useState } from "react";
import Field from "@/components/auth/Field";
import Notice from "@/components/auth/Notice";
import SubmitButton from "@/components/auth/SubmitButton";

// MOCK ONLY: replaced by POST /api/auth/signup. The account is created with
// status "pending"; an admin approves it before private info is unlocked.
async function mockSignup({ email }) {
  await new Promise((r) => setTimeout(r, 1000));
  if (email.includes("taken")) return { ok: false, text: "Email already registered." };
  return { ok: true };
}

const ROLES = [
  { value: "student", label: "Student" },
  { value: "staff", label: "Staff member" },
];

export default function SignupForm() {
  const [form, setForm] = useState({ name: "", email: "", role: "student", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const weak = form.password.length > 0 && form.password.length < 8;
  const ready = form.name && form.email && form.password.length >= 8;

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await mockSignup(form);
    setLoading(false);
    if (res.ok) setDone(true);
    else setError(res.text);
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">Request sent</h2>
        <p className="mt-2 text-[15px] text-muted">Awaiting admin approval.</p>
        <Link
          href="/chat"
          className="mt-8 block w-full rounded-xl bg-crest-blue-soft px-4 py-3.5 text-[15px] font-semibold text-[#1d6bb3] transition hover:bg-crest-blue hover:text-white"
        >
          Continue as guest
        </Link>
        <Link href="/login" className="mt-3 inline-block px-2 py-2.5 text-sm font-semibold text-crest-red hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-center text-2xl font-semibold tracking-tight">Request access</h2>
      <form onSubmit={onSubmit} className="mt-9 space-y-5" noValidate>
        {error && <Notice tone="error">{error}</Notice>}

        <Field id="name" label="Full name" autoComplete="name" placeholder="Your name" value={form.name} onChange={set("name")} />
        <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />

        <div>
          <span className="mb-1.5 block text-sm font-medium">I am a</span>
          <div role="radiogroup" className="grid grid-cols-2 gap-1.5 rounded-xl bg-field p-1.5">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={form.role === r.value}
                onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                className={`rounded-lg py-2.5 text-[15px] font-semibold transition ${
                  form.role === r.value
                    ? "bg-white text-crest-red shadow-md shadow-black/10"
                    : "text-muted hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Field id="password" label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={set("password")} />
          {weak && <p className="mt-1.5 text-xs text-crest-red">At least 8 characters.</p>}
        </div>

        <SubmitButton loading={loading} disabled={!ready} loadingText="Sending…">
          Request access
        </SubmitButton>

        <p className="text-center text-sm text-muted">
          Have an account?{" "}
          <Link href="/login" className="inline-block px-1 py-2.5 font-semibold text-crest-red hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </>
  );
}
