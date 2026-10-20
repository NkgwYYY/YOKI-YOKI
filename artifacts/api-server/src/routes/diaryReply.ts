import {Router} from 'express';
import {openai} from '@workspace/integrations-openai-ai-server';
import {DIARY_REPLY_POLICY, parseDiaryReply, readDiaryInput} from '../lib/diaryReplyPolicy';

const router = Router();
const rates = new Map<string, {count:number;until:number}>();
router.post('/diary/reply', async (req, res) => {
  const input = readDiaryInput(req.body);
  if (!input) { res.status(400).json({error:'日記の内容を確認してね。'}); return; }
  const now = Date.now(), ip = req.ip || req.socket.remoteAddress || 'unknown';
  for (const [key, value] of rates) if (value.until <= now) rates.delete(key);
  const rate = rates.get(ip) ?? {count:0, until:now + 60_000};
  if (rates.size >= 5000 && !rates.has(ip) || ++rate.count > 6) {
    res.setHeader('Retry-After','60');res.status(429).json({error:'少し待ってから、もう一度返事を受け取ってね。'});return;
  }
  rates.set(ip,rate);
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 24_000);
  const cancel = () => controller.abort();
  res.on('close',cancel);
  try {
    const result = await openai.chat.completions.create({
      model:'gpt-5.6-terra', reasoning_effort:'none', max_completion_tokens:1400,
      response_format:{type:'json_object'},
      messages:[{role:'system',content:DIARY_REPLY_POLICY}, {role:'user',content:JSON.stringify(input)}],
    }, {signal:controller.signal,timeout:24_000,maxRetries:0});
    const reply = parseDiaryReply(result.choices[0]?.message?.content ?? '',input.text);
    if (!reply) {res.status(502).json({error:'返事をうまく書けませんでした。もう一度試してね。'});return;}
    res.json({reply});
  } catch {
    // Never log journal text, prompts, provider payloads or private errors.
    if (!res.destroyed) res.status(controller.signal.aborted?504:503).json({error:'今は返事を受け取れませんでした。日記は保存されています。'});
  } finally {clearTimeout(timer);res.off('close',cancel);}
});
export default router;
