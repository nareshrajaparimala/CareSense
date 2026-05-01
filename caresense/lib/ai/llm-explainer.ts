import 'server-only';
import type { Forecast, ShapBreakdown } from '@/types/domain';

export type ExplainerContext = {
  patient_name: string;
  conditions: string[];
  shap: ShapBreakdown;
  forecast: Forecast | null;
  current_bp: { systolic: number; diastolic: number };
  baseline_bp_systolic: number;
  missed_doses: number;
  sleep_avg: number;
};

export type Explanation = {
  title: string;
  message: string;
  recommendation: string;
  source: 'llm' | 'fallback';
};

const FALLBACK = (ctx: ExplainerContext): Explanation => ({
  title: 'BP rising trend detected',
  message: `${ctx.patient_name}'s BP has drifted above their personal baseline (${ctx.baseline_bp_systolic.toFixed(0)} mmHg) with ${ctx.missed_doses} missed doses and ${ctx.sleep_avg.toFixed(1)}h average sleep over the last week.`,
  recommendation: 'Please consult your doctor within 24 hours. If symptoms appear, seek urgent care.',
  source: 'fallback'
});

export async function generateAlertExplanation(ctx: ExplainerContext): Promise<Explanation> {
  if (!process.env.ANTHROPIC_API_KEY) return FALLBACK(ctx);

  const prompt = `You are a calm medical AI assistant generating a chronic-care patient alert.

Patient: ${ctx.patient_name}
Conditions: ${ctx.conditions.join(', ')}

Current state:
- BP: ${ctx.current_bp.systolic}/${ctx.current_bp.diastolic} (personal baseline: ${ctx.baseline_bp_systolic.toFixed(0)})
- Missed doses (last 7 days): ${ctx.missed_doses}
- Avg sleep (last 7 days): ${ctx.sleep_avg.toFixed(1)} hrs

72-hour forecast:
${ctx.forecast
  ? `- Predicted BP: ${ctx.forecast.predicted.toFixed(0)}
- Days until critical: ${ctx.forecast.days_to_critical.toFixed(1)}
- Confidence: ${(ctx.forecast.confidence * 100).toFixed(0)}%`
  : '- Insufficient data for forecast'}

Factor contribution (SHAP-style):
- Vital trend: ${(ctx.shap.vital_change * 100).toFixed(0)}%
- Medication adherence: ${(ctx.shap.medication * 100).toFixed(0)}%
- Lifestyle: ${(ctx.shap.lifestyle * 100).toFixed(0)}%

Return ONLY valid JSON, no preamble:
{
  "title": "Short alert title (max 8 words)",
  "message": "2-sentence plain-English explanation of WHAT changed and WHY it matters.",
  "recommendation": "1-sentence specific action recommendation. Always end with: If symptoms appear, consult your doctor."
}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!resp.ok) return FALLBACK(ctx);
    const data: any = await resp.json();
    const text: string = data?.content?.[0]?.text ?? '';
    const json = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(json);
    return {
      title: String(parsed.title ?? '').slice(0, 80),
      message: String(parsed.message ?? ''),
      recommendation: String(parsed.recommendation ?? ''),
      source: 'llm'
    };
  } catch {
    return FALLBACK(ctx);
  }
}
