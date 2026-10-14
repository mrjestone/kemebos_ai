import Link from "next/link";
import { useState } from "react";
import Inspector from "./Inspector";

const DOT = { public: "bg-crest-blue", student: "bg-crest-gold", staff: "bg-crest-red", admin: "bg-ink" };

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-2" aria-label="Thinking">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-2 w-2 animate-bounce rounded-full bg-crest-blue/60"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}

const ERRORS = {
  llm_unavailable: "The assistant is busy right now.",
  search_unavailable: "Search is temporarily unavailable.",
  network: "Connection problem. Check your internet.",
  server_error: "Something went wrong.",
  validation: "That message couldn't be sent.",
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <button onClick={copy} className="rounded-full px-1 py-1.5 text-xs font-semibold text-muted transition hover:text-ink">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function Message({ message, streaming, onRetry }) {
  if (message.role === "user") {
    return (
      <div className="float-in flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-md bg-crest-gold px-5 py-3.5 text-base leading-relaxed text-crest-red-deep sm:max-w-[75%]">
          {message.text}
        </p>
      </div>
    );
  }

  return (
    <div className="float-in flex items-start gap-4">
      <span
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-crest-blue text-[11px] font-bold text-white"
      >
        AI
      </span>
      <div className="min-w-0 flex-1 pt-1">
        {message.text ? (
          <p className="whitespace-pre-wrap break-words text-base leading-[1.75]">
            {message.text}
            {streaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-crest-red align-middle" />
            )}
          </p>
        ) : (
          <TypingDots />
        )}

        {message.error && (
          <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-crest-red-dark">
            <span>{ERRORS[message.error] ?? ERRORS.server_error}</span>
            <button onClick={onRetry} className="rounded-full bg-white px-3.5 py-1.5 font-semibold shadow-sm transition hover:shadow-md">
              Try again
            </button>
          </div>
        )}

        {message.denied === "login" && (
          <Link
            href="/login"
            className="mt-4 inline-block rounded-full bg-crest-red px-4 py-2 text-sm font-semibold text-white shadow-md shadow-crest-red/25 transition hover:bg-crest-red-dark"
          >
            Sign in
          </Link>
        )}

        {!streaming && message.sources?.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Sources</span>
            {message.sources.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-field px-3 py-1 text-xs font-medium"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${DOT[s.access]}`} />
                {s.title}
                <span className="capitalize text-muted">· {s.access}</span>
              </span>
            ))}
          </div>
        )}
        {!streaming && message.text && !message.error && (
          <div className="mt-2 flex items-center gap-2">
            <CopyButton text={message.text} />
          </div>
        )}

        {!streaming && message.inspector && (
          <Inspector inspector={message.inspector} sources={message.sources ?? []} provider={message.provider} totalMs={message.totalMs} />
        )}
      </div>
    </div>
  );
}
