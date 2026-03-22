import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, User, Dumbbell, Map, Heart, Zap, TrendingUp, Activity, Trash2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/sonner';
import { calculateReadiness, calculateFatigue, getStrengthUnlockStatus } from '@/data/strengthWorkouts';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState({ score: 50, label: 'No Data' });
  const [fatigue, setFatigue] = useState({ score: 30, label: 'Fresh' });
  const [trend, setTrend] = useState<'improving' | 'stable' | 'under fatigue'>('stable');
  const [currentPhase, setCurrentPhase] = useState('');
  const [unlockProgress, setUnlockProgress] = useState({ sessionsCompleted: 0, sessionsRequired: 8, progressPercent: 0, nextPhase: 'Beginner Strength', unlocked: false });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const sevenDaysAgo = subDays(new Date(), 7).toISOString().split('T')[0];

    // Recent sessions (7 days)
    const { data: recent } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(10);

    setRecentSessions(recent || []);

    // All completed for metrics
    const { data: allCompleted } = await supabase
      .from('training_sessions')
      .select('id, intensity, discipline, date')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .order('date', { ascending: false })
      .limit(50);

    const sessions = allCompleted || [];
    const recentRpe = sessions.filter(s => s.intensity).map(s => s.intensity as number).slice(0, 10);
    const completionRate = sessions.length > 0 ? Math.min(100, sessions.length * 10) : 0;

    // Readiness & Fatigue
    setReadiness(calculateReadiness(recentRpe, completionRate, 0));
    setFatigue(calculateFatigue(recentRpe, 0));

    // Trend
    if (recentRpe.length >= 4) {
      const firstHalf = recentRpe.slice(0, Math.floor(recentRpe.length / 2));
      const secondHalf = recentRpe.slice(Math.floor(recentRpe.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      setTrend(avgFirst < avgSecond - 1 ? 'under fatigue' : avgFirst > avgSecond + 0.5 ? 'improving' : 'stable');
    }

    // Phase & unlock
    const cardioCount = sessions.filter(s => s.discipline === 'Cardio Activity').length;
    const strengthCount = sessions.filter(s => s.discipline === 'Strength Training').length;
    const avgRpe = recentRpe.length > 0 ? recentRpe.reduce((a, b) => a + b, 0) / recentRpe.length : 5;
    const unlock = getStrengthUnlockStatus(cardioCount, 0, avgRpe);

    if (unlock.unlocked) {
      setCurrentPhase('Beginner Strength Phase');
      setUnlockProgress({ sessionsCompleted: strengthCount, sessionsRequired: 12, progressPercent: Math.min(100, Math.round((strengthCount / 12) * 100)), nextPhase: 'Intermediate Strength', unlocked: strengthCount >= 12 });
    } else {
      setCurrentPhase('Early Beginner – Cardio Base');
      setUnlockProgress({ ...unlock, nextPhase: 'Beginner Strength', sessionsRequired: 8 });
    }

    setLoading(false);
  };

  const readinessColor = readiness.label === 'High' ? 'text-green-500' : readiness.label === 'Moderate' ? 'text-primary' : 'text-destructive';
  const fatigueColor = fatigue.label === 'Fresh' ? 'text-green-500' : fatigue.label === 'Managed' ? 'text-primary' : fatigue.label === 'Elevated' ? 'text-amber-500' : 'text-destructive';
  const trendIcon = trend === 'improving' ? '↑' : trend === 'stable' ? '→' : '↓';
  const trendColor = trend === 'improving' ? 'text-green-500' : trend === 'stable' ? 'text-primary' : 'text-amber-500';

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">TRG Training</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
              <User className="mr-1 h-4 w-4" />{profile?.name}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={() => navigate('/strength')} variant="secondary" className="flex-1 h-12">
            <Dumbbell className="mr-2 h-4 w-4" /> Strength
          </Button>
          <Button onClick={() => navigate('/session/new')} className="flex-1 h-12">
            <Plus className="mr-2 h-4 w-4" /> Add Session
          </Button>
          <Button onClick={() => navigate('/pathway')} variant="outline" className="flex-1 h-12">
            <Map className="mr-2 h-4 w-4" /> My Pathway
          </Button>
        </div>

        {/* Whoop-style metrics row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Readiness */}
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Heart className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className={`text-3xl font-black ${readinessColor}`}>{readiness.score}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Readiness</p>
              <Badge variant="outline" className="mt-1 text-xs">{readiness.label}</Badge>
            </CardContent>
          </Card>
          {/* Fatigue */}
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Zap className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className={`text-3xl font-black ${fatigueColor}`}>{fatigue.score}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Fatigue</p>
              <Badge variant="outline" className="mt-1 text-xs">{fatigue.label}</Badge>
            </CardContent>
          </Card>
          {/* Performance Trend */}
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className={`text-3xl font-black ${trendColor}`}>{trendIcon}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Trend</p>
              <Badge variant="outline" className="mt-1 text-xs capitalize">{trend}</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Current Phase */}
        <Card className="border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Current Phase</p>
            </div>
            <p className="text-lg font-bold">{currentPhase}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{unlockProgress.sessionsCompleted}/{unlockProgress.sessionsRequired} sessions</span>
                <span>Next: {unlockProgress.nextPhase}</span>
              </div>
              <Progress value={unlockProgress.progressPercent} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Philosophy */}
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground italic text-center">
              "If the body cannot sustain effort, strength has no value."
            </p>
          </CardContent>
        </Card>

        {/* Recent Sessions (7 days) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Sessions (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No sessions in the last 7 days.</p>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/10 rounded px-2 -mx-2"
                    onClick={() => navigate(`/session/${session.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{session.title || `${session.discipline} Training`}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(session.date), 'EEE, MMM d')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.intensity && (
                        <Badge variant="outline" className="text-xs">RPE {session.intensity}</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{session.discipline}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
