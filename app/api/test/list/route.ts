import { NextResponse } from 'next/server';
import { SCENARIOS } from '@/lib/test/scenarios';

export function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      base_url: '/api/test',
      flush_url: '/api/test/flush',
      scenarios: SCENARIOS.map((s) => ({
        slug: s.slug,
        title: s.title,
        description: s.description,
        expected_alert: s.expected_alert,
        expected_dashboard: s.expected_dashboard,
        endpoint: `/api/test/${s.slug}`,
        defaults: { age: s.default_age, sex: s.default_sex },
        conditions: s.conditions
      }))
    }
  });
}
