import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface FighterStatisticsProps {
  userId: string;
  onSessionClick?: (sessionId: string) => void;
}

interface FighterNoteSession {
  id: string;
  date: string;
  title: string | null;
  technique: string | null;
  discipline: string;
  attempts_count: number | null;
  executed_count: number | null;
  execution_rate: number | null;
  physical_effort_execution: string | null;
  mindset_effort_execution: string | null;
}

const rateBarColor = (rate: number) =>
  rate >= 86 ? 'bg-emerald-500' : rate >= 66 ? 'bg-amber-500' : 'bg-destructive';

export function ExecutionRateBar({ rate, hasData = true }: { rate: number; hasData?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full ${rateBarColor(rate)} transition-all`}
          style={{ width: `${hasData ? Math.min(100, Math.max(0, rate)) : 0}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums w-20 text-right">
        {hasData ? `${Math.round(rate)}%` : 'No attempts'}
      </span>
    </div>
  );
}

export function FighterStatistics({ userId, onSessionClick }: FighterStatisticsProps) {
  const [sessions, setSessions] = useState<FighterNoteSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('training_sessions')
        .select('id, date, title, technique, discipline, attempts_count, executed_count, execution_rate, physical_effort_execution, mindset_effort_execution')
        .eq('user_id', userId)
        .eq('make_fighter_note', true)
        .order('date', { ascending: false })
        .limit(50);
      setSessions((data as any) || []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  const totalAttempts = sessions.reduce((sum, s) => sum + (s.attempts_count || 0), 0);
  const totalExecuted = sessions.reduce((sum, s) => sum + (s.executed_count || 0), 0);
  const overallRate = totalAttempts > 0 ? (totalExecuted / totalAttempts) * 100 : 0;

  // Mode aggregations
  const modeOf = (arr: (string | null)[]) => {
    const counts = new Map<string, number>();
    arr.forEach(v => { if (v) counts.set(v, (counts.get(v) || 0) + 1); });
    let best: string | null = null; let bestN = 0;
    counts.forEach((n, k) => { if (n > bestN) { bestN = n; best = k; } });
    return best;
  };
  const topPhysical = modeOf(sessions.map(s => s.physical_effort_execution));
  const topMindset = modeOf(sessions.map(s => s.mindset_effort_execution));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Fighter Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading statistics...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No Fighter Notes logged yet. Tick "Make this a Fighter Note" when logging a session.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Attempts</p>
                <p className="text-xl font-bold tabular-nums">{totalAttempts}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Executed</p>
                <p className="text-xl font-bold tabular-nums">{totalExecuted}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Overall Execution Rate
              </p>
              <ExecutionRateBar rate={overallRate} hasData={totalAttempts > 0} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Top Physical</p>
                <p className="font-medium">{topPhysical || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Top Mindset</p>
                <p className="font-medium">{topMindset || '—'}</p>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Recent Fighter Notes
              </p>
              <div className="space-y-2">
                {sessions.slice(0, 5).map((s) => {
                  const rate = s.execution_rate ?? 0;
                  return (
                    <div
                      key={s.id}
                      className="rounded-md border border-border p-2.5 cursor-pointer hover:border-primary/40 transition-colors"
                      onClick={() => onSessionClick?.(s.id)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {s.title || s.technique || 'Session'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(s.date), 'MMM d, yyyy')} · {s.executed_count || 0}/{s.attempts_count || 0}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[9px]">{s.discipline}</Badge>
                      </div>
                      <ExecutionRateBar rate={rate} hasData={(s.attempts_count || 0) > 0} />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
