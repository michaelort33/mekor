import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import statusOverrides from "@/mirror-data/routes/status-overrides.json";

const STATUS_MAP = new Map<string, number>(
  (statusOverrides as Array<{ path: string; status: number }>).map((record) => [record.path, record.status]),
);

export function proxy(request: NextRequest) {
  const pathWithQuery = `${request.nextUrl.pathname}${request.nextUrl.search || ""}`;
  const status = STATUS_MAP.get(pathWithQuery) ?? STATUS_MAP.get(request.nextUrl.pathname);

  if (status === 400) {
    return new NextResponse("Bad Request", {
      status: 400,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
