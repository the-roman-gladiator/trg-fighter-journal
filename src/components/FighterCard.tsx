import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, Shield, Flame, Quote, CalendarDays } from 'lucide-react';

interface FighterCardProps {
  nickname?: string;
  name?: string;
  age?: number | null;
  discipline?: string;
  level?: string;
  statement?: string;
  /** Sessions logged in the current week (Mon–Sun). */
  weeklySessions?: number;
  /** Longest consecutive-day training streak ever. */
  longestStreak?: number;
}

/**
 * Small "fighter trading card" style summary for the dashboard.
 * Mobile-first: tight spacing, fluid text scaling, no horizontal overflow.
 */
export function FighterCard({
  nickname,
  name,
  age,
  discipline,
  level,
  statement,
  weeklySessions,
  longestStreak,
}: FighterCardProps) {
  const displayName = nickname || name || 'Fighter';
  const hasStats = weeklySessions != null || longestStreak != null;

  return (
    <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-[hsl(var(--primary)/0.18)] via-card to-card shadow-[0_8px_28px_-10px_hsl(var(--primary)/0.55)]">
      {/* Diagonal accent stripe */}
      <div
        aria-hidden
        className="absolute -right-12 top-0 h-full w-32 bg-gradient-to-b from-primary/30 to-transparent rotate-12 pointer-events-none"
      />
      {/* Glow blob */}
      <div
        aria-hidden
        className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl pointer-events-none"
      />

      {/* Header bar */}
      <div className="relative flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent">
        <div className="flex items-center gap-1.5 min-w-0">
          <Shield className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-primary truncate">
            Fighter Card
          </span>
        </div>
        {level && (
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 border-primary/50 text-primary bg-primary/10 shrink-0"
          >
            {level}
          </Badge>
        )}
      </div>

      <div className="relative p-3 sm:p-4 space-y-3">
        {/* Name row */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
              Nickname
            </p>
            <h3
              className="text-xl sm:text-2xl font-black uppercase leading-tight tracking-tight text-foreground truncate"
              style={{ fontFamily: 'Barlow Condensed, Inter, sans-serif' }}
            >
              {displayName}
            </h3>
          </div>
          {age != null && (
            <div className="text-right shrink-0">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                Age
              </p>
              <p className="text-xl sm:text-2xl font-black tabular-nums text-primary leading-tight">
                {age}
              </p>
            </div>
          )}
        </div>

        {/* Discipline chips */}
        {discipline && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Swords className="h-3.5 w-3.5 text-primary shrink-0" />
            {discipline.split(',').map((d) => {
              const trimmed = d.trim();
              if (!trimmed) return null;
              return (
                <Badge
                  key={trimmed}
                  className="text-[10px] px-1.5 py-0 uppercase tracking-wider bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25"
                >
                  {trimmed}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Stat badges — weekly sessions + longest streak */}
        {hasStats && (
          <div className="grid grid-cols-2 gap-2">
            {weeklySessions != null && (
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5">
                <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] font-bold tracking-[0.18em] uppercase text-muted-foreground leading-none">
                    This Week
                  </p>
                  <p className="text-base sm:text-lg font-black tabular-nums text-foreground leading-tight">
                    {weeklySessions}
                    <span className="text-[10px] font-semibold text-muted-foreground ml-1">
                      sess
                    </span>
                  </p>
                </div>
              </div>
            )}
            {longestStreak != null && (
              <div className="flex items-center gap-2 rounded-md border border-orange-500/30 bg-orange-500/5 px-2.5 py-1.5">
                <Flame className="h-4 w-4 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] font-bold tracking-[0.18em] uppercase text-muted-foreground leading-none">
                    Best Streak
                  </p>
                  <p className="text-base sm:text-lg font-black tabular-nums text-foreground leading-tight">
                    {longestStreak}
                    <span className="text-[10px] font-semibold text-muted-foreground ml-1">
                      days
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statement */}
        {statement && (
          <div className="pt-2 border-t border-primary/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Quote className="h-3 w-3 text-primary shrink-0" />
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-primary">
                My Statement
              </p>
            </div>
            <p className="text-[13px] sm:text-sm font-semibold italic leading-snug text-foreground break-words">
              "{statement}"
            </p>
          </div>
        )}
      </div>

      {/* Bottom corner flame accent */}
      <div className="absolute bottom-2 right-2 opacity-40 pointer-events-none">
        <Flame className="h-4 w-4 text-primary" />
      </div>
    </Card>
  );
}
