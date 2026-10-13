export default function SubmitButton({ loading, disabled, children, loadingText }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-crest-red px-4 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-crest-red/30 transition hover:bg-crest-red-dark hover:shadow-crest-red/40 focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(181,34,43,0.35)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      {loading ? loadingText : children}
    </button>
  );
}
