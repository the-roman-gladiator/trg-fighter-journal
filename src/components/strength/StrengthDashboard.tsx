import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, History, FileText, Dumbbell, Calendar, Target, TrendingUp } from 'lucide-react';

function calcWeek(startDate: string | null | undefined): number | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

function getPhase(week: number): string {
  if (week <= 4) return 'Technique + Base Volume';
  if (week <= 8) return 'Increased Load + Intensity';
  if (week <= 12) return 'Peak Power + Speed';
  return 'Program Complete';
}

function getPhaseColor(week: number): string {
  if (week <= 4) return 'bg-blue-500/15 text-blue-300 border border-blue-500/30';
  if (week <= 8) return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
  if (week <= 12) return 'bg-destructive/15 text-destructive border border-destructive/30';
  return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
}

export default function StrengthDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ completed: 0, incomplete: 0, total: 0 });
  const [lastWorkout, setLastWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const strengthProfile = profile as any;
  const discipline = strengthProfile?.discipline || 'MMA';
  const strengthLevel = strengthProfile?.strength_level || 'Beginner';
  const programStart = strengthProfile?.strength_program_start_date;
  const overrideActive = strengthProfile?.coach_override_enabled || false;
  const currentWeek = calcWeek(programStart);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);

    const { data: logs } = await supabase
      .from('workout_logs' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const allLogs = (logs || []) as any[];
    const completed = allLogs.filter((l: any) => l.status === 'completed').length;
    const incomplete = allLogs.filter((l: any) => l.status === 'incomplete').length;

    setStats({ completed, incomplete, total: allLogs.length });
    setLastWorkout(allLogs[0] || null);
    setLoading(false);
  };

  const startProgram = async () => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ strength_program_start_date: new Date().toISOString().split('T')[0] } as any)
      .eq('id', user.id);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Philosophy Quote */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-center italic text-foreground font-medium">
            "You are not training to be tired. You are training to be dangerous when tired."
          </p>
        </CardContent>
      </Card>

      {/* Profile Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Discipline</p>
            <p className="text-lg font-bold text-foreground">{discipline}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Level</p>
            <p className="text-lg font-bold text-foreground">{strengthLevel}</p>
            {overrideActive && (
              <Badge variant="outline" className="mt-1 text-xs border-primary text-primary">
                Coach Override
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Completed</p>
            <p className="text-2xl font-bold text-primary">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Week</p>
            <p className="text-2xl font-bold text-primary">
              {currentWeek ? Math.min(currentWeek, 12) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 12-Week Progress */}
      {programStart && currentWeek ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              12-Week Block Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Week {Math.min(currentWeek, 12)} of 12</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPhaseColor(currentWeek)}`}>
                  {getPhase(currentWeek)}
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${Math.min((currentWeek / 12) * 100, 100)}%` }}
                />
              </div>
              {currentWeek > 12 && (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-sm font-medium text-green-700">
                      🎉 Program Complete! Options: Repeat level, progress to next level, or await coach decision.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No 12-week program started yet.</p>
            <Button onClick={startProgram}>Start 12-Week Block Today</Button>
          </CardContent>
        </Card>
      )}

      {/* Last Workout */}
      {lastWorkout && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Last Workout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{lastWorkout.discipline} – {lastWorkout.level}</p>
                <p className="text-sm text-muted-foreground">
                  Status: {lastWorkout.status} • Week {lastWorkout.week_number || '?'}
                </p>
              </div>
              <Badge variant={lastWorkout.status === 'completed' ? 'default' : 'secondary'}>
                {lastWorkout.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-16 text-base"
          onClick={() => navigate('/strength?tab=templates')}
        >
          <Play className="mr-2 h-5 w-5" /> Start Workout
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-16 text-base"
          onClick={() => navigate('/strength?tab=history')}
        >
          <History className="mr-2 h-5 w-5" /> View History
        </Button>
      </div>
    </div>
  );
}
