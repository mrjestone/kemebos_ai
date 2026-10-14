"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "./AdminProvider";

export default function Tabs() {
  const pathname = usePathname();
  const { users } = useAdmin();
  const pending = users.filter((u) => u.status === "pending").length;
  const tabs = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/approvals", label: "Approvals", badge: pending },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/documents", label: "Knowledge" },
  ];
  return (
    <nav aria-label="Admin sections">
      <div className="flex w-full gap-0.5 rounded-2xl bg-field p-1.5 sm:w-fit sm:gap-1">
        {tabs.map((t) => {
          const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 sm:flex-none whitespace-nowrap rounded-xl px-2 py-2.5 text-[13px] font-semibold transition min-[400px]:px-3 min-[400px]:text-sm sm:gap-2 sm:px-4 ${
                active ? "bg-white text-crest-red shadow-md shadow-black/10" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-crest-red px-1.5 text-[11px] font-bold text-white">
                  {t.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
