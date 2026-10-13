"use client";

import { useEffect, useRef } from "react";

export default function Composer({ value, onChange, onSend, onStop, streaming }) {
  const ref = useRef(null);

  // Auto-grow up to ~6 lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming) onSend();
    }
  }

  const canSend = value.trim().length > 0;

  return (
    <div className="relative bg-white pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-white to-transparent" />
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-8">
      <div className="flex items-end gap-3 rounded-[28px] bg-field py-2.5 pl-5 pr-2 sm:pl-6 sm:pr-2.5 transition focus-within:bg-white focus-within:shadow-[0_0_0_2px_var(--color-crest-blue),0_8px_24px_-8px_rgba(63,143,217,0.45)]">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything…"
          aria-label="Message"
          className="max-h-40 flex-1 resize-none bg-transparent py-2.5 text-base outline-none placeholder:text-muted/60"
        />
        {streaming ? (
          <button
            onClick={onStop}
            aria-label="Stop"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-black"
          >
            <span className="h-3.5 w-3.5 rounded-sm bg-white" />
          </button>
        ) : (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-crest-red text-white shadow-md shadow-crest-red/30 transition hover:bg-crest-red-dark active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" />
            </svg>
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
