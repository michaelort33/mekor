import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INVALID_PAYLOAD"
  | "INTEGRATION_FAILED"
  | "INTERNAL";

export type ApiErrorBody = {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
};

const DEFAULT_STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INVALID_PAYLOAD: 400,
  INTEGRATION_FAILED: 502,
  INTERNAL: 500,
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  options?: { status?: number; details?: unknown },
) {
  const status = options?.status ?? DEFAULT_STATUS[code];
  const body: ApiErrorBody = { error: message, code };
  if (options?.details !== undefined) {
    body.details = options.details;
  }
  return NextResponse.json(body, { status });
}

export function unauthorized(message = "Unauthorized") {
  return apiError("UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden") {
  return apiError("FORBIDDEN", message);
}

export function notFound(message = "Not found") {
  return apiError("NOT_FOUND", message);
}

export function rateLimited(message = "Too many requests") {
  return apiError("RATE_LIMITED", message);
}

export function invalidPayload(details?: unknown, message = "Invalid payload") {
  return apiError("INVALID_PAYLOAD", message, { details });
}

export function internalError(message = "Unexpected error") {
  return apiError("INTERNAL", message);
}
