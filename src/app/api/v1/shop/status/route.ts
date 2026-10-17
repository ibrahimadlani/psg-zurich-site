import { connection } from "next/server";
import { apiHandler, ok } from "@/lib/api";
import { shopIsOpen } from "@/lib/payments/shop";

/** Whether the shop shows in the menu (open and with something on sale). */
export const GET = apiHandler(async () => {
  await connection();
  return ok({ open: await shopIsOpen() });
});
