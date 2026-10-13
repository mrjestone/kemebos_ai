import AdminShell from "@/components/admin/AdminShell";

// The admin area is gated by a client-side session check, so navigating into it
// is not "instant" by design. Opt out of the dev-only validation for this segment.
export const instant = false;

export const metadata = { title: "Admin · Kaizerege & Kemebos AI Assistant" };

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
