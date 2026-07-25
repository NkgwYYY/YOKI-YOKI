import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, AuthRequest } from "../lib/auth";

const insightRouter = Router();

// Simple per-user daily rate limit (client also caches per day; this is abuse protection)
const DAILY_LIMIT = 10;
const usage = new Map<string, { date: string; count: number }>();
function allowRequest(userId: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const u = usage.get(userId);
  if (!u || u.date !== today) {
    usage.set(userId, { date: today, count: 1 });
    return true;
  }
  if (u.count >= DAILY_LIMIT) return false;
  u.count++;
  return true;
}

interface RecordSummary {
  date: string;
  mood: number;
  sleep: number;
  behaviors: string[];
  notes?: string;
}

interface InsightRequest {
  mascotName?: string;
  records?: RecordSummary[];
  progress?: {
    level: number;
    streak: number;
    totalDays: number;
  };
  checklist?: {
    todayDone: number;
    todayTotal: number;
  };
  badgeCount?: number;
}

/**
 * POST /api/insight
 * Analyzes the user's recent activity and returns 2-3 "hidden strengths"
 * — positive patterns the user likely hasn't noticed themselves.
 */
insightRouter.post("/insight", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user?.userId ?? "");
    if (!allowRequest(userId)) {
      res.status(429).json({ error: "daily limit reached" });
      return;
    }

    const {
      mascotName = "こころん",
      records = [],
      progress,
      checklist,
      badgeCount = 0,
    } = req.body as InsightRequest;

    if (!Array.isArray(records) || (records.length === 0 && !progress)) {
      res.status(400).json({ error: "no data" });
      return;
    }

    const recordLines = records
      .slice(-14)
      .map((r) => {
        const notes = (r.notes ?? "").slice(0, 80);
        return `${r.date}: 気分${r.mood}/5, 睡眠${r.sleep}h, 行動[${r.behaviors.join(",")}]${notes ? `, メモ「${notes}」` : ""}`;
      })
      .join("\n");

    const systemPrompt = `あなたはメンタルケアアプリのマスコット「${mascotName}」。ユーザーの記録データを分析して、**本人が気づいていない頑張り・強み・良い変化**を見つけて伝える役割。

【重要な方針】
- 表面的な褒め言葉（「毎日えらい！」など誰にでも言えること）は禁止。データの中の具体的なパターンを根拠にする
- 例: 「気分が低い日でも◯◯だけは続けてる」「睡眠が短い翌日も記録をサボってない」「メモの言葉が前向きに変わってきてる」「気分が落ちても2日以内に戻る回復力がある」
- 本人が「言われてみれば確かに…！」と思える発見であること
- 口調はタメ口・友達感覚（「〜だよ」「〜だね」）、温かく、でも大げさすぎない
- 必ず日本語

【出力形式】
次のJSONのみを出力（コードブロック記号なし）:
{"insights":[{"emoji":"✨","title":"短い見出し(15字以内)","body":"具体的な根拠を含む2〜3文"}]}
insightsは2〜3個。`;

    const userPrompt = `【ユーザーのデータ】
${progress ? `レベル${progress.level} / 連続記録${progress.streak}日 / 累計記録${progress.totalDays}日 / バッジ${badgeCount}個` : ""}
${checklist ? `今日のチェックリスト: ${checklist.todayDone}/${checklist.todayTotal}完了` : ""}
直近の記録:
${recordLines || "（記録なし）"}

このデータから、本人が気づいていなさそうな頑張り・強みを見つけて。`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.6-terra",
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    // Be lenient: extract the outermost {...} block in case the model wraps it
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) {
      res.status(502).json({ error: "bad ai response" });
      return;
    }
    let parsed: { insights?: { emoji?: string; title?: string; body?: string }[] };
    try {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      res.status(502).json({ error: "bad ai response" });
      return;
    }
    const insights = (parsed.insights ?? [])
      .filter((i) => i.title && i.body)
      .slice(0, 3)
      .map((i) => ({
        emoji: i.emoji || "✨",
        title: String(i.title),
        body: String(i.body),
      }));

    if (insights.length === 0) {
      res.status(502).json({ error: "no insights" });
      return;
    }
    res.json({ insights });
  } catch (err) {
    console.error("insight error:", err);
    res.status(500).json({ error: "internal error" });
  }
});

export default insightRouter;
