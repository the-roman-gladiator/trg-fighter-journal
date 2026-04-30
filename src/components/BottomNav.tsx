import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, ClipboardList, TrendingUp, NotebookPen, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

const tabs = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/session/new', label: '+ Log', icon: PlusCircle },
  { to: '/records', label: 'Records', icon: ClipboardList },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/reflection', label: 'Reflection', icon: NotebookPen },
  { to: '/award', label: 'Award', icon: Trophy },
];

const HIDDEN_ROUTES = ['/auth', '/intro', '/onboarding', '/admin'];

export function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useSubscription();
  if (HIDDEN_ROUTES.some(r => pathname.startsWith(r))) return null;
  // Hide on public landing (root, logged out)
  if (pathname === '/' && !user) return null;
  // Admins are locked to the admin area — never show the athlete nav
  if (isAdmin) return null;

  return (
    <nav
      aria-label="Primary"
      data-bottom-nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-primary/25 bg-black pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_-8px_hsl(var(--primary)/0.35)] before:absolute before:inset-x-0 before:-top-px before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/60 before:to-transparent"
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
                    ? 'text-primary nav-item-active'
                    : 'text-muted-foreground hover:text-foreground nav-item-inactive'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary nav-indicator" />
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
