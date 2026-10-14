"use client";

import { useState } from "react";
import { agoFrom } from "@/lib/mockAdminData";
import { useAdmin } from "./AdminProvider";
import { Avatar, GhostButton, PrimaryButton, SelectField } from "./ui";

const ROLES = [
  { value: "student", label: "Student", dot: "blue" },
  { value: "staff", label: "Staff", dot: "gold" },
];

export default function ApprovalRow({ user, compact = false }) {
  const { approveUser, rejectUser } = useAdmin();
  const [role, setRole] = useState(user.role);
  return (
    <li className={`flex flex-col gap-4 rounded-2xl bg-field p-4 sm:p-5 ${compact ? "" : "sm:flex-row sm:items-center"}`}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Avatar name={user.name} tone="gold" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="mt-0.5 text-xs text-muted">
            Requested <span className="capitalize">{user.role}</span> · {agoFrom(user.createdAt)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SelectField label={`Role for ${user.name}`} value={role} onChange={setRole} options={ROLES} className="min-w-36" />
        <PrimaryButton onClick={() => approveUser(user.id, role)}>Approve</PrimaryButton>
        <GhostButton tone="danger" onClick={() => rejectUser(user.id)}>
          Reject
        </GhostButton>
      </div>
    </li>
  );
}
