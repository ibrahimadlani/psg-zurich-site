import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/permissions";

export type ApiError = { code: string; message: string; details?: unknown };
export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResponse<T>>({ data, error: null }, init);
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json<ApiResponse<never>>(
    { data: null, error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

/** Wraps a route handler so every error ends up as a `{ data: null, error }` JSON response. */
export function apiHandler(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof HttpError) return fail(error.status, error.code, error.message);
      if (error instanceof z.ZodError) {
        return fail(400, "validation_error", "Invalid request.", z.flattenError(error));
      }
      if (error instanceof SyntaxError) return fail(400, "invalid_json", "Malformed JSON body.");
      if (isDuplicateEntry(error)) return fail(409, "conflict", "Resource already exists.");
      console.error(error);
      return fail(500, "internal_error", "Internal server error.");
    }
  };
}

function isDuplicateEntry(error: unknown) {
  const cause = error instanceof Error && "cause" in error ? error.cause : error;
  return (cause as { code?: string } | undefined)?.code === "ER_DUP_ENTRY";
}

export async function parseBody<T extends z.ZodType>(request: NextRequest, schema: T) {
  return schema.parse(await request.json()) as z.infer<T>;
}

export function parseQuery<T extends z.ZodType>(request: NextRequest, schema: T) {
  return schema.parse(Object.fromEntries(request.nextUrl.searchParams)) as z.infer<T>;
}
