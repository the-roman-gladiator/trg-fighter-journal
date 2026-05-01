import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAppMode } from '@/hooks/useAppMode';
import { ModeSwitcher } from '@/components/ModeSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Map, Swords, Shield, Network, GraduationCap, CalendarDays, Clock, BookOpen, CheckCircle2, Flame, Zap, Target, Quote, Sparkles, Info, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, startOfWeek, startOfYear, subDays } from 'date-fns';
import { toast } from '@/components/ui/sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import fighterBgDark from '@/assets/dashboard-bg-octagon.png';
import fighterBgLight from '@/assets/dashboard-fighter-bg-light.png';
import { CoachNoteOffersInbox } from '@/components/coach/CoachNoteOffersInbox';
import { LoadingScreen } from '@/components/LoadingScreen';
import { FighterCard } from '@/components/FighterCard';

const MARTIAL_ARTS = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'];

const CLASS_TYPE_COLORS: Record<string, string> = {
  'Cardio/Endurance': '#FF6B6B',
  'Strength/Conditioning': '#4ECDC4',
  'Technical Skills': '#45B7D1',
  'Sparring': '#F9C74F',
  '1o1 PT': '#A78BFA',
};

const FIGHTER_STATUSES: { label: string; description: string }[] = [
  { label: 'In Camp', description: 'Preparing for a fight' },
  { label: 'In Training', description: 'Normal training' },
  { label: 'Off Season', description: 'Lower-pressure training period' },
  { label: 'In Recovery', description: 'Injury/fatigue recovery' },
  { label: 'Fight Week', description: 'Final week before fight' },
  { label: 'Post Fight', description: 'After competition' },
  { label: 'In Growth', description: 'Skill development phase' },
  { label: 'Inactive', description: 'Not currently training or logging regularly' },
];

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const { settings, getDisciplineColor } = useUserSettings();
  const { mode } = useAppMode();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
  }, [user, navigate]);

  useEffect(() => {
    if (mode === 'fighter') navigate('/fighter');
    else if (mode === 'coach') navigate('/coach');
  }, [mode]);

  const [coachSessions, setCoachSessions] = useState<any[]>([]);
  const [coachNameMap, setCoachNameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Stats
  const [yearlyStreak, setYearlyStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [avgEffort, setAvgEffort] = useState(0);
  const [weeklySessions, setWeeklySessions] = useState(0);

  // Journal box state
  const [myStatement, setMyStatement] = useState('');
  const [target, setTarget] = useState('');
  const [myDisciplines, setMyDisciplines] = useState<string[]>([]);
  const [dailyMotivation, setDailyMotivation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fighter status (manually set)
  const [fighterStatus, setFighterStatus] = useState<string>('In Training');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [showInfoFor, setShowInfoFor] = useState<string | null>(null);

  // Pie chart data
  const [classTypeData, setClassTypeData] = useState<{ name: string; value: number }[]>([]);

  // Desktop side-panels data
  const [disciplineBreakdown, setDisciplineBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [strategyBreakdown, setStrategyBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [latestNotes, setLatestNotes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const mondayOfThisWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');
    const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

    // Fetch last 7 days sessions for stats only
    const { data: recent } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(50);

    // Weekly sessions count (Monday-Sunday)
    const weekSessions = (recent || []).filter(s => s.date >= mondayOfThisWeek);
    setWeeklySessions(weekSessions.length);

    // Calculate avg effort
    const effortScores = (recent || []).map((s: any) => s.effort_score).filter((s: any) => s != null && s > 0);
    setAvgEffort(effortScores.length > 0 ? Math.round((effortScores.reduce((a: number, b: number) => a + b, 0) / effortScores.length) * 10) / 10 : 0);

    // Yearly streak
    const { data: yearSessions } = await supabase
      .from('training_sessions')
      .select('date')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .gte('date', yearStart);
    const uniqueDays = new Set((yearSessions || []).map((s: any) => s.date));
    setYearlyStreak(uniqueDays.size);

    // Longest consecutive-day streak this year
    const sortedDays = Array.from(uniqueDays).sort();
    let best = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const d of sortedDays) {
      const cur = new Date(d as string);
      if (prev && (cur.getTime() - prev.getTime()) === 86400000) {
        run += 1;
      } else {
        run = 1;
      }
      if (run > best) best = run;
      prev = cur;
    }
    setLongestStreak(best);

    // Fetch ALL sessions for pie chart (class_type distribution)
    const { data: allSessions } = await supabase
      .from('training_sessions')
      .select('class_type')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .not('class_type', 'is', null);

    const typeCounts: Record<string, number> = {};
    (allSessions || []).forEach((s: any) => {
      if (s.class_type) {
        typeCounts[s.class_type] = (typeCounts[s.class_type] || 0) + 1;
      }
    });
    const pieData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
    setClassTypeData(pieData);

    // Discipline + Strategy breakdowns + latest notes (for desktop side panels)
    const { data: deepSessions } = await supabase
      .from('training_sessions')
      .select('id, date, title, discipline, disciplines, strategy, class_type, notes, technique')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .order('date', { ascending: false })
      .limit(200);

    const discCounts: Record<string, number> = {};
    const stratCounts: Record<string, number> = {};
    (deepSessions || []).forEach((s: any) => {
      const ds: string[] = (s.disciplines && s.disciplines.length > 0)
        ? s.disciplines
        : (s.discipline ? [s.discipline] : []);
      ds.forEach((d) => { if (d) discCounts[d] = (discCounts[d] || 0) + 1; });
      if (s.strategy) stratCounts[s.strategy] = (stratCounts[s.strategy] || 0) + 1;
    });
    setDisciplineBreakdown(
      Object.entries(discCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    );
    setStrategyBreakdown(
      Object.entries(stratCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    );
    setLatestNotes((deepSessions || []).slice(0, 8));

    // Fetch profile for journal box
    const { data: prof } = await supabase
      .from('profiles')
      .select('my_statement, target, discipline, daily_motivation_mode, fixed_motivation_id, custom_motivation_text, avatar_url, fighter_status')
      .eq('id', user.id)
      .maybeSingle();

    if (prof) {
      setMyStatement(prof.my_statement || '');
      setTarget((prof as any).target || '');
      setMyDisciplines(prof.discipline ? prof.discipline.split(',').map((d: string) => d.trim()).filter(Boolean) : []);
      setAvatarUrl((prof as any).avatar_url || null);
      setFighterStatus((prof as any).fighter_status || 'In Training');

      const motivationMode = prof.daily_motivation_mode || 'random';
      if (motivationMode === 'custom' && prof.custom_motivation_text) {
        setDailyMotivation(prof.custom_motivation_text);
      } else if (motivationMode === 'fixed_library' && prof.fixed_motivation_id) {
        const { data: fixedMot } = await supabase
          .from('motivations_library')
          .select('motivation_text')
          .eq('id', prof.fixed_motivation_id)
          .maybeSingle();
        setDailyMotivation(fixedMot?.motivation_text || '');
      } else {
        const now = new Date();
        const startOfYearDate = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - startOfYearDate.getTime();
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const dayNum = ((dayOfYear - 1) % 365) + 1;
        const { data: randomMot } = await supabase
          .from('motivations_library')
          .select('motivation_text')
          .eq('day_number', dayNum)
          .maybeSingle();
        setDailyMotivation(randomMot?.motivation_text || '');
      }
    }

    // Coach notes are private — student-side discovery is handled exclusively
    // through the CoachNoteOffersInbox widget (reads coach_note_offers).

    setLoading(false);
  };

  const saveFighterStatus = async (status: string) => {
    if (!user) return;
    const prev = fighterStatus;
    setFighterStatus(status);
    setStatusModalOpen(false);
    setShowInfoFor(null);
    const { error } = await supabase
      .from('profiles')
      .update({ fighter_status: status } as any)
      .eq('id', user.id);
    if (error) {
      setFighterStatus(prev);
      toast.error('Failed to update status');
    } else {
      toast.success(`Status set to ${status}`);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const nickname = profile?.nickname || '';

  const fighterBg = settings.theme_mode === 'light' ? fighterBgLight : fighterBgDark;

  return (
    <div className="min-h-screen bg-background dark:bg-transparent relative">
      {/* Light-mode soft background (kept) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 dark:hidden"
        style={{
          backgroundImage: `url(${fighterBgLight})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          opacity: 0.18,
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 80%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 dark:hidden bg-gradient-to-b from-background/60 via-background/40 to-background"
      />

      {/* Premium hero header — bold sports-headline */}
      <header className="relative z-10 border-b border-border/60 bg-gradient-to-b from-[hsl(0_0%_4%)] via-[hsl(0_0%_5%)] to-[hsl(0_0%_3.5%)]">
        <div className="container mx-auto px-4 pt-4 pb-4 max-w-lg">
          {/* Top row: profile + sign out */}
          <div className="flex justify-end items-center gap-1 mb-1">
            <Button variant="ghost" size="sm" className="text-xs h-8 px-2" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] h-8 px-2 text-muted-foreground" onClick={signOut}>
              Sign Out
            </Button>
          </div>

          {/* Hero block: title left, fighter image right */}
          <div className="relative flex items-center justify-between gap-3 min-h-[120px]">
            <div className="relative z-10 flex-1 min-w-0">
              <h1
                className="leading-[0.95] tracking-[0.01em] text-[40px] sm:text-[52px] font-bold"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                <span className="block text-foreground">Fighter</span>
                <span className="journal-title block text-primary drop-shadow-[0_2px_8px_hsl(var(--primary)/0.4)]">Journal</span>
              </h1>
              <p className="mt-2 text-[11px] tracking-[0.18em] uppercase text-muted-foreground font-medium">
                Track. Improve. Win.
              </p>
            </div>
            {/* Fighter silhouette accent (right side) — tuned for small screens */}
            <div
              aria-hidden="true"
              className="relative w-[110px] h-[110px] xs:w-[120px] xs:h-[120px] sm:w-[150px] sm:h-[150px] shrink-0 rounded-lg overflow-hidden self-stretch max-h-[140px] sm:max-h-none"
              style={{
                backgroundImage: `url(${fighterBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 25%',
                maskImage: 'linear-gradient(to left, black 40%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent 100%)',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-primary/20 blur-3xl pointer-events-none hidden dark:block"
            />
          </div>

          {/* Mode switcher row — under hero, above the date */}
          <div className="mt-4 flex justify-center">
            <ModeSwitcher />
          </div>
        </div>
      </header>

      {/* Floating actions — Library (left on mobile) + AI Assistant (right) */}
      <button
        onClick={() => navigate('/library')}
        aria-label="Open Library"
        className="fixed z-40 left-4 bottom-[calc(env(safe-area-inset-bottom)+76px)] md:left-8 md:bottom-8 flex items-center justify-center w-14 h-14 rounded-full bg-card/90 backdrop-blur-md border border-primary/50 text-primary hover:text-primary-foreground hover:bg-primary transition-all shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.5),0_0_0_1px_hsl(0_0%_100%/0.06)_inset] hover:shadow-[0_10px_32px_-4px_hsl(var(--primary)/0.7)] hover:scale-105"
      >
        <BookOpen className="h-6 w-6" />
        <span className="sr-only">Library</span>
      </button>
      <button
        onClick={() => navigate('/ai-assistant')}
        aria-label="Open Fighter Pathway AI"
        className="fixed z-40 right-4 bottom-[calc(env(safe-area-inset-bottom)+76px)] md:bottom-[88px] md:right-8 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/40 backdrop-blur-md border border-primary/60 text-primary-foreground transition-all shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.7)] hover:shadow-[0_10px_36px_-4px_hsl(var(--primary)/0.85)] hover:scale-105"
      >
        <Sparkles className="h-6 w-6" />
        <span className="sr-only">Fighter Pathway AI</span>
      </button>

      <main className="container mx-auto px-4 py-6 max-w-lg lg:max-w-7xl lg:grid lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:gap-6 lg:items-start space-y-7 dark:space-y-8 lg:space-y-0 pb-28 relative z-10">
        {/* DESKTOP LEFT — Quick Stats Panel */}
        <aside className="hidden lg:block space-y-4 sticky top-4">
          <Card className="border-border bg-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Swords className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Disciplines</p>
              </div>
              {disciplineBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sessions logged yet.</p>
              ) : (
                <ul className="space-y-2">
                  {disciplineBreakdown.map((d) => {
                    const max = disciplineBreakdown[0]?.value || 1;
                    const pct = (d.value / max) * 100;
                    return (
                      <li key={d.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-foreground truncate pr-2">{d.name}</span>
                          <span className="text-muted-foreground">{d.value}</span>
                        </div>
                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Type of Class</p>
              </div>
              {classTypeData.length === 0 ? (
                <p className="text-xs text-muted-foreground">No class types recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {classTypeData.sort((a, b) => b.value - a.value).map((c) => (
                    <li key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CLASS_TYPE_COLORS[c.name] || 'hsl(var(--muted-foreground))' }}
                        />
                        <span className="font-medium text-foreground truncate">{c.name}</span>
                      </div>
                      <span className="text-muted-foreground tabular-nums">{c.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Tactics</p>
              </div>
              {strategyBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tactics tracked yet.</p>
              ) : (
                <ul className="space-y-2">
                  {strategyBreakdown.map((s) => {
                    const max = strategyBreakdown[0]?.value || 1;
                    const pct = (s.value / max) * 100;
                    return (
                      <li key={s.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-foreground truncate pr-2">{s.name}</span>
                          <span className="text-muted-foreground">{s.value}</span>
                        </div>
                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <div className="h-full bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* CENTER — original mobile content */}
        <div className="space-y-6 dark:space-y-7 min-w-0">

        {/* 1. STATUS & STATS BAR */}
        <Card className="bg-[hsl(0_0%_4%)] border-border/70 shadow-[0_0_0_1px_hsl(var(--primary)/0.08),0_8px_24px_-12px_hsl(var(--primary)/0.25)]">
          <CardContent className="p-0">
            <div className="grid grid-cols-4 divide-x divide-border/60">
              {/* STATUS — clickable */}
              <button
                type="button"
                onClick={() => setStatusModalOpen(true)}
                className="px-3 py-3 sm:px-4 sm:py-4 text-left hover:bg-primary/5 transition-colors focus:outline-none focus:bg-primary/5 group"
                aria-label="Change status"
              >
                <p className="text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-semibold">Status</p>
                <p className="mt-1 text-[11px] sm:text-sm font-black text-foreground leading-tight uppercase group-hover:text-primary transition-colors break-words">{fighterStatus}</p>
              </button>
              {/* STREAK */}
              <div className="px-2 py-3 sm:px-4 sm:py-4 text-center flex flex-col items-center justify-center">
                <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary mb-1" />
                <p className="text-base sm:text-lg font-black text-foreground leading-none tabular-nums">3</p>
                <p className="mt-1 text-[9px] sm:text-[10px] tracking-widest uppercase text-muted-foreground font-semibold">Day Streak</p>
              </div>
              {/* SESSIONS */}
              <div className="px-2 py-3 sm:px-4 sm:py-4 text-center flex flex-col items-center justify-center">
                <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary mb-1" />
                <p className="text-base sm:text-lg font-black text-foreground leading-none tabular-nums">17</p>
                <p className="mt-1 text-[9px] sm:text-[10px] tracking-widest uppercase text-muted-foreground font-semibold">Sessions</p>
              </div>
              {/* INTENSITY */}
              <div className="px-2 py-3 sm:px-4 sm:py-4 text-center flex flex-col items-center justify-center">
                <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary mb-1" />
                <p className="text-base sm:text-lg font-black text-foreground leading-none tabular-nums">3.3</p>
                <p className="mt-1 text-[9px] sm:text-[10px] tracking-widest uppercase text-muted-foreground font-semibold">Intensity</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. FIGHT CARD — unchanged */}
        <FighterCard
          userId={user?.id}
          nickname={profile?.nickname || undefined}
          name={profile?.name || undefined}
          discipline={myDisciplines.join(', ') || profile?.discipline || undefined}
          level={profile?.level}
          statement={myStatement}
          target={target || undefined}
          dailyMotivation={dailyMotivation}
          avatarUrl={avatarUrl}
          onAvatarChange={(url) => setAvatarUrl(url)}
          weeklySessions={weeklySessions}
          longestStreak={longestStreak}
        />

        {/* 3. THIS WEEK + WEEKLY GOAL */}
        {(() => {
          const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
          const jsDay = new Date().getDay(); // 0=Sun ... 6=Sat
          const todayIdx = jsDay === 0 ? 6 : jsDay - 1; // Mon=0 ... Sun=6
          const goalTotal = 5;
          const goalDone = Math.min(weeklySessions, goalTotal);
          const goalPct = (goalDone / goalTotal) * 100;
          return (
            <Card className="bg-[hsl(0_0%_4%)] border-border/70">
              <CardContent className="p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs tracking-[0.18em] uppercase text-primary font-bold">This Week</p>
                  <button
                    onClick={() => navigate('/records')}
                    className="flex items-center gap-1 text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View All <span aria-hidden>→</span>
                  </button>
                </div>

                {/* Week row */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-5">
                  {days.map((d, i) => {
                    const isCompleted = i < todayIdx;
                    const isCurrent = i === todayIdx;
                    return (
                      <div key={d} className="flex flex-col items-center gap-1.5">
                        <span className={`text-[9px] sm:text-[10px] tracking-widest uppercase font-semibold ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{d}</span>
                        <div
                          className={[
                            'h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center transition-colors',
                            isCompleted ? 'bg-primary border border-primary text-primary-foreground' : '',
                            isCurrent ? 'border-2 border-primary bg-transparent' : '',
                            !isCompleted && !isCurrent ? 'border border-border/60 bg-transparent' : '',
                          ].join(' ')}
                        >
                          {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Weekly goal */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="shrink-0">
                    <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-muted-foreground font-semibold">Weekly Goal</p>
                    <p className="text-xs sm:text-sm text-foreground font-bold tracking-wider mt-0.5">
                      <span className="text-primary tabular-nums">{goalDone}</span>
                      <span className="text-muted-foreground"> / {goalTotal}</span> Sessions
                    </p>
                  </div>
                  <div className="flex-1 h-2.5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Library moved to floating button (top-right on desktop, lower-right on mobile) */}


        {/* Pie Chart — Type Classes Distribution */}
        <Card className="border-border bg-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Training Distribution</p>
            </div>
            {classTypeData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No class type data recorded yet. Start logging sessions with a Type Class to see your distribution.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={classTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {classTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CLASS_TYPE_COLORS[entry.name] || '#888'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                      formatter={(value: number, name: string) => [`${value} sessions`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coach Notes offered to me — student saves create their own training session copy */}
        <CoachNoteOffersInbox />

        <p className="text-center text-[10px] text-muted-foreground/50 font-display tracking-widest pt-4 pb-8">
          STRENGTH & HONOUR
        </p>
        </div>
        {/* /CENTER */}

        {/* DESKTOP RIGHT — Latest Notes */}
        <aside className="hidden lg:block sticky top-4">
          <Card className="border-border bg-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Latest Notes</p>
              </div>
              {latestNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No notes yet. Log your first session to see it here.</p>
              ) : (
                <ul className="space-y-2">
                  {latestNotes.map((n) => {
                    const summary = (n.notes || n.technique || '').toString().trim();
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => navigate(`/session/${n.id}`)}
                          className="w-full text-left p-2.5 rounded-md border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary">
                              {n.title || n.discipline || 'Session'}
                            </p>
                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                              {format(new Date(n.date), 'd MMM')}
                            </span>
                          </div>
                          {summary && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{summary}</p>
                          )}
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {n.discipline && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                                {n.discipline}
                              </Badge>
                            )}
                            {n.strategy && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                {n.strategy}
                              </Badge>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </main>

      {/* CHANGE STATUS modal */}
      <Dialog open={statusModalOpen} onOpenChange={(o) => { setStatusModalOpen(o); if (!o) setShowInfoFor(null); }}>
        <DialogContent className="bg-[hsl(0_0%_4%)] border-border/70 max-w-md w-[calc(100%-2rem)] rounded-xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
            <DialogTitle className="text-sm tracking-[0.22em] uppercase font-bold text-primary">
              Change Status
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground mt-1">Set your current training phase manually.</p>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-3 space-y-1.5">
            {FIGHTER_STATUSES.map((s) => {
              const selected = s.label === fighterStatus;
              const showing = showInfoFor === s.label;
              return (
                <div
                  key={s.label}
                  className={[
                    'rounded-lg border transition-colors',
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-border/60 hover:border-primary/40 hover:bg-primary/5',
                  ].join(' ')}
                >
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => saveFighterStatus(s.label)}
                      className="flex-1 text-left px-4 py-3 focus:outline-none"
                    >
                      <p className={`text-sm font-bold uppercase tracking-wider ${selected ? 'text-primary' : 'text-foreground'}`}>
                        {s.label}
                      </p>
                      {showing && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{s.description}</p>
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={`More info about ${s.label}`}
                      onClick={(e) => { e.stopPropagation(); setShowInfoFor(showing ? null : s.label); }}
                      className="px-3 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border-l border-border/40"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-border/60 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
