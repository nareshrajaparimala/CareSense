import Link from 'next/link';
import { Phone, Siren } from 'lucide-react';

export function HotlineCard({ patientId }: { patientId: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-700 to-red-800 p-5 text-white shadow-sm">
      <Siren className="absolute -right-2 -top-2 h-24 w-24 text-white/10" />
      <div className="relative">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Siren className="h-4 w-4" /> Hospital Hot-line
        </div>
        <p className="mt-2 text-sm text-white/85">
          Direct secure channel to the critical response unit.
        </p>
        <Link
          href={`/emergency/${patientId}`}
          className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 py-2.5 text-sm font-semibold transition hover:bg-white/20"
        >
          <Phone className="h-4 w-4" />
          Open Emergency Brief
        </Link>
      </div>
    </div>
  );
}
