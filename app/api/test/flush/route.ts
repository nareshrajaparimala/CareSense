import { NextResponse } from 'next/server';
import { z } from 'zod';
import { flushPatientData } from '@/lib/services/seed-patient';

const Body = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }
  try {
    const result = await flushPatientData(parsed.data.email);
    return NextResponse.json({
      ok: true,
      data: {
        ...result,
        message: result.patient_id
          ? `Flushed clinical data for ${result.email}: ${result.deleted.vitals} vitals, ${result.deleted.medications} meds, ${result.deleted.alerts} alerts. Auth user kept.`
          : `No patient row found for ${result.email}; nothing to flush.`
      }
    });
  } catch (e: any) {
    const status = /no caresense account/i.test(e.message) ? 404 : 500;
    return NextResponse.json({ ok: false, error: e.message }, { status });
  }
}
