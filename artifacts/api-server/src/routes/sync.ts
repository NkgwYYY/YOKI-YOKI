import { Router } from "express";
import {
  userData,
  userItemEquipment,
  userItemInventory,
} from "@workspace/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";
import { ACCOUNT_STATE_KEY, SERVER_KEY_PREFIX, respondToDeletedAccount, withAccountTransaction } from '../lib/accountTransaction';

const syncRouter = Router();

// GET /api/sync — pull all user data
syncRouter.get("/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const rows = await withAccountTransaction(userId, tx =>
      tx.select().from(userData).where(eq(userData.userId, userId)));
    const data: Record<string, unknown> = {};
    for (const row of rows) {
      if (!row.key.startsWith(SERVER_KEY_PREFIX)) data[row.key] = row.value;
    }
    res.json({ data });
  } catch (error) {
    if (respondToDeletedAccount(error, res)) return;
    res.status(500).json({ error: "同期に失敗しました" });
  }
});

// PUT /api/sync — push all user data (upsert)
syncRouter.put("/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const data: unknown = req.body?.data;
    if (!data || typeof data !== "object" || Array.isArray(data) || Object.values(data).some(value => value === null)) {
      res.status(400).json({ error: "不正なデータです" });
      return;
    }

    const entries = Object.entries(data);
    if (entries.some(([key]) => key.startsWith(SERVER_KEY_PREFIX))) {
      res.status(400).json({ error: "不正なデータです" });
      return;
    }

    // One PostgreSQL statement is atomic for the complete snapshot. The existing
    // unique (user_id, key) index also resolves concurrent first-write races.
    await withAccountTransaction(userId, async tx => {
      if (!entries.length) return;
      await tx.insert(userData)
        .values(entries.map(([key, value]) => ({ userId, key, value })))
        .onConflictDoUpdate({
          target: [userData.userId, userData.key],
          set: { value: sql`excluded.value`, updatedAt: new Date() },
        });
    });

    res.json({ ok: true });
  } catch (error) {
    if (respondToDeletedAccount(error, res)) return;
    res.status(500).json({ error: "同期に失敗しました" });
  }
});

// DELETE /api/account — remove app content (retain only the deletion fence) before the client deletes
// the Clerk identity. Keeping this authenticated makes deletion self-service
// while preventing one user from deleting another user's records.
syncRouter.delete("/account", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    await withAccountTransaction(userId, async (tx) => {
      await tx.delete(userItemEquipment).where(eq(userItemEquipment.userId, userId));
      await tx.delete(userItemInventory).where(eq(userItemInventory.userId, userId));
      await tx.delete(userData).where(and(eq(userData.userId, userId), ne(userData.key, ACCOUNT_STATE_KEY)));
      await tx.update(userData).set({ value: { deleted: true }, updatedAt: new Date() })
        .where(and(eq(userData.userId, userId), eq(userData.key, ACCOUNT_STATE_KEY)));
    }, true);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "アカウントデータの削除に失敗しました" });
  }
});

export default syncRouter;
