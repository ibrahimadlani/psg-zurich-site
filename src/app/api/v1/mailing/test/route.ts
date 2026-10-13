import { apiHandler, ok, parseBody } from "@/lib/api";
import { sendMail } from "@/lib/mail";
import { renderDraft } from "@/lib/mailing/render";
import { SAMPLE_VALUES } from "@/lib/mailing/samples";
import { HttpError, requireRole } from "@/lib/permissions";
import { mailPreviewSchema as previewSchema } from "@/lib/validators";

/** Sends the email (example values, "[Test]" in the subject) to the admin's own address. */
export const POST = apiHandler(async (request) => {
  const session = await requireRole("admin");
  const input = await parseBody(request, previewSchema);
  const email = await renderDraft({ ...input, values: { ...SAMPLE_VALUES, firstName: session.user.name.split(" ")[0] ?? "" } });
  if (!email) throw new HttpError(404, "not_found", "Nothing to send.");
  await sendMail({ to: session.user.email, subject: `[Test] ${email.subject}`, react: email.react });
  return ok({ sentTo: session.user.email });
});
