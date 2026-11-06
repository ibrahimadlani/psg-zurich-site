import { NextIntlClientProvider } from "next-intl";
import { AdminShell } from "@/components/admin/shell/admin-shell";
import { clientMessages } from "@/i18n/client-messages";
import { ADMIN_NAMESPACES } from "@/i18n/client-namespaces";

/** The admin has its own frame (sidebar or bottom tabs) instead of the site's header and footer, and its own messages. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider messages={await clientMessages(ADMIN_NAMESPACES)}>
      <AdminShell>{children}</AdminShell>
    </NextIntlClientProvider>
  );
}
