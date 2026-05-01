import { Activity, Pill, Moon, Heart } from 'lucide-react';
import { relTime } from '@/utils/dateFormat';

type Activity = {
  id: string;
  icon: 'pill' | 'moon' | 'heart' | 'activity';
  type: string;
  timestamp: string;
  status: 'logged' | 'confirmed' | 'missed';
};

const ICONS = {
  pill: Pill,
  moon: Moon,
  heart: Heart,
  activity: Activity
};

const STATUS_STYLES = {
  logged: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  missed: 'bg-red-50 text-red-700 border-red-200'
};

export function CareActivityTable({ items }: { items: Activity[] }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h3 className="text-base font-bold">Recent Activity</h3>
        <span className="text-xs text-muted-foreground">Last 24h</span>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No activity yet — log today's vitals to start.
        </p>
      ) : (
        <div className="divide-y">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.type}</div>
                    <div className="text-xs text-muted-foreground">{relTime(item.timestamp)}</div>
                  </div>
                </div>
                <span
                  className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[item.status]}`}
                >
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
