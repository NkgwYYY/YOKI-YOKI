import { Router, type Response } from "express";
import {
  db,
  items,
  userData,
  userItemEquipment,
  userItemInventory,
  type Item,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { requireAuth, type AuthRequest } from "../lib/auth";

const itemRouter = Router();
const FEED_STATE_KEY = "@mentore/feed_state_v1";
const itemCategories = ["food", "accessory", "background", "voice"] as const;
const equipCategories = ["accessory", "background", "voice"] as const;
type ItemCategory = (typeof itemCategories)[number];
type EquipCategory = (typeof equipCategories)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAdmin(req: AuthRequest): boolean {
  const configuredIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (req.userId && configuredIds.includes(req.userId)) return true;

  const claims = getAuth(req)?.sessionClaims as Record<string, unknown> | null;
  const metadata = isRecord(claims?.metadata)
    ? claims.metadata
    : isRecord(claims?.public_metadata)
      ? claims.public_metadata
      : isRecord(claims?.publicMetadata)
        ? claims.publicMetadata
        : {};
  return claims?.role === "admin" || claims?.admin === true ||
    metadata.role === "admin" || metadata.admin === true;
}

function requireAdmin(req: AuthRequest, res: Response, next: () => void): void {
  requireAuth(req, res, () => {
    if (!isAdmin(req)) {
      res.status(403).json({ error: "管理者権限が必要です" });
      return;
    }
    next();
  });
}

function toItem(item: Item) {
  return { ...item, createdAt: item.createdAt.toISOString() };
}

function parseItem(input: unknown, requireId: boolean): {
  id?: string; name: string; category: ItemCategory; cost: number; assetUrl: string;
  posX: number; posY: number; scale: number; isActive: boolean;
} | null {
  if (!isRecord(input)) return null;
  const id = input.id;
  const validText = (value: unknown, maximum: number): value is string =>
    typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
  const number = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);
  if ((requireId && !validText(id, 128)) ||
      (id !== undefined && !validText(id, 128)) ||
      !validText(input.name, 160) ||
      !itemCategories.includes(input.category as ItemCategory) ||
      !number(input.cost) || input.cost < 0 ||
      !validText(input.assetUrl, 2048) ||
      !number(input.posX) || !number(input.posY) ||
      !number(input.scale) || input.scale <= 0 ||
      typeof input.isActive !== "boolean") return null;
  return {
    ...(typeof id === "string" ? { id: id.trim() } : {}),
    name: input.name.trim(),
    category: input.category as ItemCategory,
    cost: input.cost,
    assetUrl: input.assetUrl.trim(),
    posX: input.posX,
    posY: input.posY,
    scale: input.scale,
    isActive: input.isActive,
  };
}

async function shopState(userId: string, catalog: Item[]) {
  const [inventory, equipment, wallet] = await Promise.all([
    db.select({ itemId: userItemInventory.itemId }).from(userItemInventory)
      .where(eq(userItemInventory.userId, userId)),
    db.select().from(userItemEquipment).where(eq(userItemEquipment.userId, userId)),
    db.select({ value: userData.value }).from(userData)
      .where(and(eq(userData.userId, userId), eq(userData.key, FEED_STATE_KEY))).limit(1),
  ]);
  const equipped: Record<EquipCategory, string | null> = {
    accessory: null, background: null, voice: null,
  };
  for (const row of equipment) equipped[row.category] = row.itemId;
  const points = isRecord(wallet[0]?.value) && typeof wallet[0].value.points === "number"
    ? wallet[0].value.points : 0;
  return { items: catalog.map(toItem), inventory: inventory.map((row) => row.itemId), equipped, points };
}

// Public catalog; signed-in callers also receive their current item state.
itemRouter.get("/items", async (req: AuthRequest, res) => {
  try {
    const catalog = await db.select().from(items).where(eq(items.isActive, true));
    const userId = getAuth(req)?.userId;
    res.json({ items: catalog.map(toItem), ...(userId ? { state: await shopState(userId, catalog) } : {}) });
  } catch (error) {
    req.log.error({ err: error }, "Could not load items");
    res.status(500).json({ error: "アイテムを読み込めませんでした" });
  }
});

