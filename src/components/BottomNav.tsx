import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, ClipboardList, TrendingUp, NotebookPen, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/session/new', label: '+ Log', icon: PlusCircle },
  { to: '/records', label: 'Records', icon: ClipboardList },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/reflection', label: 'Reflection', icon: NotebookPen },
  { to: '/award', label: 'Award', icon: Trophy },
];

const HIDDEN_ROUTES = ['/auth', '/onboarding'];

export function BottomNav() {
  const { pathname } = useLocation();
  if (HIDDEN_ROUTES.some(r => pathname.startsWith(r))) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-primary/30 bg-[hsl(var(--card))]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-4px_hsl(var(--primary)/0.25)]"
    >
      <ul className="flex items-stretch justify-between max-w-lg mx-auto px-1">
        {tabs.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-h-[58px] text-[10px] font-semibold tracking-wide transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
                  )}
                  <Icon
                    className={cn('h-5 w-5 transition-transform', isActive && 'text-primary scale-110')}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span className="leading-none">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
