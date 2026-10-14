import Logo from "@/components/Logo";

// Crest + school name lockup, centred. Reused on every page header.
export default function Brand({ size = 92, className = "" }) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <Logo size={size} />
      <p className="mt-4 text-xl font-semibold leading-tight">
        Kaizirege &amp; Kemebos
      </p>
      <p className="mt-0.5 text-sm font-semibold uppercase tracking-[0.18em] text-crest-red">
        AI Assistant
      </p>
    </div>
  );
}
