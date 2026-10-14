import Link from "next/link";
import Brand from "@/components/Brand";

export const metadata = { title: "Page not found · Kaizerege & Kemebos AI Assistant" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-white px-6 text-center">
      <div>
        <Brand />
        <h1 className="mt-10 text-5xl font-semibold tracking-tight">404</h1>
        <p className="mt-2 text-lg text-muted">Page not found. Ukurasa haupatikani.</p>
        <Link href="/chat" className="mt-8 inline-block rounded-xl bg-crest-red px-8 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-crest-red/30 transition hover:bg-crest-red-dark">
          Back to chat
        </Link>
      </div>
    </main>
  );
}
