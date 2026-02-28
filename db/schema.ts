import { mysqlTable, serial, timestamp, varchar } from "drizzle-orm/mysql-core";

export const guests = mysqlTable("guests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

