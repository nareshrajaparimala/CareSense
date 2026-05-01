import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { haversineKm } from '@/utils/distance';
import type { ApiResp, HospitalsResp } from '@/types/api';
import type { Hospital } from '@/types/domain';

const Query = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  specialty: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5)
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({
    lat: url.searchParams.get('lat'),
    lng: url.searchParams.get('lng'),
    specialty: url.searchParams.get('specialty') ?? undefined,
    limit: url.searchParams.get('limit') ?? 5
  });
  if (!parsed.success) {
    return NextResponse.json<ApiResp<HospitalsResp>>({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase.from('hospital_mock').select('*');
  if (error) {
    return NextResponse.json<ApiResp<HospitalsResp>>({ ok: false, error: error.message }, { status: 500 });
  }

  const { lat, lng, specialty, limit } = parsed.data;
  const ranked = (data as any[])
    .map((h): Hospital => ({
      id: h.id,
      name: h.name,
      specialty: h.specialty ?? [],
      address: h.address,
      lat: Number(h.lat),
      lng: Number(h.lng),
      beds_available: h.beds_available ?? 0,
      beds_total: h.beds_total ?? 0,
      rating: h.rating,
      phone: h.phone,
      distance_km: haversineKm(lat, lng, Number(h.lat), Number(h.lng))
    }))
    .filter((h) => (specialty ? h.specialty.includes(specialty) : true))
    .sort((a, b) => {
      // beds_available DESC then distance ASC
      if (b.beds_available !== a.beds_available) return b.beds_available - a.beds_available;
      return (a.distance_km ?? 0) - (b.distance_km ?? 0);
    })
    .slice(0, limit);

  return NextResponse.json<ApiResp<HospitalsResp>>({ ok: true, data: ranked });
}
