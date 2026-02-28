import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as schema from "@/db/schema";

declare global {
  var mysqlPool: mysql.Pool | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}

function getPool() {
  if (!global.mysqlPool) {
    global.mysqlPool = mysql.createPool({
      uri: getDatabaseUrl(),
      connectionLimit: 10,
    });
  }

  return global.mysqlPool;
}

export function getDb() {
  return drizzle(getPool(), { schema, mode: "default" });
}
