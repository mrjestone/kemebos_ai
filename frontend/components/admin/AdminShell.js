"use client";

import Link from "next/link";
import Header from "@/components/chat/Header";
import AdminProvider, { useAdmin } from "./AdminProvider";
import Tabs from "./Tabs";
import Toast from "./Toast";

function Guard({ children }) {
  const { session, ready, signOut } = useAdmin();

  if (!ready) return <div className="min-h-dvh bg-white" />;

  if (session?.role !== "admin") {
    return (
      <div className="flex min-h-dvh flex-col bg-white">
        <Header session={session} ready onSignOut={signOut} />
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Admins only</h1>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/chat" className="rounded-xl bg-crest-blue-soft px-6 py-3.5 text-[15px] font-semibold text-[#1d6bb3] transition hover:bg-crest-blue hover:text-white">
                Back to chat
              </Link>
              {!session && (
                <Link href="/login" className="rounded-xl bg-crest-red px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-crest-red/30 transition hover:bg-crest-red-dark">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white">
      <Header session={session} ready onSignOut={signOut} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-8">
        <Tabs />
        <div className="mt-8">{children}</div>
      </main>
      <Toast />
    </div>
  );
}

export default function AdminShell({ children }) {
  return (
    <AdminProvider>
      <Guard>{children}</Guard>
    </AdminProvider>
  );
}
