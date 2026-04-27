import { useAppMode, AppMode } from '@/hooks/useAppMode';
import { Button } from '@/components/ui/button';
import { Swords, GraduationCap, Shield } from 'lucide-react';
import { logEvent } from '@/hooks/useAnalytics';

const MODE_CONFIG: Record<AppMode, { label: string; icon: React.ReactNode }> = {
  athlete: { label: 'Athlete', icon: <GraduationCap className="h-3.5 w-3.5" /> },
  fighter: { label: 'Fighter', icon: <Swords className="h-3.5 w-3.5" /> },
  coach: { label: 'Coach', icon: <Shield className="h-3.5 w-3.5" /> },
};

export function ModeSwitcher() {
  const { mode, setMode, availableModes } = useAppMode();

  if (availableModes.length <= 1) return null;

  return (
    <div className="flex gap-1 bg-secondary/50 rounded-lg p-0.5">
      {availableModes.map((m) => {
        const config = MODE_CONFIG[m];
        const isActive = mode === m;
        return (
          <Button
            key={m}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className={`text-xs gap-1.5 h-7 px-2.5 ${
              isActive ? '' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => {
              if (mode !== m) logEvent('mode_switched', { from: mode, to: m });
              setMode(m);
            }}
          >
            {config.icon}
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}
