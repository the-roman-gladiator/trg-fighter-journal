import { useNavigate } from 'react-router-dom';
import { useGuidedPathway } from '@/hooks/useGuidedPathway';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Map, History, TrendingUp, Target, Dumbbell, Calendar } from 'lucide-react';

export default function MyPlan() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { assignment, plan, sessions, nextSession, loading, getPhaseLabel, getPhaseColor } = useGuidedPathway();

  const strengthProfile = profile as any;
  const discipline = strengthProfile?.discipline || 'MMA';
  const level = strengthProfile?.strength_level || 'Beginner';
  const overrideActive = strengthProfile?.coach_override_enabled || false;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading your plan...</p>
      </div>
    );
  }

  if (!plan || !assignment) {
    return (
      <div className="space-y-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 text-center space-y-3">
            <Dumbbell className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-lg font-bold">No Plan Assigned Yet</h2>
            <p className="text-sm text-muted-foreground">
              No matching pathway found for {discipline} – {level}. Contact your coach or check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentWeek = assignment.current_week;
  const completedCount = sessions.filter(s => s.status === 'completed').length;
  const totalSessions = sessions.length;
  const weekSessions = sessions.filter(s => s.week_number === currentWeek);
  const weekCompleted = weekSessions.filter(s => s.status === 'completed').length;
  const isCompleted = assignment.status === 'completed';

  return (
    <div className="space-y-4">
      {/* Philosophy */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <p className="text-center italic text-foreground text-sm font-medium">
            "You are not training to be tired. You are training to be dangerous when tired."
          </p>
        </CardContent>
      </Card>

      {/* Plan Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base">{plan.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
            </div>
            {overrideActive && (
              <Badge variant="outline" className="text-xs border-primary text-primary shrink-0">
                Coach Override
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Discipline</p>
              <p className="text-sm font-bold">{discipline}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Level</p>
              <p className="text-sm font-bold">{level}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Week</p>
              <p className="text-sm font-bold">{Math.min(currentWeek, 12)} / 12</p>
            </div>
          </div>

          {/* Phase Badge */}
          <div className="flex justify-center mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPhaseColor(currentWeek)}`}>
              {getPhaseLabel(currentWeek)}
            </span>
          </div>

          {/* Block Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedCount} of {totalSessions} sessions</span>
              <span>{Math.round(assignment.completion_percentage)}%</span>
            </div>
            <Progress value={assignment.completion_percentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* This Week Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Week {Math.min(currentWeek, 12)} Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-3">
            <Progress value={weekSessions.length > 0 ? (weekCompleted / weekSessions.length) * 100 : 0} className="h-2 flex-1" />
            <span className="text-xs font-medium text-muted-foreground">{weekCompleted}/{weekSessions.length}</span>
          </div>
          <div className="space-y-2">
            {weekSessions.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  s.status === 'completed' ? 'bg-primary text-primary-foreground' :
                  s.status === 'available' || s.status === 'in_progress' ? 'bg-primary/20 text-primary border border-primary' :
                  'bg-muted/30 text-muted-foreground'
                }`}>
                  {s.status === 'completed' ? '✓' : i + 1}
                </div>
                <span className={s.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}>
                  {s.session_label || `Session ${s.session_number}`}
                </span>
                {(s.status === 'available' || s.status === 'in_progress') && (
                  <Badge className="text-[10px] ml-auto">Next</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Session CTA */}
      {!isCompleted && nextSession ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-5">
            <div className="text-center space-y-3">
              <Target className="h-8 w-8 mx-auto text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Today's Session</p>
                <p className="text-lg font-bold text-foreground">
                  {nextSession.session_label || `Session ${nextSession.session_number}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Week {nextSession.week_number} · Session {nextSession.session_number} · {getPhaseLabel(nextSession.week_number)}
                </p>
              </div>
              <Button
                size="lg"
                className="w-full h-14 text-base font-bold"
                onClick={() => navigate(`/strength/workout/${nextSession.workout_template_id}?pathway=${assignment.id}&progress=${nextSession.id}`)}
              >
                <Play className="mr-2 h-5 w-5" /> Start Today's Session
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isCompleted ? (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-5 pb-5 text-center space-y-2">
            <p className="text-lg font-bold text-green-700">🎉 12-Week Block Complete!</p>
            <p className="text-sm text-muted-foreground">
              Options: Repeat current level, progress to next level, or await coach decision.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="h-12" onClick={() => navigate('/strength?tab=progress')}>
          <Map className="mr-2 h-4 w-4" /> View Pathway
        </Button>
        <Button variant="secondary" className="h-12" onClick={() => navigate('/strength?tab=history')}>
          <History className="mr-2 h-4 w-4" /> View History
        </Button>
      </div>
    </div>
  );
}
