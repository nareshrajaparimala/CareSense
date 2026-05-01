import 'server-only';

export type GroqMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function callGroq(
  messages: GroqMessage[],
  opts: { maxTokens?: number; temperature?: number; json?: boolean } = {}
): Promise<string | null> {
  if (!process.env.GROQ_API_KEY) return null;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens: opts.maxTokens ?? 400,
        temperature: opts.temperature ?? 0.4,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {})
      })
    });
    const data = await resp.json();
    return (data?.choices?.[0]?.message?.content ?? '').trim();
  } catch {
    return null;
  }
}
