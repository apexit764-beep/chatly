import { useAIStore, type AISettings } from '@/store/useAIStore';

export async function transcribeAudio(audioBlob: Blob, settings: AISettings): Promise<string> {
  if (!settings.apiKey) throw new Error('مفتاح API غير مُعد');

  if (settings.provider === 'openai') {
    const form = new FormData();
    form.append('file', audioBlob, 'voice.webm');
    form.append('model', 'whisper-1');
    form.append('language', settings.languages[0] === 'ar' ? 'ar' : 'en');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.apiKey}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Whisper API error: ${res.status}`);
    const data = await res.json();
    return data.text as string;
  }

  if (settings.provider === 'google') {
    const buf = await audioBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: 'audio/webm', data: base64 } },
              { text: 'Transcribe this audio message accurately. Return ONLY the transcription text, nothing else.' },
            ],
          }],
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  // Anthropic doesn't support audio natively — fall back to OpenAI Whisper if available
  throw new Error('المزود الحالي لا يدعم تحويل الصوت. استخدم OpenAI أو Google.');
}

export async function getAIResponse(
  userMessage: string,
  settings: AISettings,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
): Promise<string> {
  if (!settings.apiKey) throw new Error('مفتاح API غير مُعد');

  const toneMap: Record<string, string> = {
    short: 'أجب بإيجاز وبأقصر رد ممكن.',
    friendly: 'أجب بأسلوب ودود ولطيف.',
    formal: 'أجب بأسلوب رسمي ومهني.',
    luxury: 'أجب بأسلوب راقي ومميز يليق بالعملاء المهمين.',
  };

  const systemPrompt = [
    settings.prompt,
    toneMap[settings.tone] || '',
    settings.forbiddenTopics ? `لا تتحدث عن هذه المواضيع نهائياً: ${settings.forbiddenTopics}. إذا سُئلت عنها أجب بـ: "${settings.forbiddenReply}"` : '',
  ].filter(Boolean).join('\n\n');

  const messages = [
    ...conversationHistory.slice(-10),
    { role: 'user' as const, content: userMessage },
  ];

  if (settings.provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: settings.maxResponseTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  if (settings.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: settings.maxResponseTokens,
        system: systemPrompt,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? '';
  }

  if (settings.provider === 'google') {
    const history = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: history,
          generationConfig: { maxOutputTokens: settings.maxResponseTokens },
        }),
      }
    );
    if (!res.ok) throw new Error(`Google API error: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  throw new Error('مزود AI غير معروف');
}

export async function handleVoiceWithAI(
  audioBlob: Blob,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
): Promise<{ transcription: string; reply: string }> {
  const settings = useAIStore.getState().settings;
  const transcription = await transcribeAudio(audioBlob, settings);
  const reply = await getAIResponse(transcription, settings, conversationHistory);
  return { transcription, reply };
}
