import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Map, Trash2, Swords, ChevronRight } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/sonner';
import { getStrategyClass } from '@/lib/strategyColors';

const MARTIAL_ARTS = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'];

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const { settings, getDisciplineColor } = useUserSettings();
  const navigate = useNavigate();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [maStats, setMaStats] = useState({ total: 0, discipline: '' });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Current week: Monday to Sunday
    const mondayOfThisWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const { data: recent } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .gte('date', mondayOfThisWeek)
      .order('date', { ascending: false })
      .limit(20);

    setRecentSessions(recent || []);

    const maSessions = (recent || []).filter(s => MARTIAL_ARTS.includes(s.discipline));
    setMaStats({ total: maSessions.length, discipline: profile?.discipline || 'MMA' });

    setLoading(false);
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('training_sessions').delete().eq('id', sessionId);
    if (error) {
      toast.error('Failed to delete session');
    } else {
      toast.success('Session deleted');
      setRecentSessions(prev => prev.filter(s => s.id !== sessionId));
    }
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-display font-bold tracking-wide text-primary">TRG</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Fighter Journal</p>
          </div>
          <div className="flex items-center gap-1">
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
        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => navigate('/session/new')}
            className="h-14 text-base font-bold tracking-wide"
          >
            <Plus className="mr-2 h-5 w-5" /> Session
          </Button>
          <Button
            onClick={() => navigate('/pathway')}
            variant="outline"
            className="h-14 text-base font-semibold tracking-wide border-border hover:border-primary/40 hover:bg-primary/5"
          >
            <Map className="mr-2 h-5 w-5" /> My Pathway
          </Button>
        </div>

        {/* Fighter & Coach Links */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => navigate('/fighter')}
          >
            <Swords className="mr-1 h-3.5 w-3.5" /> Fighters Area
          </Button>
          {profile?.coach_level === 'head_coach' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => navigate('/coach')}
            >
              Coach Dashboard
            </Button>
          )}

        {/* Current Phase Card */}
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
                <Button size="sm" className="mt-3" onClick={() => navigate('/session/new')}>
                  Record Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session) => {
                const chain = buildChainPreview(session);
                const technique = (session as any).technique || '';
                const strategyClass = session.strategy ? getStrategyClass(session.strategy) : '';

                return (
                  <Card
                    key={session.id}
                    className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/session/${session.id}`)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* Title row */}
                          <p className="text-sm font-bold truncate" style={{ color: settings.input_text_color }}>
                            {session.title || technique || `${session.discipline} Training`}
                          </p>

                          {/* Date */}
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {format(new Date(session.date), 'EEE, MMM d')}
                            {session.time && ` · ${session.time}`}
                          </p>

                          {/* Tags row */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border" style={{ 
                              backgroundColor: getDisciplineColor(session.discipline) + '22',
                              color: getDisciplineColor(session.discipline),
                              borderColor: getDisciplineColor(session.discipline) + '44'
                            }}>
                              {session.discipline}
                            </Badge>
                            {session.strategy && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${strategyClass}`}>
                                {session.strategy}
                              </Badge>
                            )}
                            {technique && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {technique}
                              </Badge>
                            )}
                          </div>

                          {/* Movement chain */}
                          {chain && (
                            <p className="text-[11px] mt-1.5 font-mono tracking-tight" style={{ color: settings.input_text_color + '99' }}>
                              {chain}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
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

        {/* Brand footer */}
        <p className="text-center text-[10px] text-muted-foreground/50 font-display tracking-widest pt-4 pb-8">
          STRENGTH & HONOUR
        </p>
      </main>
    </div>
  );
}
