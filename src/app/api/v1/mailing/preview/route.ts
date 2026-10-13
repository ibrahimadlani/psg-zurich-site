import { render } from "react-email";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { renderDraft } from "@/lib/mailing/render";
import { SAMPLE_VALUES } from "@/lib/mailing/samples";
import { HttpError, requireRole } from "@/lib/permissions";
import { mailPreviewSchema as previewSchema } from "@/lib/validators";


/** The email as it will look, with example values (shown in the admin editor). */
export const POST = apiHandler(async (request) => {
  await requireRole("admin");
  const input = await parseBody(request, previewSchema);
  const email = await renderDraft({ ...input, values: SAMPLE_VALUES });
  if (!email) throw new HttpError(404, "not_found", "Nothing to preview.");
  return ok({ subject: email.subject, html: await render(email.react) });
});
