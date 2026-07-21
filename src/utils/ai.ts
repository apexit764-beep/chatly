import type { AISettings } from '@/store/useAIStore';

export async function transcribeAudio(_blob: Blob, _settings: AISettings): Promise<string> {
  await new Promise((r) => setTimeout(r, 1500));
  return 'نص تجريبي للرسالة الصوتية';
}

export async function getAIResponse(
  message: string,
  _settings: AISettings,
  _history: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  await new Promise((r) => setTimeout(r, 1000));
  return `تم استلام رسالتك: "${message.slice(0, 50)}"`;
}
