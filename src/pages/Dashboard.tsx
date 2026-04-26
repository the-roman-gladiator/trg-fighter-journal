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
import { Plus, User, Map, Swords, Shield, Network, GraduationCap, CalendarDays, Clock, BookOpen, CheckCircle2, Flame, Zap, Target, Quote, Sparkles } from 'lucide-react';
import { format, startOfWeek, startOfYear, subDays } from 'date-fns';
import { toast } from '@/components/ui/sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import fighterBg from '@/assets/dashboard-fighter-bg.jpg';

const MARTIAL_ARTS = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'];

const CLASS_TYPE_COLORS: Record<string, string> = {
  'Cardio/Endurance': '#FF6B6B',
  'Strength/Conditioning': '#4ECDC4',
  'Technical Skills': '#45B7D1',
  'Sparring': '#F9C74F',
  '1o1 PT': '#A78BFA',
};

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
  const [avgEffort, setAvgEffort] = useState(0);
  const [weeklySessions, setWeeklySessions] = useState(0);

  // Journal box state
  const [myStatement, setMyStatement] = useState('');
  const [myDisciplines, setMyDisciplines] = useState<string[]>([]);
  const [dailyMotivation, setDailyMotivation] = useState('');

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
      .select('my_statement, discipline, daily_motivation_mode, fixed_motivation_id, custom_motivation_text')
      .eq('id', user.id)
      .maybeSingle();

    if (prof) {
      setMyStatement(prof.my_statement || '');
      setMyDisciplines(prof.discipline ? prof.discipline.split(',').map((d: string) => d.trim()).filter(Boolean) : []);

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

    // Fetch scheduled coach sessions
    const { data: coachData } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('status', 'scheduled')
      .gte('scheduled_date', format(new Date(), 'yyyy-MM-dd'))
      .order('scheduled_date', { ascending: true })
      .limit(10);
    setCoachSessions(coachData || []);

    // Build coach name map
    const coachUserIds = [...new Set((coachData || []).map(cs => cs.user_id))];
    if (coachUserIds.length > 0) {
      const { data: coachProfiles } = await supabase
        .from('profiles')
        .select('id, name, middle_name, surname')
        .in('id', coachUserIds);
      const nameMap: Record<string, string> = {};
      (coachProfiles || []).forEach(p => {
        nameMap[p.id] = [p.name, p.middle_name, p.surname].filter(Boolean).join(' ');
      });
      const csNameMap: Record<string, string> = {};
      (coachData || []).forEach(cs => {
        csNameMap[cs.id] = nameMap[cs.user_id] || 'Coach';
      });
      setCoachNameMap(csNameMap);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const nickname = profile?.nickname || '';

  return (
    <div className="min-h-screen bg-background relative">
      {/* Dashboard-only fighter background graphic */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${fighterBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          opacity: 0.18,
          filter: 'blur(0.5px) saturate(1.1)',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 80%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-background/60 via-background/40 to-background"
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
              <h1 className="font-headline leading-[0.85] tracking-[0.01em] text-[48px] sm:text-[58px]">
                <span className="block text-foreground">FIGHTER</span>
                <span className="journal-title block text-primary drop-shadow-[0_2px_8px_hsl(var(--primary)/0.4)]">JOURNAL</span>
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
              className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-primary/20 blur-3xl pointer-events-none"
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
        className="fixed z-40 left-4 bottom-[calc(env(safe-area-inset-bottom)+76px)] md:left-auto md:right-8 md:bottom-8 flex items-center justify-center w-14 h-14 rounded-full bg-card/90 backdrop-blur-md border border-primary/50 text-primary hover:text-primary-foreground hover:bg-primary transition-all shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.5),0_0_0_1px_hsl(0_0%_100%/0.06)_inset] hover:shadow-[0_10px_32px_-4px_hsl(var(--primary)/0.7)] hover:scale-105"
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

      <main className="container mx-auto px-4 py-5 max-w-lg lg:max-w-7xl lg:grid lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:gap-6 lg:items-start space-y-5 lg:space-y-0 pb-28 relative z-10">
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
        <div className="space-y-5 min-w-0">
        {/* Dynamic Date + Title with Nickname */}
        <div>
          <p className="text-xs text-muted-foreground tracking-wide">
            {dayNames[today.getDay()]}, {format(today, 'd MMMM yyyy')}
          </p>
          <h2 className="text-2xl font-bold text-foreground mt-0.5">
            Dashboard{nickname ? ` – ${nickname}` : ''}
          </h2>
        </div>

        {/* Combined Daily Motivation + My Statement — outstanding top block */}
        {(dailyMotivation || myStatement) && (
          <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.35)]">
            <CardContent className="pt-5 pb-5 space-y-4">
              {myStatement && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Swords className="h-4 w-4 text-primary" />
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary">My Statement</p>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-foreground italic leading-snug">
                    "{myStatement}"
                  </p>
                </div>
              )}
              {dailyMotivation && (
                <div className={myStatement ? 'pt-3 border-t border-primary/20' : ''}>
                  <div className="flex items-center gap-2 mb-2">
                    <Quote className="h-4 w-4 text-primary" />
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary">Daily Motivation</p>
                  </div>
                  <p className="text-sm sm:text-base font-medium text-foreground leading-snug">
                    {dailyMotivation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-card border-border">
            <CardContent className="py-3 px-3 text-center">
              <Flame className="h-4 w-4 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-foreground">{yearlyStreak}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Day Streak</p>
              <p className="text-[8px] text-muted-foreground">This Year</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-3 px-3 text-center">
              <Zap className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-foreground">{avgEffort || '—'}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Avg Effort</p>
              <p className="text-[8px] text-muted-foreground">Based on logs</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-3 px-3 text-center">
              <Target className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-2xl font-black text-foreground">{weeklySessions}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Sessions</p>
              <p className="text-[8px] text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>

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

        {/* Upcoming Coach Sessions */}
        {coachSessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">Upcoming Classes</h2>
              <span className="text-[10px] text-muted-foreground">From your coaches</span>
            </div>
            <div className="space-y-2">
              {coachSessions.map((cs) => (
                <Card key={cs.id} className="bg-card border-border border-l-4 border-l-primary/60">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate text-foreground">{cs.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          <span>{format(new Date(cs.scheduled_date), 'EEE, MMM d')}</span>
                          {cs.duration_minutes && (
                            <>
                              <Clock className="h-3 w-3 ml-1" />
                              <span>{cs.duration_minutes} min</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border border-primary/30 text-primary">
                            {cs.discipline}
                          </Badge>
                          {cs.target_level && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {cs.target_level}
                            </Badge>
                          )}
                        </div>
                        {cs.session_plan && (
                          <p className="text-[11px] mt-1.5 text-muted-foreground line-clamp-2">{cs.session_plan}</p>
                        )}
                      </div>
                      <GraduationCap className="h-4 w-4 text-primary/40 shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground/50 font-display tracking-widest pt-4 pb-8">
          STRENGTH & HONOUR
        </p>
      </main>
    </div>
  );
}
