import { AdminShell } from "@/components/admin/shell/admin-shell";

/** The admin has its own frame (sidebar or bottom tabs) instead of the site's header and footer. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
