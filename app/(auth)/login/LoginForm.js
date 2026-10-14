"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth } from "@/lib/services";
import Field from "@/components/auth/Field";
import Notice from "@/components/auth/Notice";
import SubmitButton from "@/components/auth/SubmitButton";

const MESSAGES = {
  invalid: { tone: "error", text: "Wrong email or password." },
  pending: { tone: "info", text: "Awaiting admin approval." },
  blocked: { tone: "error", text: "This account is not active." },
  network: { tone: "error", text: "Can't reach the server. Check your connection." },
  default: { tone: "error", text: "Something went wrong. Please try again." },
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const user = await auth.login({ email: email.trim(), password });
      setResult({ ok: true });
      router.push(user.role === "admin" ? "/admin" : "/chat");
    } catch (err) {
      setResult({ ok: false, code: err.code });
      setLoading(false);
    }
  }

  const message = result && !result.ok ? (MESSAGES[result.code] ?? MESSAGES.default) : null;

  return (
    <form onSubmit={onSubmit} className="mt-9 space-y-5" noValidate>
      {result?.ok && <Notice tone="success">Signed in.</Notice>}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="Your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <SubmitButton
        loading={loading}
        disabled={!email || !password}
        loadingText="Signing in…"
      >
        Sign in
      </SubmitButton>

      <Link
        href="/chat"
        onClick={() => auth.logout()}
        className="block w-full rounded-xl bg-crest-blue-soft px-4 py-3.5 text-center text-[15px] font-semibold text-[#1d6bb3] transition hover:bg-crest-blue hover:text-white focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(63,143,217,0.4)]"
      >
        Continue as guest
      </Link>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="inline-block px-1 py-2.5 font-semibold text-crest-red hover:underline">
          Request access
        </Link>
      </p>
    </form>
  );
}
