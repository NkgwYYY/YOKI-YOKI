import { Router } from "express";
import { db, userData } from "@workspace/db";
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

export default syncRouter;
