export type ReferenceTopic='none'|'self-care'|'urgent-support';
const SOURCES={
 'self-care':{title:'厚生労働省「こころと体のセルフケア」',url:'https://www.mhlw.go.jp/kokoro/youth/stress/self/index.html'},
 'urgent-support':{title:'厚生労働省「まもろうよ こころ」',url:'https://www.mhlw.go.jp/mamorouyokokoro/'},
};
export function conversationPacing(messages:readonly {role:string;content:string}[]){
 const recent=messages.filter(m=>m.role==='assistant').slice(-2);
 const asked=recent.some(m=>/[?？]|(?:教えて|聞かせて|どうだった|どう思う)/.test(m.content));
 return asked
  ? '直近の返答ですでに問いかけています。今回は質問や「教えて」「聞かせて」で返事を求めず、具体的な相づち・感想・共感で自然に終えてください。差し迫った危険の安全確認や、依頼を実行するために不可欠な確認だけは例外です。'
  : '基本は相づち・感想・共感だけで自然に終えてください。質問は、ユーザーが一緒に考えることを求めていて答えに必要な情報が足りないときなど、本当に役立つ場合に一つまで。会話を続けるためだけの質問は不要です。';
}
export const CHAT_OUTPUT_POLICY=`
【返答の形式】
JSONオブジェクトで返す。content はユーザーに見せる自然な日本語の返答。referenceTopic は次の3つから選ぶ。
- none: 普段の雑談、出来事の共有、共感、励まし、お祝い、疲れた・悲しいという気持ちへの相づち。これが基本。単なる休憩の誘いにも医学的な参考情報は不要。
- self-care: 心身の症状、ストレスや睡眠について、一般的な健康情報・医学的説明・具体的なセルフケアを説明した返答。単に健康関連の単語が出ただけでは選ばない。
- urgent-support: 自傷などの危機に対して、緊急の安全確保や相談先を具体的に案内した返答。
表示できる参考情報は厚生労働省の「こころと体のセルフケア」と「まもろうよ こころ」。これらを実際に検索・閲覧したと主張しない。提供されていない資料を根拠として引用しない。本文にURL・出典一覧を加えない。参考情報は話題に合う場合のみアプリ側が表示する。
例: {"content":"あの発表、最後までやりきったんだね。今日は肩の力を抜いて、のんびりしよう。","referenceTopic":"none"}`;

export function parseChatReply(raw:string){
 const value=JSON.parse(raw) as {content?:unknown;referenceTopic?:unknown};
 if(!value||typeof value.content!=='string'||!value.content.trim())throw Error('Empty chat reply');
 const topic:ReferenceTopic=value.referenceTopic==='self-care'||value.referenceTopic==='urgent-support'?value.referenceTopic:'none';
 return {content:value.content.trim(),citations:topic==='none'?[]:[SOURCES[topic]],sourcePolicyVersion:2 as const};
}
