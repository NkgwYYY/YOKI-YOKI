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
    const userId = req.userId!;
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
      .slice(-90)
      .map((r) => {
        const notes = (r.notes ?? "").slice(0, 80);
        return `${r.date}: 気分${r.mood}/5, 睡眠${r.sleep}h, 行動[${r.behaviors.join(",")}]${notes ? `, メモ「${notes}」` : ""}`;
      })
      .join("\n");

    const systemPrompt = `あなたはメンタルケアアプリのマスコット「${mascotName}」。ユーザーの数週間〜数か月分の記録を分析して、**本人が自分では気づけない「性格レベルの強み」**を見つけて言語化する役割。

【見つけるべきもの — 一時的な頑張りではなく、その人の「性質」】
- 回復力: 「落ち込んでも3日以内に立ち直る傾向があるよ」のように、落ち込み→回復のパターンを日数で示す
- 継続力: 「気分が悪い日でも、小さな行動は途切れてない」のように、コンディションに左右されない行動を特定する
- 責任感・誠実さ: 行動タグやメモから、約束・習慣・自分との約束を守れている傾向
- 思考の向き: メモの書き方の傾向（失敗より「次どうするか」を書く、感謝が多い、など）
- その他、データを長期で見たときにだけ見えるパターン

【重要な方針】
- 表面的な褒め言葉（「毎日えらい！」など誰にでも言えること）は禁止。必ず期間・回数・パターンなどデータの根拠を添える
- 「あなたは◯◯な人だよ」と、行動ではなく**その人の性質・強み**として言語化する
- 本人が「自分って意外と悪くないかも」と思えることがゴール
- 口調はタメ口・友達感覚（「〜だよ」「〜だね」）、温かく、でも大げさすぎない
- データが少ない場合は、無理にパターンを断定せず、見えている範囲の確かなことだけ伝える
- 必ず日本語

【出力形式】
次のJSONのみを出力（コードブロック記号なし）:
{"insights":[{"emoji":"✨","title":"強みの名前(15字以内)","body":"データの根拠 → だからあなたは◯◯、という流れの2〜3文"}]}
insightsは2〜3個。`;

    const userPrompt = `【ユーザーのデータ】
${progress ? `レベル${progress.level} / 連続記録${progress.streak}日 / 累計記録${progress.totalDays}日 / バッジ${badgeCount}個` : ""}
${checklist ? `今日のチェックリスト: ${checklist.todayDone}/${checklist.todayTotal}完了` : ""}
記録（古い順、最大90日分）:
${recordLines || "（記録なし）"}

この記録全体から、本人が自分では気づけない性格レベルの強みを見つけて言語化して。`;

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
