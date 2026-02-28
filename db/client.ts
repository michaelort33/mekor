import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "@/db/schema";

declare global {
  var postgresSql: Sql | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}

function getSqlClient() {
  if (!global.postgresSql) {
    global.postgresSql = postgres(getDatabaseUrl(), {
      max: 10,
      // Neon pooler + serverless works best without prepared statements.
      prepare: false,
    });
  }

  return global.postgresSql;
}

export function getDb() {
  return drizzle(getSqlClient(), { schema });
}
