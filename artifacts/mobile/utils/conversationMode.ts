export type ConversationMode = 'listen' | 'think';
export const conversationModes = [
  { id: 'listen' as const, label: '聞いてほしい', description: '気持ちを受け止めてほしいときに' },
  { id: 'think' as const, label: '一緒に考えたい', description: '今できることを、一つずつ' },
];

/** The selected preference is sent only with this request, never written over
 * the original message. Older servers also understand this explicit intent. */
export function applyConversationMode<T extends { role: string; content: string }>(messages: T[], mode: ConversationMode): T[] {
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'user') { lastUser = i; break; }
  const intent = mode === 'think'
    ? '一緒に考えたい。私が話した場面に合わせて、今できそうなことを一つ提案して。必要なら短く一つだけ聞いて。'
    : '今は聞いてほしい。アドバイスより、まず話を受け止めて。';
  return messages.map((message, i) => i === lastUser ? { ...message, content: `（今回のおはなしの希望：${intent}）\n${message.content}` } : { ...message });
}
