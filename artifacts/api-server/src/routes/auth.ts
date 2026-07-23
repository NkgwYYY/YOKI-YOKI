import { Router } from "express";
import bcrypt from "bcrypt";
import { createHash, randomInt } from "crypto";
import { db } from "@workspace/db";
import { users, passwordResetTokens } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { signToken } from "../lib/auth";

const authRouter = Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
authRouter.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "メールとパスワードを入力してください" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "パスワードは6文字以上にしてください" });
      return;
    }

    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "このメールアドレスはすでに登録されています" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [user] = await db
      .insert(users)
      .values({ email: email.toLowerCase(), passwordHash })
      .returning({ id: users.id, email: users.email });

    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch {
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// POST /api/auth/login
authRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "メールとパスワードを入力してください" });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user) {
      res.status(401).json({ error: "メールアドレスまたはパスワードが違います" });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: "メールアドレスまたはパスワードが違います" });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch {
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// POST /api/auth/forgot-password
// Generates a 6-digit code. In production you would email it; in dev it's
// returned in the response body as `devCode` so the UI can display it.
authRouter.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ error: "メールアドレスを入力してください" });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    // Always return 200 to avoid email enumeration
    if (!user) {
      res.json({ ok: true });
      return;
    }

    // Generate a 6-digit code
    const plainCode = String(randomInt(100000, 999999));
    const tokenHash = createHash("sha256").update(plainCode).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

    // In production: send email with plainCode here (e.g. via Resend / SendGrid)
    const isDev = process.env.NODE_ENV !== "production";
    res.json({ ok: true, ...(isDev ? { devCode: plainCode } : {}) });
  } catch {
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// POST /api/auth/reset-password
authRouter.post("/auth/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body as {
      email?: string; code?: string; newPassword?: string;
    };
    if (!email || !code || !newPassword) {
      res.status(400).json({ error: "すべての項目を入力してください" });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: "パスワードは6文字以上にしてください" });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user) {
      res.status(400).json({ error: "コードが無効か期限切れです" });
      return;
    }

    const tokenHash = createHash("sha256").update(code.trim()).digest("hex");
    const now = new Date();

    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          eq(passwordResetTokens.tokenHash, tokenHash),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, now),
        )
      )
      .limit(1);

    if (!row) {
      res.status(400).json({ error: "コードが無効か期限切れです（15分以内に入力してください）" });
      return;
    }

    // Mark used and update password in parallel
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await Promise.all([
      db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, row.id)),
      db.update(users).set({ passwordHash }).where(eq(users.id, user.id)),
    ]);

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

export default authRouter;
