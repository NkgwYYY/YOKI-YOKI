import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const chatRouter = Router();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

chatRouter.post("/chat/message", async (req, res) => {
  try {
    const {
      messages = [],
      mascotName = "こころん",
      mascotStage = "kokoron",
    } = req.body as {
      messages: ChatMessage[];
      mascotName: string;
      mascotStage: string;
    };

    const stageDesc: Record<string, string> = {
      egg: "たまごから生まれたばかりの小さな存在",
      chick: "すこしずつ成長中のかわいい子",
      kokoron: "元気いっぱいで心が強くなってきた",
      master: "メンタルの達人、心の師匠",
    };

    const systemPrompt = `あなたは「${mascotName}」(${stageDesc[mascotStage] ?? "元気なキャラクター"})。メンタルトレーニングアプリのマスコット。
ルール: ユーザーの全発言を全力肯定。否定・批判・押しつけ禁止。「それでいいんだよ」スタンス。かわいい友達口調(絵文字OK)。2〜4文。必ず日本語。`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages: chatMessages,
    });

    const raw = response.choices[0]?.message?.content;
    const content = raw || "うん、聞いてるよ！";
    res.json({ content });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "チャットに失敗しました" });
  }
});

export default chatRouter;
