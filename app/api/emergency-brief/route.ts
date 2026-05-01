import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { haversineKm } from '@/utils/distance';
import type { ApiResp, EmergencyBriefResp } from '@/types/api';
import type { Hospital, EmergencyBrief } from '@/types/domain';

const Query = z.object({ patient_id: z.string().uuid() });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({ patient_id: url.searchParams.get('patient_id') });
  if (!parsed.success) {
    return NextResponse.json<ApiResp<EmergencyBriefResp>>({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json<ApiResp<EmergencyBriefResp>>({ ok: false, error: 'unauthorized' }, { status: 401 });

  const patientId = parsed.data.patient_id;

  const [patientRes, vitalsRes, medsRes, alertRes] = await Promise.all([
    supabase.from('patient').select('*').eq('id', patientId).maybeSingle(),
    supabase.from('vitals_log').select('*').eq('patient_id', patientId).order('logged_at', { ascending: false }).limit(7),
    supabase.from('medication').select('*').eq('patient_id', patientId).eq('active', true),
    supabase.from('alert').select('*').eq('patient_id', patientId).eq('status', 'open').order('created_at', { ascending: false }).limit(1)
  ]);

  const patient = patientRes.data as any;
  if (!patient) return NextResponse.json<ApiResp<EmergencyBriefResp>>({ ok: false, error: 'patient not found' }, { status: 404 });

  const vitals = (vitalsRes.data ?? []) as any[];
  const meds = (medsRes.data ?? []) as any[];
  const alert = (alertRes.data ?? [])[0] as any;

  // Profile name
  const { data: profile } = patient.user_id
    ? await supabase.from('user_profile').select('full_name').eq('id', patient.user_id).maybeSingle()
    : { data: null };

  // Last-taken + missed_count_7d per medication
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const medSummaries = await Promise.all(
    meds.map(async (m) => {
      const [{ data: lastTaken }, { count }] = await Promise.all([
        supabase
          .from('medication_log')
          .select('logged_at')
          .eq('medication_id', m.id)
          .eq('taken', true)
          .order('logged_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('medication_log')
          .select('id', { count: 'exact', head: true })
          .eq('medication_id', m.id)
          .eq('taken', false)
          .gte('logged_at', sevenDaysAgo)
      ]);
      return {
        name: m.name,
        dosage: m.dosage,
        last_taken: (lastTaken as any)?.logged_at ?? null,
        missed_count_7d: count ?? 0
      };
    })
  );

  // Hospitals via admin (public read)
  const { data: hospitalRows } = await supabaseAdmin.from('hospital_mock').select('*');
  const lat = Number(patient.location_lat ?? 12.9716);
  const lng = Number(patient.location_lng ?? 77.5946);
  const hospitals: Hospital[] = (hospitalRows ?? [])
    .map((h: any) => ({
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
    .sort((a, b) => {
      if (b.beds_available !== a.beds_available) return b.beds_available - a.beds_available;
      return (a.distance_km ?? 0) - (b.distance_km ?? 0);
    })
    .slice(0, 5);

  const latest = vitals[0] ?? {};
  const brief: EmergencyBrief = {
    patient: {
      id: patient.id,
      name: profile?.full_name ?? 'Patient',
      age: patient.age,
      sex: patient.sex ?? 'Other',
      conditions: patient.conditions ?? [],
      allergies: patient.allergies ?? [],
      emergency_contact_name: patient.emergency_contact_name,
      emergency_contact_phone: patient.emergency_contact_phone
    },
    vitals_now: {
      bp_systolic: latest.bp_systolic ?? null,
      bp_diastolic: latest.bp_diastolic ?? null,
      glucose_mgdl: latest.glucose_mgdl ?? null,
      heart_rate: latest.heart_rate ?? null,
      spo2: latest.spo2 ?? null,
      logged_at: latest.logged_at ?? new Date().toISOString()
    },
    medications: medSummaries,
    trend_7d: vitals
      .slice()
      .reverse()
      .map((v) => ({ logged_at: v.logged_at, bp_systolic: v.bp_systolic, glucose_mgdl: v.glucose_mgdl })),
    predicted_event: alert?.forecast_72hr
      ? {
          type: 'Hypertensive crisis',
          confidence: alert.confidence ?? alert.forecast_72hr.confidence ?? 0.8
        }
      : null,
    location: { lat, lng, address: patient.address ?? null },
    destination: hospitals[0] ?? null,
    hospitals
  };

  // Persist (admin) — link to alert if present
  await supabaseAdmin
    .from('emergency_brief')
    .insert({
      patient_id: patientId,
      alert_id: alert?.id ?? null,
      brief_data: brief,
      destination_hospital_id: hospitals[0]?.id ?? null
    });

  return NextResponse.json<ApiResp<EmergencyBriefResp>>({ ok: true, data: brief });
}
