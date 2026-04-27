import { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, subMonths, format } from 'date-fns';
import { TrendRangeSelector, TrendRange } from '@/components/trends/TrendRangeSelector';
import { PieTrendCard, PieDatum } from '@/components/trends/PieTrendCard';
import { PerformanceComparisonCard } from '@/components/trends/PerformanceComparisonCard';

const CLASS_TYPE_COLORS: Record<string, string> = {
  'Cardio/Endurance': '#FF6B6B',
  'Strength/Conditioning': '#4ECDC4',
  'Technical Skills': '#45B7D1',
  'Sparring': '#F9C74F',
  '1o1 PT': '#A78BFA',
};

const DISCIPLINE_COLORS: Record<string, string> = {
  MMA: '#8B0000',
  'Muay Thai': '#FF7F11',
  K1: '#FFB703',
  Wrestling: '#1D3557',
  Grappling: '#2A9D8F',
  BJJ: '#6A4C93',
  'Strength Training': '#4ECDC4',
  'Cardio Activity': '#FF6B6B',
};

const STRATEGY_COLORS: Record<string, string> = {
  Attacking: '#EF4444',
  Defending: '#3B82F6',
  Countering: '#F59E0B',
  Intercepting: '#A855F7',
  Transition: '#10B981',
  // Legacy spelling fallbacks for any old aggregated data
  Transitions: '#10B981',
  Transiction: '#10B981',
  Control: '#6366F1',
};

function rangeStartDate(range: TrendRange): string {
  const now = new Date();
  switch (range) {
    case 'weekly':
      return format(subDays(now, 6), 'yyyy-MM-dd');
    case 'monthly':
      return format(subDays(now, 29), 'yyyy-MM-dd');
    case '6months':
      return format(subMonths(now, 6), 'yyyy-MM-dd');
  }
}

function aggregate(rows: any[], field: string): PieDatum[] {
  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    const v = r[field];
    if (v == null || v === '') return;
    counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export default function Trends() {
  const { user } = useAuth();
  const [range, setRange] = useState<TrendRange>('weekly');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const start = rangeStartDate(range);
      const { data } = await supabase
        .from('training_sessions')
        .select('discipline, class_type, strategy, before_emotion, after_emotion, before_mindset, after_mindset, physical_effort_level, mental_effort_level, date')
        .eq('user_id', user.id)
        .gte('date', start)
        .order('date', { ascending: false });
      setSessions(data || []);
      setLoading(false);
    })();
  }, [user, range]);

  const disciplineData = useMemo(() => aggregate(sessions, 'discipline'), [sessions]);
  const classTypeData = useMemo(() => aggregate(sessions, 'class_type'), [sessions]);
  const strategyData = useMemo(() => aggregate(sessions, 'strategy'), [sessions]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-display font-bold text-primary">Trends</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg space-y-4">
        <TrendRangeSelector value={range} onChange={setRange} />

        {loading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Loading…</div>
        ) : (
          <>
            <div className="space-y-3">
              <PieTrendCard title="Discipline" data={disciplineData} colorMap={DISCIPLINE_COLORS} />
              <PieTrendCard title="Type of Class" data={classTypeData} colorMap={CLASS_TYPE_COLORS} />
              <PieTrendCard title="Tactic" data={strategyData} colorMap={STRATEGY_COLORS} />
            </div>

            <PerformanceComparisonCard sessions={sessions} />
          </>
        )}
      </main>
    </div>
  );
}
