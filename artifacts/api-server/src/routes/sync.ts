import { Router } from "express";
import {
  db,
  userData,
  userItemEquipment,
  userItemInventory,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const syncRouter = Router();

// GET /api/sync — pull all user data
syncRouter.get("/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const rows = await db.select().from(userData).where(eq(userData.userId, userId));
    const data: Record<string, unknown> = {};
    for (const row of rows) {
      data[row.key] = row.value;
    }
    res.json({ data });
  } catch {
    res.status(500).json({ error: "同期に失敗しました" });
  }
});

// PUT /api/sync — push all user data (upsert)
syncRouter.put("/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { data } = req.body as { data: Record<string, unknown> };
    if (!data || typeof data !== "object") {
      res.status(400).json({ error: "不正なデータです" });
      return;
    }

    const entries = Object.entries(data);
    if (entries.length === 0) {
      res.json({ ok: true });
      return;
    }

    for (const [key, value] of entries) {
      const existing = await db
        .select({ id: userData.id })
        .from(userData)
        .where(and(eq(userData.userId, userId), eq(userData.key, key)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(userData)
          .set({ value: value as any, updatedAt: new Date() })
          .where(and(eq(userData.userId, userId), eq(userData.key, key)));
      } else {
        await db.insert(userData).values({ userId, key, value: value as any });
      }
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "同期に失敗しました" });
  }
});

// DELETE /api/account — remove all app-owned data before the client deletes
// the Clerk identity. Keeping this authenticated makes deletion self-service
// while preventing one user from deleting another user's records.
syncRouter.delete("/account", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    await db.transaction(async (tx) => {
      await tx.delete(userItemEquipment).where(eq(userItemEquipment.userId, userId));
      await tx.delete(userItemInventory).where(eq(userItemInventory.userId, userId));
      await tx.delete(userData).where(eq(userData.userId, userId));
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "アカウントデータの削除に失敗しました" });
  }
});

export default syncRouter;
