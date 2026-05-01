import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { message, context } = await req.json().catch(() => ({ message: '' }));

  if (!message?.trim()) {
    return NextResponse.json({ reply: 'Please ask me something.' });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      reply:
        "AI is not configured yet. Please add GROQ_API_KEY to .env.local and restart the dev server."
    });
  }

  const systemPrompt = context
    ? `You are CareSense, a calm, plain-English health companion for chronic-care patients. Always remind users you are not a doctor and to seek medical care for emergencies. Patient context (do not repeat verbatim): ${context}`
    : 'You are CareSense, a calm, plain-English health companion for chronic-care patients. Keep answers short and clear. Always remind users you are not a doctor.';

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 350,
        temperature: 0.6
      })
    });

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? 'No response.';
    return NextResponse.json({ reply: reply.trim() });
  } catch (err) {
    return NextResponse.json({ reply: 'Sorry, the AI service is unavailable right now.' });
  }
}
