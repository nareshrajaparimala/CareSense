import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { seedPatientHistory } from '@/lib/services/seed-patient';
import { BY_SLUG, type TestScenario } from './scenarios';

const Body = z.object({
  email: z.string().email(),
  reset: z.boolean().default(true),
  age: z.number().int().min(1).max(120).optional(),
  sex: z.enum(['M', 'F', 'Other']).optional(),
  full_name: z.string().min(1).max(100).optional()
});

export function makeScenarioHandler(slug: string) {
  return async function POST(req: Request) {
    const scenario: TestScenario | undefined = BY_SLUG[slug];
    if (!scenario) {
      return NextResponse.json({ ok: false, error: `Unknown scenario "${slug}"` }, { status: 404 });
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
    }

    try {
      const result = await seedPatientHistory({
        email: parsed.data.email,
        profile: scenario.profile,
        reset: parsed.data.reset,
        age: parsed.data.age ?? scenario.default_age,
        sex: parsed.data.sex ?? scenario.default_sex,
        full_name: parsed.data.full_name
      });
      return NextResponse.json({
        ok: true,
        data: {
          scenario: scenario.slug,
          title: scenario.title,
          description: scenario.description,
          expected_alert: scenario.expected_alert,
          expected_dashboard: scenario.expected_dashboard,
          ...result
        }
      });
    } catch (e: any) {
      const status = /no caresense account/i.test(e.message) ? 404 : 500;
      return NextResponse.json({ ok: false, error: e.message }, { status });
    }
  };
}
