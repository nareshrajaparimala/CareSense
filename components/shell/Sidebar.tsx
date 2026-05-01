'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Activity,
  ClipboardList,
  LineChart,
  Bell,
  Users,
  Stethoscope,
  ShieldAlert,
  HelpCircle,
  Menu,
  X,
  LogOut,
  Heart
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

const ICONS = {
  activity: Activity,
  log: ClipboardList,
  trends: LineChart,
  alerts: Bell,
  family: Users,
  doctor: Stethoscope,
  emergency: ShieldAlert,
  heart: Heart
} as const;

export function Sidebar({
  items,
  user,
  subtitle
}: {
  items: NavItem[];
  user: { name: string; role: string };
  subtitle: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-lg border bg-card shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Heart className="h-5 w-5" fill="currentColor" />
            </div>
            <div>
              <div className="text-base font-bold leading-tight">CareSense</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
                {subtitle}
              </div>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="text-sidebar-muted md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  active
                    ? 'border border-sidebar-border bg-sidebar-active text-foreground shadow-sm'
                    : 'text-sidebar-muted hover:bg-sidebar-active hover:text-foreground'
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border px-3 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-active hover:text-foreground"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
            Support
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-active hover:text-foreground"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
