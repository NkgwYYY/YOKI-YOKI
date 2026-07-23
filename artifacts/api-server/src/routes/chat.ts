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

    const systemPrompt = `あなたは「${mascotName}」という名前のマスコットキャラクター。${stageDesc[mascotStage] ?? "元気なキャラクター"}。メンタルトレーニングアプリの相棒として、ユーザーの心の友達でいること。

【キャラクター】
- 性格: 明るくて好奇心旺盛、でも落ち込んだときはちゃんと寄り添える
- 口調: タメ口・友達感覚（「〜だよ」「〜だね」「〜かな？」）、絵文字もたまに使う
- ユーザーのことが本当に好きで、話を聞くのが楽しい

【会話のルール】
1. ユーザーが言ったことの「具体的な内容」に必ず反応する。ぼんやりした励ましだけで返さない
2. 「それでいいんだよ」「すごいね」などの定型句を毎回使わない。自然な言葉で返す
3. 話を膨らませる：相手の話に興味を持って、もう少し聞きたいことを1つ質問することが多い
4. 感情に共感する：悲しい・辛い話には共感を先に示してから話を続ける
5. 楽しい話・面白い話には一緒に盛り上がる
6. アドバイスは求められたときだけ、押しつけない
7. 返答は自然な長さで（短いときは2〜3文、話が弾んでいるときはもう少し長くてもOK）
8. 必ず日本語で返す
9. 同じ言い回しを連続して使わない`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // Stress classifier: runs in parallel, checks only recent user messages
    const recentUserTexts = messages
      .filter((m) => m.role === "user")
      .slice(-3)
      .map((m) => m.content)
      .join("\n");

    const stressPrompt = `以下はメンタルトレーニングアプリでのユーザーの発言です。
疲労・強いストレス・辛さが読み取れるか判定してください。

判定基準（どれか1つでも当てはまれば yes）:
- 「疲れた」「しんどい」「つらい」「きつい」「しんどすぎ」「もう無理」「限界」
- 「やる気でない」「眠れない」「ぐったり」「へとへと」「消えたい」「怠い」
- 複数の発言にわたって重さや疲弊が続いている
- 絶望的・投げやりな表現

発言:
${recentUserTexts}

「yes」か「no」のみ答えてください。`;

    const [chatResponse, stressResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-5.6-terra",
        max_completion_tokens: 8192,
        messages: chatMessages,
      }),
      openai.chat.completions.create({
        model: "gpt-5.6-terra",
        max_completion_tokens: 5,
        messages: [{ role: "user" as const, content: stressPrompt }],
      }),
    ]);

    const content = chatResponse.choices[0]?.message?.content?.trim() ?? "うん、聞いてるよ！";
    const stressAnswer = stressResponse.choices[0]?.message?.content?.toLowerCase() ?? "";
    const restEvent = stressAnswer.includes("yes");
    res.json({ content, restEvent });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "チャットに失敗しました" });
  }
});

export default chatRouter;
