import { NextResponse } from 'next/server';
import { z } from 'zod';
import { seedPatientHistory } from '@/lib/services/seed-patient';

const Body = z.object({
  email: z.string().email(),
  profile: z.enum(['diabetic', 'hypertensive', 'cardiac', 'kidney', 'stable', 'deteriorating', 'heart_attack']),
  reset: z.boolean().default(true),
  age: z.number().int().min(1).max(120).optional(),
  sex: z.enum(['M', 'F', 'Other']).optional(),
  full_name: z.string().min(1).max(100).optional()
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }
  try {
    const result = await seedPatientHistory(parsed.data);
    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    const status = /no caresense account/i.test(e.message) ? 404 : 500;
    return NextResponse.json({ ok: false, error: e.message }, { status });
  }
}
