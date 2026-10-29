// Display only app-owned messages, never a provider's raw error or headers.
const messages: Record<string, string> = {
  CHAT_TIMEOUT: '返事に時間がかかっています。もう一度試せます。',
  CHAT_UNAVAILABLE: '今はおはなしに接続できません。少し時間をおいてお試しください。',
  CHAT_BUSY: '今はおはなしが混み合っています。少し時間をおいてお試しください。',
  CHAT_INVALID_REQUEST: '話しかける内容を確認して、もう一度送ってください。',
};

export function chatErrorMessage(code?: unknown): string {
  return typeof code === 'string' && Object.hasOwn(messages, code)
    ? messages[code]
    : '返事を受け取れませんでした。もう一度試せます。';
}
