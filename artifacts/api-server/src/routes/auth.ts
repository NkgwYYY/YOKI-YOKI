import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";
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
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

export default authRouter;
