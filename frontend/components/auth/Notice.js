const TONES = {
  error: "bg-red-50 text-crest-red-dark",
  info: "bg-amber-50 text-amber-900",
  success: "bg-emerald-50 text-emerald-800",
};

export default function Notice({ tone = "info", children }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ${TONES[tone]}`}
    >
      {children}
    </div>
  );
}
