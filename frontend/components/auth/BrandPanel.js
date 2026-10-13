// Left-hand brand panel shared by every auth page (desktop only).
function Bubble({ who, children, className = "" }) {
  const mine = who === "user";
  if (!mine)
    return (
      <div className={`flex items-end gap-3 ${className}`}>
        <span
          aria-hidden
          className="mb-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-crest-blue text-[11px] font-bold text-white shadow-lg shadow-black/20"
        >
          AI
        </span>
        <div className="max-w-[18rem] rounded-3xl rounded-bl-lg bg-white px-5 py-3 text-[15px] leading-snug text-ink shadow-xl shadow-black/15">
          {children}
        </div>
      </div>
    );
  return (
    <div
      className={`ml-auto max-w-[18rem] rounded-3xl rounded-br-lg bg-crest-gold px-5 py-3 text-[15px] leading-snug text-crest-red-deep shadow-xl shadow-black/15 ${className}`}
    >
      {children}
    </div>
  );
}

export default function BrandPanel() {
  return (
    <section className="relative hidden overflow-hidden bg-gradient-to-br from-crest-red via-crest-red-dark to-crest-red-deep text-white lg:flex lg:flex-col lg:justify-center lg:p-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 h-[26rem] w-[26rem] rounded-full bg-crest-gold/25 blur-3xl"
      />

      <div className="relative">
        <h1 className="max-w-lg text-5xl font-semibold leading-[1.1] tracking-tight">
          Your school,
          <br />
          <span className="text-crest-gold">answered in seconds.</span>
        </h1>

        <div className="mt-12 space-y-4">
          <Bubble who="user" className="float-in [animation-delay:0.2s]">
            When is parents day?
          </Bubble>
          <Bubble who="bot" className="float-in [animation-delay:0.6s]">
            Parents day is on the last Saturday of term, from 9am at the main
            hall.
          </Bubble>
          <Bubble who="user" className="float-in [animation-delay:1s]">
            Naweza kulipa ada vipi?
          </Bubble>
        </div>
      </div>
    </section>
  );
}
