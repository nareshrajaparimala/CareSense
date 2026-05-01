'use client';

import { Bell, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Notification = {
  id: string;
  kind: 'caregiver_invite' | 'invite_accepted' | 'invite_declined';
  title: string;
  message: string;
  created_at: string;
  unread?: boolean;
  link_id?: string;
  patient_id?: string;
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function Topbar({
  user,
  role
}: {
  user: { name: string; role: string };
  role?: 'patient' | 'caregiver' | 'doctor';
}) {
  const settingsHref =
    role === 'patient' ? '/patient/settings' :
    role === 'doctor' ? '/doctor/dashboard' :
    role === 'caregiver' ? '/caregiver/home' :
    '/patient/settings';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/notifications', {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      const json = await res.json();
      if (json?.ok) setItems(json.data ?? []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    load();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const respond = async (n: Notification, action: 'accept' | 'decline') => {
    if (!n.link_id) return;
    setBusyId(n.id);
    try {
      const res = await fetch('/api/caregiver-invite/respond', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: n.link_id, action })
      });
      const json = await res.json();
      if (json?.ok) {
        setItems((prev) => prev.filter((x) => x.id !== n.id));
        if (action === 'accept') router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || '?';

  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-8">
      <div className="ml-12 md:ml-0" />
      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Notifications"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-96 max-w-[90vw] origin-top-right overflow-hidden rounded-xl border border-white/40 bg-white/85 text-popover-foreground shadow-2xl ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 animate-in fade-in slide-in-from-top-1"
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
                )}
              </div>
              <div className="max-h-[28rem] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">You're all caught up.</p>
                    <p className="text-xs text-muted-foreground/70">No notifications yet.</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {items.map((n) => (
                      <li
                        key={n.id}
                        className={`px-4 py-3 text-sm ${n.unread ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">{n.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {relTime(n.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>

                        {n.kind === 'caregiver_invite' && n.link_id && (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={busyId === n.id}
                              onClick={() => respond(n, 'accept')}
                              className="rounded-md bg-[#1E3FBF] px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={busyId === n.id}
                              onClick={() => respond(n, 'decline')}
                              className="rounded-md border px-3 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <a
          href={settingsHref}
          className="hidden h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </a>
        <div className="flex items-center gap-3 rounded-lg pl-2">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold leading-tight">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.role}</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
