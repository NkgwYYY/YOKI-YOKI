import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const userData = pgTable("user_data", {
  id: serial("id").primaryKey(),
  // Clerk user id (e.g. "user_...")
  userId: text("user_id").notNull(),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserData = typeof userData.$inferSelect;
