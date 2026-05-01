'use client';

import { useEffect, useMemo, useRef } from 'react';
import { format, startOfDay, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

export type CalendarEntry = {
  date: string; // ISO date (yyyy-MM-dd)
  count: number; // # logs that day
  level?: 'stable' | 'watch' | 'trend' | 'risk' | 'critical';
};

type Props = {
  /** ISO timestamps of vital logs. */
  loggedAt: string[];
  /** Optional alert level keyed by yyyy-MM-dd. */
  levelByDay?: Record<string, 'stable' | 'watch' | 'trend' | 'risk' | 'critical'>;
  /** Number of days in the strip (default 30). */
  days?: number;
  /** Selected day yyyy-MM-dd (highlighted). */
  selected?: string | null;
  onSelect?: (day: string) => void;
};

const LEVEL_RING: Record<string, string> = {
  stable: 'ring-status-stable',
  watch: 'ring-status-watch',
  trend: 'ring-status-trend',
  risk: 'ring-status-risk',
  critical: 'ring-status-critical'
};

export function CalendarTimeline({
  loggedAt,
  levelByDay,
  days = 30,
  selected = null,
  onSelect
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const entries: CalendarEntry[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const iso of loggedAt) {
      const k = format(startOfDay(new Date(iso)), 'yyyy-MM-dd');
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const today = startOfDay(new Date());
    return Array.from({ length: days }, (_, i) => {
      const d = subDays(today, days - 1 - i);
      const key = format(d, 'yyyy-MM-dd');
      return {
        date: key,
        count: counts.get(key) ?? 0,
        level: levelByDay?.[key]
      };
    });
  }, [loggedAt, levelByDay, days]);

  // Scroll the strip to the right on first render so today is visible.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const totalLogged = entries.filter((e) => e.count > 0).length;
  const streak = computeStreak(entries);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight">Logging activity</div>
          <div className="text-xs text-muted-foreground">
            {totalLogged}/{days} days · 🔥 {streak} day streak
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
          <Legend label="No log" className="bg-muted" />
          <Legend label="Logged" className="bg-status-stable" />
          <Legend label="Watch" className="bg-status-watch" />
          <Legend label="Risk" className="bg-status-risk" />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30"
      >
        {entries.map((e, i) => {
          const isToday = e.date === format(new Date(), 'yyyy-MM-dd');
          const isSelected = selected === e.date;
          const isLogged = e.count > 0;
          const dayName = format(new Date(e.date + 'T00:00:00'), 'EEE');
          const dayNum = format(new Date(e.date + 'T00:00:00'), 'd');
          const monthName = format(new Date(e.date + 'T00:00:00'), 'MMM');
          const colorClass =
            e.level === 'critical' ? 'bg-status-critical text-white' :
            e.level === 'risk' ? 'bg-status-risk text-white' :
            e.level === 'trend' ? 'bg-status-trend text-white' :
            e.level === 'watch' ? 'bg-status-watch text-black' :
            isLogged ? 'bg-status-stable text-white' :
            'bg-muted text-muted-foreground';

          return (
            <button
              key={e.date}
              type="button"
              onClick={() => onSelect?.(e.date)}
              style={{ animationDelay: `${i * 12}ms` }}
              className={cn(
                'group relative shrink-0 snap-start rounded-lg px-2.5 py-2 text-center transition-all duration-200',
                'hover:scale-105 hover:shadow-md',
                'animate-in fade-in zoom-in-95',
                colorClass,
                isSelected && 'ring-2 ring-offset-2 ring-primary',
                !isSelected && e.level && LEVEL_RING[e.level],
                isToday && 'border-2 border-primary'
              )}
              title={`${e.date} · ${e.count} log${e.count === 1 ? '' : 's'}${e.level ? ` · ${e.level}` : ''}`}
            >
              <div className="text-[10px] font-medium uppercase opacity-80">
                {monthName} {dayName}
              </div>
              <div className="text-lg font-bold leading-none mt-0.5">{dayNum}</div>
              <div className="mt-1 flex justify-center gap-0.5">
                {Array.from({ length: Math.min(e.count, 3) }).map((_, k) => (
                  <span
                    key={k}
                    className="h-1 w-1 rounded-full bg-current opacity-90"
                  />
                ))}
                {!isLogged && <span className="h-1 w-1 rounded-full bg-current opacity-30" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ label, className }: { label: string; className: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('h-2 w-2 rounded-full', className)} />
      {label}
    </span>
  );
}

function computeStreak(entries: CalendarEntry[]) {
  let streak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].count > 0) streak++;
    else break;
  }
  return streak;
}
