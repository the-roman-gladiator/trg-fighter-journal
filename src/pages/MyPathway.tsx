import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Lock, CheckCircle, Circle, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { CARDIO_WORKOUTS, CARDIO_ROTATION } from '@/data/cardioWorkouts';
import { STRENGTH_WORKOUTS, STRENGTH_ROTATION, getStrengthUnlockStatus } from '@/data/strengthWorkouts';
import { format, subDays } from 'date-fns';

interface PhaseInfo {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'unlocked' | 'locked' | 'completed';
  sessionsCompleted: number;
  sessionsRequired: number;
  progressPercent: number;
  workouts: { id: string; title: string; type: string }[];
  unlockRequirement?: string;
}

export default function MyPathway() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phases, setPhases] = useState<PhaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadPathway();
  }, [user]);

  const loadPathway = async () => {
    if (!user) return;

    // Count completed cardio sessions
    const { data: cardioSessions } = await supabase
      .from('training_sessions')
      .select('id, intensity')
      .eq('user_id', user.id)
      .eq('discipline', 'Cardio Activity')
      .eq('session_type', 'Completed');

    const completedCardio = (cardioSessions || []).length;

    // Count recent skips (sessions in last 14 days with no completion)
    const fourteenDaysAgo = subDays(new Date(), 14).toISOString().split('T')[0];
    const recentRpe = (cardioSessions || [])
      .filter((s: any) => s.intensity)
      .map((s: any) => s.intensity as number);
    
    const strengthUnlock = getStrengthUnlockStatus(completedCardio, 0, recentRpe.length > 0 ? recentRpe.reduce((a, b) => a + b, 0) / recentRpe.length : 5);

    // Count completed strength sessions
    const { data: strengthSessions } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('discipline', 'Strength Training')
      .eq('session_type', 'Completed');

    const completedStrength = (strengthSessions || []).length;

    // Upcoming scheduled sessions
    const { data: upcoming } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'Planned')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(10);

    setRecentSessions(upcoming || []);

    // Build phases
    const cardioPhase: PhaseInfo = {
      id: 'EARLY_BEGINNER_CARDIO',
      name: 'Early Beginner – Cardio Base',
      description: 'Build base conditioning and movement tolerance',
      status: completedCardio >= 8 ? 'completed' : 'active',
      sessionsCompleted: completedCardio,
      sessionsRequired: 8,
      progressPercent: Math.min(100, Math.round((completedCardio / 8) * 100)),
      workouts: CARDIO_WORKOUTS.map(w => ({ id: w.id, title: w.title, type: 'Cardio' })),
    };

    const strengthPhase: PhaseInfo = {
      id: 'BEGINNER_STRENGTH',
      name: 'Beginner Strength Phase',
      description: 'Develop foundational full-body strength for martial arts',
      status: strengthUnlock.unlocked ? (completedStrength >= 12 ? 'completed' : 'active') : 'locked',
      sessionsCompleted: completedStrength,
      sessionsRequired: 12,
      progressPercent: Math.min(100, Math.round((completedStrength / 12) * 100)),
      workouts: STRENGTH_WORKOUTS.map(w => ({ id: w.id, title: w.title, type: 'Strength' })),
      unlockRequirement: 'Complete 8 cardio sessions with stable fatigue',
    };

    const intermediatePhase: PhaseInfo = {
      id: 'INTERMEDIATE_STRENGTH',
      name: 'Intermediate Strength Phase',
      description: 'Progress to compound movements and increased load',
      status: 'locked',
      sessionsCompleted: 0,
      sessionsRequired: 12,
      progressPercent: 0,
      workouts: [],
      unlockRequirement: 'Complete 12 Beginner Strength sessions with stable fatigue',
    };

    const advancedPhase: PhaseInfo = {
      id: 'ADVANCED_STRENGTH',
      name: 'Advanced Strength Phase',
      description: 'Peak power, explosive training, and sport-specific strength',
      status: 'locked',
      sessionsCompleted: 0,
      sessionsRequired: 12,
      progressPercent: 0,
      workouts: [],
      unlockRequirement: 'Complete 12 Intermediate Strength sessions',
    };

    setPhases([cardioPhase, strengthPhase, intermediatePhase, advancedPhase]);
    // Auto-expand active phase
    const active = [cardioPhase, strengthPhase, intermediatePhase, advancedPhase].find(p => p.status === 'active');
    if (active) setExpandedPhase(active.id);
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'active') return <Play className="h-5 w-5 text-primary" />;
    if (status === 'unlocked') return <Circle className="h-5 w-5 text-primary" />;
    return <Lock className="h-5 w-5 text-muted-foreground" />;
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return 'border-green-500/30 bg-green-500/5';
    if (status === 'active') return 'border-primary/30 bg-primary/5';
    return 'border-border';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <h1 className="text-xl font-bold mt-2">My Pathway</h1>
          <p className="text-sm text-muted-foreground">Your progression roadmap</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg space-y-4">
        {/* Philosophy */}
        <Card className="bg-card border-primary/10">
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground italic text-center">
              "Progress is not given. It is earned session by session."
            </p>
          </CardContent>
        </Card>

        {/* Phase Roadmap */}
        <div className="space-y-3">
          {phases.map((phase, idx) => (
            <div key={phase.id}>
              {/* Connector line */}
              {idx > 0 && (
                <div className="flex justify-center -my-1">
                  <div className={`w-0.5 h-4 ${phase.status === 'locked' ? 'bg-muted' : 'bg-primary'}`} />
                </div>
              )}
              <Card
                className={`cursor-pointer transition-colors ${statusColor(phase.status)}`}
                onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    {statusIcon(phase.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{phase.name}</h3>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {phase.status === 'completed' ? 'Done' : phase.status === 'active' ? 'Active' : phase.status === 'unlocked' ? 'Ready' : 'Locked'}
                        </Badge>
                      </div>
                      {phase.status !== 'locked' && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{phase.sessionsCompleted}/{phase.sessionsRequired} sessions</span>
                            <span>{phase.progressPercent}%</span>
                          </div>
                          <Progress value={phase.progressPercent} className="h-2" />
                        </div>
                      )}
                      {phase.status === 'locked' && phase.unlockRequirement && (
                        <p className="text-xs text-muted-foreground mt-1">{phase.unlockRequirement}</p>
                      )}
                    </div>
                    {expandedPhase === phase.id ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>

                  {/* Expanded content */}
                  {expandedPhase === phase.id && phase.workouts.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border space-y-2">
                      <p className="text-xs text-muted-foreground">{phase.description}</p>
                      {phase.workouts.map(w => (
                        <div key={w.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/10">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{w.type}</Badge>
                            <span className="text-sm">{w.title}</span>
                          </div>
                          {(phase.status === 'active' || phase.status === 'unlocked' || phase.status === 'completed') && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={(e) => { e.stopPropagation(); navigate(`/guided-session/${w.id}`); }}>
                              <Play className="h-3 w-3 mr-1" /> Go
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {expandedPhase === phase.id && phase.status === 'locked' && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <p className="text-sm text-muted-foreground text-center">
                        🔒 Complete the previous phase to unlock this level.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Upcoming Scheduled */}
        {recentSessions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming Scheduled</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentSessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{s.title || s.discipline}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(s.date), 'MMM d, yyyy')}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{s.discipline}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Brand message */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 text-center">
            <p className="text-sm font-semibold text-primary italic">
              "You built the engine. Now you build the weapon."
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
