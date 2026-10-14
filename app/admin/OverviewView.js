"use client";

import Link from "next/link";
import ApprovalRow from "@/components/admin/ApprovalRow";
import { useAdmin } from "@/components/admin/AdminProvider";
import { Empty, PageTitle, Pill } from "@/components/admin/ui";
import { agoFrom } from "@/lib/mockAdminData";

function Stat({ label, value, href, accent }) {
  const body = (
    <div className={`h-full rounded-2xl p-5 transition ${accent ? "bg-amber-100 hover:bg-amber-200/70" : "bg-field"}`}>
      <p className={`text-sm font-medium ${accent ? "text-amber-800" : "text-muted"}`}>{label}</p>
      <p className={`mt-2 text-4xl font-semibold tracking-tight ${accent ? "text-amber-900" : ""}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function OverviewPage() {
  const { users, docs } = useAdmin();
  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status === "approved").length;
  const privateDocs = docs.filter((d) => d.access !== "public").length;

  return (
    <>
      <PageTitle>Overview</PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Waiting for approval" value={pending.length} href="/admin/approvals" accent={pending.length > 0} />
        <Stat label="Active users" value={active} href="/admin/users" />
        <Stat label="Knowledge entries" value={docs.length} href="/admin/documents" />
        <Stat label="Private entries" value={privateDocs} href="/admin/documents" />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold">Waiting for approval</h2>
          {pending.length === 0 ? (
            <Empty title="All caught up" />
          ) : (
            <ul className="space-y-3">
              {pending.slice(0, 3).map((u) => (
                <ApprovalRow key={u.id} user={u} compact />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Recent knowledge</h2>
          <ul className="space-y-2">
            {docs.slice(0, 5).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl bg-field px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.title}</p>
                  <p className="text-xs text-muted">{agoFrom(d.createdAt)}</p>
                </div>
                <Pill kind={d.access} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
