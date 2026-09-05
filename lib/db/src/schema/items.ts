import {
  boolean,
  check,
  doublePrecision,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const itemCategoryEnum = pgEnum("item_category", [
  "food",
  "accessory",
  "background",
  "voice",
]);

export const equipCategoryEnum = pgEnum("equip_category", [
  "accessory",
  "background",
  "voice",
]);

export const items = pgTable(
  "items",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: itemCategoryEnum("category").notNull(),
    cost: doublePrecision("cost").notNull(),
    assetUrl: text("asset_url").notNull(),
    posX: doublePrecision("pos_x").notNull().default(0),
    posY: doublePrecision("pos_y").notNull().default(0),
    scale: doublePrecision("scale").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("items_cost_nonnegative", sql`${table.cost} >= 0`),
    check("items_scale_positive", sql`${table.scale} > 0`),
  ],
);

export const userItemInventory = pgTable(
  "user_item_inventory",
  {
    userId: text("user_id").notNull(),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.itemId] })],
);

export const userItemEquipment = pgTable(
  "user_item_equipment",
  {
    userId: text("user_id").notNull(),
    category: equipCategoryEnum("category").notNull(),
    itemId: text("item_id").references(() => items.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.category] }),
    uniqueIndex("user_item_equipment_user_category_idx").on(
      table.userId,
      table.category,
    ),
  ],
);

export type Item = typeof items.$inferSelect;