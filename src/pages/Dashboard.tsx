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
import { Plus, User, Map, Trash2, Swords, ChevronRight, Shield, Network, GraduationCap, CalendarDays, Clock, BookOpen, CheckCircle2, Flame, Zap, Target } from 'lucide-react';
import { format, startOfWeek, startOfYear } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/sonner';
import { getStrategyClass } from '@/lib/strategyColors';

const MARTIAL_ARTS = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'];

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

  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [coachSessions, setCoachSessions] = useState<any[]>([]);
  const [completedCoachSessions, setCompletedCoachSessions] = useState<any[]>([]);
  const [loggedCoachSessionIds, setLoggedCoachSessionIds] = useState<Set<string>>(new Set());
  const [coachNameMap, setCoachNameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [maStats, setMaStats] = useState({ total: 0, discipline: '' });

  // New stats
  const [yearlyStreak, setYearlyStreak] = useState(0);
  const [avgEffort, setAvgEffort] = useState(0);
  const [weeklySessions, setWeeklySessions] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const mondayOfThisWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');

    // Fetch this week's sessions
    const { data: recent } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .gte('date', mondayOfThisWeek)
      .order('date', { ascending: false })
      .limit(20);
    setRecentSessions(recent || []);
    setWeeklySessions((recent || []).length);
    const maSessions = (recent || []).filter(s => MARTIAL_ARTS.includes(s.discipline));
    setMaStats({ total: maSessions.length, discipline: profile?.discipline || 'MMA' });

    // Calculate avg effort from this week
    const effortScores = (recent || []).map((s: any) => s.effort_score).filter((s: any) => s != null && s > 0);
    setAvgEffort(effortScores.length > 0 ? Math.round((effortScores.reduce((a: number, b: number) => a + b, 0) / effortScores.length) * 10) / 10 : 0);

    // Yearly streak: count unique training days this year
    const { data: yearSessions } = await supabase
      .from('training_sessions')
      .select('date')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .gte('date', yearStart);
    const uniqueDays = new Set((yearSessions || []).map((s: any) => s.date));
    setYearlyStreak(uniqueDays.size);

    // Fetch scheduled coach sessions
    const { data: coachData } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('status', 'scheduled')
      .gte('scheduled_date', format(new Date(), 'yyyy-MM-dd'))
      .order('scheduled_date', { ascending: true })
      .limit(10);
    setCoachSessions(coachData || []);

    // Fetch completed coach sessions
    const { data: completedData } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('status', 'completed')
      .order('scheduled_date', { ascending: false })
      .limit(20);
    setCompletedCoachSessions(completedData || []);

    // Build coach name map
    const allCoachData = [...(coachData || []), ...(completedData || [])];
    const coachUserIds = [...new Set(allCoachData.map(cs => cs.user_id))];
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
      allCoachData.forEach(cs => {
        csNameMap[cs.id] = nameMap[cs.user_id] || 'Coach';
      });
      setCoachNameMap(csNameMap);
    }

    // Check which coach sessions user already logged
    if (completedData && completedData.length > 0) {
      const { data: logged } = await supabase
        .from('training_sessions')
        .select('coach_session_id')
        .eq('user_id', user.id)
        .not('coach_session_id', 'is', null);
      const ids = new Set((logged || []).map((l: any) => l.coach_session_id));
      setLoggedCoachSessionIds(ids);
    }

    setLoading(false);
  };

  const recordCoachSession = async (cs: any) => {
    if (!user) return;
    const discipline = MARTIAL_ARTS.includes(cs.discipline) ? cs.discipline : 'MMA';
    const { error } = await supabase.from('training_sessions').insert({
      user_id: user.id,
      title: cs.title,
      discipline: discipline as any,
      session_type: 'Completed',
      date: cs.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
      notes: `Coach class: ${cs.session_plan || ''}\nDrills: ${cs.drills || ''}`.trim(),
      coach_session_id: cs.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Session recorded in your journal!');
    setLoggedCoachSessionIds(prev => new Set(prev).add(cs.id));
    fetchData();
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('training_sessions').delete().eq('id', sessionId);
    if (error) { toast.error('Failed to delete session'); }
    else { toast.success('Session deleted'); fetchData(); }
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

  const buildChainPreview = (session: any) => {
    const parts = [session.first_movement, session.opponent_action, session.second_movement].filter(Boolean);
    if (parts.length === 0) return null;
    return parts.join(' → ');
  };

  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-display font-bold tracking-wide text-primary">TRG</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Fighter Journal</p>
          </div>
          <div className="flex items-center gap-2">
            <ModeSwitcher />
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 max-w-lg space-y-5">
        {/* Dynamic Date + Title */}
        <div>
          <p className="text-xs text-muted-foreground tracking-wide">
            {dayNames[today.getDay()]}, {format(today, 'd MMMM yyyy')}
          </p>
          <h2 className="text-2xl font-bold text-foreground mt-0.5">Dashboard</h2>
        </div>

        {/* Quick Log Button */}
        <Button onClick={() => navigate('/session/new')} className="w-full h-14 text-base font-bold tracking-wide">
          <Plus className="mr-2 h-5 w-5" /> Quick Log Session
        </Button>

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

        {/* Action Buttons Row */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => navigate('/pathway')} variant="outline"
            className="h-12 text-sm font-semibold tracking-wide border-border hover:border-primary/40 hover:bg-primary/5">
            <Map className="mr-1.5 h-4 w-4" /> Pathway
          </Button>
          <Button onClick={() => navigate('/library')} variant="outline"
            className="h-12 text-sm font-semibold tracking-wide border-border hover:border-primary/40 hover:bg-primary/5">
            <BookOpen className="mr-1.5 h-4 w-4" /> Library
          </Button>
        </div>

        {/* Martial Arts Journal Card */}
        <Card className="border-primary/20 bg-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Swords className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Martial Arts Journal</p>
            </div>
            <p className="text-lg font-bold text-foreground">{maStats.discipline}</p>
            <div className="flex items-center gap-4 mt-2">
              <div>
                <p className="text-3xl font-black text-primary">{maStats.total}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">This Week</p>
              </div>
            </div>
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

        {/* Completed Coach Sessions */}
        {completedCoachSessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">Completed Classes</h2>
              <span className="text-[10px] text-muted-foreground">Record to your journal</span>
            </div>
            <div className="space-y-2">
              {completedCoachSessions.map((cs) => {
                const alreadyLogged = loggedCoachSessionIds.has(cs.id);
                return (
                  <Card key={cs.id} className={`bg-card border-border border-l-4 ${alreadyLogged ? 'border-l-muted-foreground/30' : 'border-l-accent'}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate text-foreground">{cs.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            <span>{cs.scheduled_date ? format(new Date(cs.scheduled_date), 'EEE, MMM d') : 'No date'}</span>
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
                        </div>
                        <div className="shrink-0 mt-1">
                          {alreadyLogged ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-[10px]">Logged</span>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2.5"
                              onClick={() => recordCoachSession(cs)}>
                              <BookOpen className="h-3 w-3 mr-1" /> Record
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">Recent Sessions</h2>
            <span className="text-[10px] text-muted-foreground">Last 7 days</span>
          </div>

          {recentSessions.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground text-sm">No sessions in the last 7 days.</p>
                <Button size="sm" className="mt-3" onClick={() => navigate('/session/new')}>Record Session</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session) => {
                const chain = buildChainPreview(session);
                const technique = (session as any).technique || '';
                const strategyClass = session.strategy ? getStrategyClass(session.strategy) : '';
                const effortLabel = session.effort_score ? `⚡ ${session.effort_score}` : '';
                return (
                  <Card key={session.id}
                    className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/session/${session.id}`)}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate" style={{ color: settings.input_text_color }}>
                            {session.title || technique || `${session.discipline} Training`}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {format(new Date(session.date), 'EEE, MMM d')}
                            {session.time && ` · ${session.time}`}
                            {session.coach_session_id && coachNameMap[session.coach_session_id] && (
                              <span className="ml-1">· Coach: {coachNameMap[session.coach_session_id]}</span>
                            )}
                            {effortLabel && <span className="ml-1">· {effortLabel}</span>}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border" style={{
                              backgroundColor: getDisciplineColor(session.discipline) + '22',
                              color: getDisciplineColor(session.discipline),
                              borderColor: getDisciplineColor(session.discipline) + '44'
                            }}>{session.discipline}</Badge>
                            {session.coach_session_id && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 bg-primary/10 text-primary">
                                🎓 Coach Class
                              </Badge>
                            )}
                            {session.strategy && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${strategyClass}`}>
                                {session.strategy}
                              </Badge>
                            )}
                            {technique && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{technique}</Badge>}
                          </div>
                          {chain && (
                            <p className="text-[11px] mt-1.5 font-mono tracking-tight" style={{ color: settings.input_text_color + '99' }}>
                              {chain}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete session?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => deleteSession(session.id, e)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 font-display tracking-widest pt-4 pb-8">
          STRENGTH & HONOUR
        </p>
      </main>
    </div>
  );
}