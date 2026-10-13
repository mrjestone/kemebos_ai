import { SUGGESTIONS } from "@/lib/mockKnowledge";

export default function EmptyState({ session, onPick }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center py-8 text-center sm:py-12">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {session ? (
          <>
            Hello, <span className="text-crest-red">{session.name.split(" ")[0]}</span>
          </>
        ) : (
          "How can I help?"
        )}
      </h1>
      <p className="mt-3 text-lg text-muted">Karibu. Uliza chochote.</p>

      <div className="mt-8 grid w-full max-w-2xl gap-2.5 sm:mt-12 sm:gap-3 text-left sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            onClick={() => onPick(s.text)}
            className="group flex flex-row-reverse items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left sm:flex-col sm:items-start sm:justify-start sm:p-5 bg-field p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_32px_-12px_rgba(27,36,51,0.25)]"
          >
            <span
              className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                s.members ? "bg-amber-100 text-amber-800" : "bg-crest-blue-soft text-[#1d6bb3]"
              }`}
            >
              {s.members ? "Members" : "Public"}
            </span>
            <span className="text-[15px] font-medium leading-snug">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
