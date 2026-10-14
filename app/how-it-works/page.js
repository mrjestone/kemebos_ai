import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "How it works · Kaizerege & Kemebos AI Assistant" };

const STEPS = [
  { title: "You ask", text: "In English or Kiswahili, in your own words." },
  { title: "The question becomes numbers", text: "An embedding model turns it into a fingerprint of its meaning, so “Siku ya wazazi” finds “Parents Day”, even across languages." },
  { title: "Search only what you may see", text: "Your access level is part of the database search itself. Text above your level is never retrieved, so it can't leak." },
  { title: "The AI answers from those passages", text: "Gemini writes the reply using only the passages found, with Groq as a backup. If the answer isn't there, it says so." },
  { title: "The answer streams back", text: "Word by word, with the documents it came from." },
];

const LEVELS = ["Public", "Student", "Staff", "Admin"];
const MATRIX = [
  { who: "Guest", sees: [1, 0, 0, 0] },
  { who: "Student", sees: [1, 1, 0, 0] },
  { who: "Staff", sees: [1, 1, 1, 0] },
  { who: "Admin", sees: [1, 1, 1, 1] },
];

const STACK = ["Next.js", "Tailwind CSS", "FastAPI", "MongoDB Atlas Vector Search", "Gemini", "Groq", "Vercel"];

function Node({ title, lines, tone = "field" }) {
  const bg = tone === "red" ? "bg-crest-red text-white" : tone === "blue" ? "bg-crest-blue-soft" : "bg-field";
  return (
    <div className={`rounded-2xl p-5 ${bg}`}>
      <p className="font-semibold">{title}</p>
      <ul className={`mt-2 space-y-0.5 text-sm ${tone === "red" ? "text-white/80" : "text-muted"}`}>
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

const Arrow = ({ label }) => (
  <div className="flex flex-col items-center justify-center gap-1 py-1 text-muted lg:py-0" aria-hidden>
    <span className="hidden text-2xl lg:block">→</span>
    <span className="text-2xl lg:hidden">↓</span>
    <span className="text-[11px] font-medium">{label}</span>
  </div>
);

export default function HowItWorks() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="shadow-[0_1px_16px_rgba(27,36,51,0.06)]">
        <div className="mx-auto flex h-[72px] w-full max-w-5xl items-center justify-between px-4 sm:px-8">
          <Link href="/chat" className="flex items-center gap-3">
            <Logo size={42} />
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold sm:text-base">Kaizerege &amp; Kemebos</span>
              <span className="mt-0.5 block whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-crest-red">AI Assistant</span>
            </span>
          </Link>
          <Link href="/chat" className="rounded-full bg-crest-red px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-crest-red/25 transition hover:bg-crest-red-dark">
            Open chat
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-12 sm:px-8">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">How it works</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">Every answer comes from the school&apos;s own documents, and what you can see depends on who you are.</p>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">The journey of a question</h2>
          <ol className="mt-6 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`flex gap-4 rounded-2xl p-5 ${i === 2 ? "bg-crest-blue-soft" : "bg-field"}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${i === 2 ? "bg-crest-blue" : "bg-crest-red"}`}>{i + 1}</span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="mt-1 text-[15px] text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">The parts</h2>
          <div className="mt-6 grid items-center gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <Node tone="blue" title="Web app" lines={["Next.js + Tailwind", "Chat, sign-in, admin"]} />
            <Arrow label="HTTPS" />
            <Node tone="red" title="API" lines={["FastAPI (Python)", "Auth, approvals, search, chat"]} />
            <Arrow label="" />
            <div className="grid gap-2">
              <Node title="MongoDB Atlas" lines={["Users and roles", "Documents and vector chunks"]} />
              <Node title="Gemini · Groq" lines={["Embeddings and answers", "Groq steps in if Gemini is busy"]} />
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">Who sees what</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[420px] border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-sm text-muted">
                  <th className="px-5 pb-1 font-medium">Role</th>
                  {LEVELS.map((l) => (
                    <th key={l} className="px-3 pb-1 text-center font-medium">{l} documents</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((r) => (
                  <tr key={r.who} className="bg-field">
                    <td className="rounded-l-2xl px-5 py-4 font-semibold">{r.who}</td>
                    {r.sees.map((v, i) => (
                      <td key={i} className={`px-3 py-4 text-center ${i === 3 ? "rounded-r-2xl" : ""}`}>
                        {v ? <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700" aria-label="Can see">✓</span> : <span className="text-muted/50" aria-label="Cannot see">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">New accounts wait for an administrator to approve them before any private information is available.</p>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">Built to be trusted</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Passwords are hashed, never stored.",
              "The login cookie can't be read by page scripts.",
              "Suspending an account works immediately.",
              "Restricted text never reaches the AI or your browser.",
              "The AI must stay inside the retrieved passages.",
              "Instructions hidden in documents or questions are ignored.",
            ].map((t) => (
              <li key={t} className="rounded-2xl bg-field px-5 py-4 text-[15px]">{t}</li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">Built with</h2>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {STACK.map((s) => (
              <span key={s} className="rounded-full bg-crest-blue-soft px-4 py-2 text-sm font-semibold text-[#1d6bb3]">{s}</span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
