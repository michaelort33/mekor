import { NextResponse } from "next/server";

import { ensureAdminApiSession } from "@/lib/admin/guard";
import { householdImportTemplateCsv, importHouseholdsFromCsv } from "@/lib/member-ops/csv";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";

export async function GET() {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await ensureAdminApiSession();
  if (auth) {
    return auth;
  }

  return new NextResponse(householdImportTemplateCsv(), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=household-import-template.csv",
    },
  });
}

export async function POST(request: Request) {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await ensureAdminApiSession();
  if (auth) {
    return auth;
  }

  const body = await request.text();
  if (!body.trim()) {
    return NextResponse.json({ error: "CSV body is required" }, { status: 400 });
  }

  const result = await importHouseholdsFromCsv(body);
  return NextResponse.json({ ok: true, result }, { status: 200 });
}
