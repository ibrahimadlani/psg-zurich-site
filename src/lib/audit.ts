import "server-only";
import { db, type Transaction } from "@/db";
import { auditLog } from "@/db/schema";

type AuditEntry = {
  actorId: string | null;
  /** Dotted verb, e.g. "post.create". */
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

/** Pass the transaction (`tx`) so the audit row is written atomically with the change it describes. */
export async function writeAuditLog(entry: AuditEntry, executor: Transaction | typeof db = db) {
  await executor.insert(auditLog).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ?? null,
    ipAddress: entry.ipAddress?.slice(0, 45) ?? null,
  });
}

export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip");
}

/**
 * Client IP for rate limiting: the last x-forwarded-for entry, the one appended by the
 * hosting proxy. Earlier entries come from the client and can be forged at will.
 */
export function getProxiedClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded || headers.get("x-real-ip");
}
