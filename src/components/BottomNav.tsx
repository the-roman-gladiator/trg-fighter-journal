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
      className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch justify-between max-w-lg mx-auto px-1">
        {tabs.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-h-[56px] text-[10px] font-medium tracking-wide transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-5 w-5', isActive && 'text-primary')} strokeWidth={isActive ? 2.4 : 1.8} />
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
