"use client";

import ApprovalRow from "@/components/admin/ApprovalRow";
import { useAdmin } from "@/components/admin/AdminProvider";
import { Empty, PageTitle } from "@/components/admin/ui";

export default function ApprovalsPage() {
  const { users } = useAdmin();
  const pending = users.filter((u) => u.status === "pending");
  return (
    <>
      <PageTitle>Approvals</PageTitle>
      {pending.length === 0 ? (
        <Empty title="All caught up" />
      ) : (
        <ul className="space-y-3">
          {pending.map((u) => (
            <ApprovalRow key={u.id} user={u} />
          ))}
        </ul>
      )}
    </>
  );
}
