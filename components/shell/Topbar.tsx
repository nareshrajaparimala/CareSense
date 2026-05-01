'use client';

import { Bell, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  unread?: boolean;
};

export function Topbar({
  user,
  notifications = []
}: {
  user: { name: string; role: string };
  notifications?: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
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

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || '?';

  const unreadCount = notifications.filter((n) => n.unread).length;

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
              className="absolute right-0 mt-2 w-80 origin-top-right overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in slide-in-from-top-1"
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">You're all caught up.</p>
                    <p className="text-xs text-muted-foreground/70">No notifications yet.</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`px-4 py-3 text-sm hover:bg-muted/50 ${n.unread ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">{n.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
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
