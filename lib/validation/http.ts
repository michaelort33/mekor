import { NextResponse } from "next/server";
import type { ZodError, ZodSchema } from "zod";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json<ApiErrorBody>(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status },
  );
}

export function badRequest(message: string, details?: unknown) {
  return jsonError(400, "bad_request", message, details);
}

export function unauthorized(message = "Authentication required") {
  return jsonError(401, "unauthorized", message);
}

export function forbidden(message = "You do not have access to this resource") {
  return jsonError(403, "forbidden", message);
}

export function notFound(message = "Resource not found") {
  return jsonError(404, "not_found", message);
}

export function conflict(message: string, details?: unknown) {
  return jsonError(409, "conflict", message, details);
}

export function rateLimited(message = "Too many requests, please slow down") {
  return jsonError(429, "rate_limited", message);
}

export function serverError(message = "Something went wrong on our end") {
  return jsonError(500, "internal_error", message);
}

export function flattenZodError(error: ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    fieldErrors[key] ??= [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

/**
 * Parses JSON body against a Zod schema. Returns either {data} or a 400 NextResponse.
 * Use early in route handlers:
 *
 *   const parsed = await parseBody(request, mySchema);
 *   if (parsed instanceof NextResponse) return parsed;
 *   const { data } = parsed;
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T } | NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return badRequest("Request body failed validation", flattenZodError(result.error));
  }
  return { data: result.data };
}

/** Parse a URLSearchParams object against a schema. Coerces strings to declared types. */
export function parseSearchParams<T>(
  params: URLSearchParams,
  schema: ZodSchema<T>,
): { data: T } | NextResponse {
  const obj: Record<string, string | string[]> = {};
  for (const key of params.keys()) {
    const all = params.getAll(key);
    obj[key] = all.length > 1 ? all : all[0];
  }
  const result = schema.safeParse(obj);
  if (!result.success) {
    return badRequest("Query parameters failed validation", flattenZodError(result.error));
  }
  return { data: result.data };
}
