import { Trophy, Flame, Calendar, Target, Medal, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type BadgeItem = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  earned: boolean;
  progress?: number; // 0-100
};

const BADGES: BadgeItem[] = [
  {
    id: 'first-session',
    name: 'First Step',
    description: 'Log your first session.',
    icon: Flame,
    earned: true,
  },
  {
    id: 'week-streak',
    name: '7-Day Streak',
    description: 'Train every planned day for a week.',
    icon: Calendar,
    earned: false,
    progress: 40,
  },
  {
    id: 'ten-sessions',
    name: '10 Sessions',
    description: 'Log 10 training sessions.',
    icon: Target,
    earned: false,
    progress: 60,
  },
  {
    id: 'fifty-sessions',
    name: '50 Sessions',
    description: 'Log 50 training sessions.',
    icon: Medal,
    earned: false,
    progress: 12,
  },
];

export default function Award() {
  const earnedCount = BADGES.filter((b) => b.earned).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-display font-bold text-primary">Award</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 max-w-lg space-y-5">
        {/* Summary card */}
        <Card>
          <CardContent className="py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Badges Earned
              </p>
              <p className="text-3xl font-display font-bold text-primary leading-none mt-1">
                {earnedCount}
                <span className="text-base text-muted-foreground font-medium">
                  {' '}/ {BADGES.length}
                </span>
              </p>
            </div>
            <Trophy className="h-10 w-10 text-primary/70" />
          </CardContent>
        </Card>

        {/* Badge list */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Badges
          </h2>
          {BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <Card key={badge.id} className={badge.earned ? '' : 'opacity-80'}>
                <CardContent className="py-4 flex items-center gap-3">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                      badge.earned
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {badge.earned ? (
                      <Icon className="h-6 w-6" />
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{badge.name}</p>
                      {badge.earned && (
                        <Badge variant="default" className="text-[9px] px-1.5 py-0">
                          Earned
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {badge.description}
                    </p>
                    {!badge.earned && typeof badge.progress === 'number' && (
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={badge.progress} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {badge.progress}%
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          More awards, ranks and member value score coming soon.
        </p>
      </main>
    </div>
  );
}
