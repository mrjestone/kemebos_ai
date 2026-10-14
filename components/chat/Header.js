"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import UserMenu from "./UserMenu";

export default function Header({ session, ready, onSignOut, onNewChat }) {
  const inAdmin = usePathname().startsWith("/admin");
  return (
    <header className="relative z-10 bg-white shadow-[0_1px_16px_rgba(27,36,51,0.06)]">
      <div className="mx-auto flex h-[72px] w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link href="/chat" className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <Logo size={42} className="shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold min-[400px]:text-[15px] sm:text-base">Kaizirege &amp; Kemebos</span>
            <span className="mt-0.5 block whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-crest-red">
              AI Assistant
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
        {onNewChat && (
          <button
            onClick={onNewChat}
            aria-label="New chat"
            title="New chat"
            className="flex h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-muted transition hover:bg-field hover:text-ink sm:px-4"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">New chat</span>
          </button>
        )}
        {!ready ? (
          <span className="h-11 w-24" aria-hidden />
        ) : session ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {session.role === "admin" && (
              <Link
                href={inAdmin ? "/chat" : "/admin"}
                aria-label={inAdmin ? "Chat" : "Admin dashboard"}
                title={inAdmin ? "Chat" : "Admin dashboard"}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-crest-blue-soft px-3 text-sm font-semibold text-[#1d6bb3] transition hover:bg-crest-blue hover:text-white sm:px-4"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {inAdmin ? (
                    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
                  ) : (
                    <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
                  )}
                </svg>
                <span className="hidden sm:inline">{inAdmin ? "Chat" : "Admin"}</span>
              </Link>
            )}
            <UserMenu session={session} onSignOut={onSignOut} />
          </div>
        ) : (
          <Link
            href="/login"
            className="shrink-0 rounded-full bg-crest-red px-6 py-3 text-sm font-semibold text-white shadow-md shadow-crest-red/25 transition hover:bg-crest-red-dark"
          >
            Sign in
          </Link>
        )}
        </div>
      </div>
    </header>
  );
}