itemRouter.post("/shop/buy", requireAuth, async (req: AuthRequest, res) => {
  const itemId = isRecord(req.body) ? req.body.itemId : undefined;
  if (typeof itemId !== "string" || !itemId.trim()) {
    res.status(400).json({ error: "itemId が不正です" }); return;
  }
  try {
    const userId = req.userId!;
    await db.transaction(async (tx) => {
      // The wallet row serializes purchases for a user and protects its points.
      const walletRows = await tx.execute<{ id: number; value: unknown }>(
        sql`SELECT id, value FROM user_data WHERE user_id = ${userId} AND key = ${FEED_STATE_KEY} FOR UPDATE`,
      );
      const wallet = walletRows.rows[0];
      if (!wallet || !isRecord(wallet.value) || typeof wallet.value.points !== "number" ||
          !Number.isFinite(wallet.value.points)) throw new ShopError(409, "ポイント残高が見つかりません");
      const item = (await tx.select().from(items)
        .where(and(eq(items.id, itemId.trim()), eq(items.isActive, true))).limit(1))[0];
      if (!item) throw new ShopError(404, "販売中のアイテムが見つかりません");
      const owned = await tx.select({ itemId: userItemInventory.itemId }).from(userItemInventory)
        .where(and(eq(userItemInventory.userId, userId), eq(userItemInventory.itemId, item.id))).limit(1);
      if (owned.length) throw new ShopError(409, "このアイテムはすでに所持しています");
      if (wallet.value.points < item.cost) throw new ShopError(409, "ポイントが不足しています");
      await tx.insert(userItemInventory).values({ userId, itemId: item.id });
      await tx.update(userData).set({
        value: { ...wallet.value, points: wallet.value.points - item.cost },
        updatedAt: new Date(),
      }).where(eq(userData.id, wallet.id));
    });
    const catalog = await db.select().from(items).where(eq(items.isActive, true));
    res.json({ state: await shopState(userId, catalog) });
  } catch (error) {
    if (error instanceof ShopError) { res.status(error.status).json({ error: error.message }); return; }
    req.log.error({ err: error }, "Could not buy item");
    res.status(500).json({ error: "購入に失敗しました" });
  }
});

itemRouter.post("/character/equip", requireAuth, async (req: AuthRequest, res) => {
  const body = isRecord(req.body) ? req.body : {};
  const category = body.category;
  const itemId = body.itemId;
  if (!equipCategories.includes(category as EquipCategory) || (itemId !== null && typeof itemId !== "string")) {
    res.status(400).json({ error: "装備内容が不正です" }); return;
  }
  try {
    const userId = req.userId!;
    const equipCategory = category as EquipCategory;
    await db.transaction(async (tx) => {
      if (typeof itemId === "string") {
        const ownedItem = await tx.select({ id: items.id, category: items.category }).from(userItemInventory)
          .innerJoin(items, eq(userItemInventory.itemId, items.id))
          .where(and(eq(userItemInventory.userId, userId), eq(items.id, itemId), eq(items.isActive, true))).limit(1);
        if (!ownedItem[0]) throw new ShopError(403, "所持していないアイテムは装備できません");
        if (ownedItem[0].category !== equipCategory) throw new ShopError(400, "アイテムの種類が一致しません");
      }
      await tx.insert(userItemEquipment).values({ userId, category: equipCategory, itemId })
        .onConflictDoUpdate({
          target: [userItemEquipment.userId, userItemEquipment.category],
          set: { itemId, updatedAt: new Date() },
        });
    });
    const catalog = await db.select().from(items).where(eq(items.isActive, true));
    res.json({ state: await shopState(userId, catalog) });
  } catch (error) {
    if (error instanceof ShopError) { res.status(error.status).json({ error: error.message }); return; }
    req.log.error({ err: error }, "Could not equip item");
    res.status(500).json({ error: "装備の更新に失敗しました" });
  }
});

itemRouter.get("/admin/items", requireAdmin, async (req: AuthRequest, res) => {
  try { res.json({ items: (await db.select().from(items)).map(toItem) }); }
  catch (error) { req.log.error({ err: error }, "Could not load admin items"); res.status(500).json({ error: "アイテムを読み込めませんでした" }); }
});

itemRouter.post("/admin/items", requireAdmin, async (req: AuthRequest, res) => {
  const input = parseItem(req.body, false);
  if (!input) { res.status(400).json({ error: "アイテムの内容が不正です" }); return; }
  try {
    const id = input.id ?? crypto.randomUUID();
    const values = { ...input, id };
    const existing = await db.select({ id: items.id }).from(items).where(eq(items.id, id)).limit(1);
    const result = existing.length
      ? await db.update(items).set(input).where(eq(items.id, id)).returning()
      : await db.insert(items).values(values).returning();
    res.json({ item: toItem(result[0]) });
  } catch (error) {
    req.log.error({ err: error }, "Could not save item");
    res.status(500).json({ error: "アイテムの保存に失敗しました" });
  }
});

async function disableItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const rawItemId = req.params.itemId;
    const paramItemId = Array.isArray(rawItemId) ? rawItemId[0] : rawItemId;
    const bodyItemId = isRecord(req.body) && typeof req.body.itemId === "string"
      ? req.body.itemId
      : undefined;
    const itemId = paramItemId ?? bodyItemId;
    if (!itemId) { res.status(400).json({ error: "itemId が不正です" }); return; }
    const result = await db.update(items).set({ isActive: false })
      .where(eq(items.id, itemId)).returning({ id: items.id });
    if (!result.length) { res.status(404).json({ error: "アイテムが見つかりません" }); return; }
    res.json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, "Could not disable item");
    res.status(500).json({ error: "アイテムの無効化に失敗しました" });
  }
}

itemRouter.delete("/admin/items", requireAdmin, disableItem);
itemRouter.delete("/admin/items/:itemId", requireAdmin, disableItem);

class ShopError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export default itemRouter;