import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const userData = pgTable("user_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserData = typeof userData.$inferSelect;
