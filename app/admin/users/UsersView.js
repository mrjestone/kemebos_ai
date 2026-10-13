"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { Avatar, GhostButton, PageTitle, Pill, PrimaryButton, SelectField } from "@/components/admin/ui";
import { ago } from "@/lib/mockAdminData";

const FILTERS = [
  { id: "all", label: "All", test: () => true },
  { id: "student", label: "Students", test: (u) => u.role === "student" && u.status === "approved" },
  { id: "staff", label: "Staff", test: (u) => u.role === "staff" && u.status === "approved" },
  { id: "admin", label: "Admins", test: (u) => u.role === "admin" },
  { id: "pending", label: "Pending", test: (u) => u.status === "pending" },
  { id: "suspended", label: "Suspended", test: (u) => u.status === "suspended" || u.status === "rejected" },
];

const ROLES = [
  { value: "student", label: "Student", dot: "blue" },
  { value: "staff", label: "Staff", dot: "gold" },
  { value: "admin", label: "Admin", dot: "red" },
];

export default function UsersPage() {
  const { users, setUserRole, approveUser, suspendUser, reactivateUser } = useAdmin();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const test = FILTERS.find((f) => f.id === filter).test;
  const q = query.trim().toLowerCase();
  const shown = users.filter((u) => test(u) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));

  return (
    <>
      <PageTitle>Users</PageTitle>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email"
        aria-label="Search users"
        className="w-full rounded-xl bg-field px-4 py-3.5 text-base outline-none transition placeholder:text-muted/60 focus:bg-white focus:shadow-[0_0_0_2px_var(--color-crest-blue),0_8px_24px_-8px_rgba(63,143,217,0.45)]"
      />

      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                filter === f.id ? "bg-crest-red text-white shadow-md shadow-crest-red/25" : "bg-field text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {shown.map((u) => (
          <li key={u.id} className="flex flex-col gap-4 rounded-2xl bg-field p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Avatar name={u.name} tone={u.role === "admin" ? "red" : u.role === "staff" ? "gold" : "blue"} />
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {u.name} {u.isYou && <span className="font-normal text-muted">(you)</span>}
                </p>
                <p className="truncate text-sm text-muted">{u.isYou ? "Signed in" : `${u.email} · ${ago(u.minutesAgo)}`}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill kind={u.status} />
              <SelectField
                label={`Role for ${u.name}`}
                value={u.role}
                disabled={u.isYou || u.status !== "approved"}
                onChange={(role) => setUserRole(u.id, role)}
                options={ROLES}
                className="min-w-36"
              />
              {u.isYou ? null : u.status === "approved" ? (
                <GhostButton tone="danger" onClick={() => suspendUser(u.id)}>
                  Suspend
                </GhostButton>
              ) : u.status === "suspended" ? (
                <GhostButton onClick={() => reactivateUser(u.id)}>Reactivate</GhostButton>
              ) : (
                <PrimaryButton onClick={() => approveUser(u.id, u.role === "admin" ? "student" : u.role)}>Approve</PrimaryButton>
              )}
            </div>
          </li>
        ))}
        {shown.length === 0 && <li className="rounded-2xl bg-field px-6 py-12 text-center text-muted">No users found</li>}
      </ul>
    </>
  );
}
