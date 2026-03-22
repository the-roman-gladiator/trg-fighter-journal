import { useNavigate } from 'react-router-dom';
import { useGuidedPathway } from '@/hooks/useGuidedPathway';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Lock, CheckCircle2, Play, Circle, SkipForward } from 'lucide-react';

export default function PathwayProgress() {
  const navigate = useNavigate();
  const { assignment, plan, sessions, weeks, loading, getPhaseLabel, getPhaseColor } = useGuidedPathway();

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Loading pathway...</p></div>;
  }

  if (!plan || !assignment) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No active plan found. Go to My Plan to get started.</p>
        </CardContent>
      </Card>
    );
  }

  // Group sessions by week
  const weekGroups = new Map<number, typeof sessions>();
  sessions.forEach(s => {
    if (!weekGroups.has(s.week_number)) weekGroups.set(s.week_number, []);
    weekGroups.get(s.week_number)!.push(s);
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'available': case 'in_progress': return <Play className="h-4 w-4 text-primary" />;
      case 'skipped': return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      default: return <Lock className="h-4 w-4 text-muted-foreground/50" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <h2 className="text-base font-bold text-foreground">{plan.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={assignment.completion_percentage} className="h-2 flex-1" />
            <span className="text-xs font-medium text-muted-foreground">{Math.round(assignment.completion_percentage)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Week-by-Week Roadmap */}
      {Array.from(weekGroups.entries()).map(([weekNum, weekSessions]) => {
        const weekInfo = weeks.find(w => w.week_number === weekNum);
        const weekCompleted = weekSessions.filter(s => s.status === 'completed').length;
        const isCurrentWeek = weekNum === assignment.current_week;
        const allDone = weekCompleted === weekSessions.length;

        return (
          <Card key={weekNum} className={isCurrentWeek ? 'border-primary/40 ring-1 ring-primary/20' : ''}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    allDone ? 'bg-primary text-primary-foreground' :
                    isCurrentWeek ? 'bg-primary/20 text-primary border border-primary' :
                    'bg-muted/30 text-muted-foreground'
                  }`}>
                    {allDone ? '✓' : weekNum}
                  </div>
                  <div>
                    <CardTitle className="text-sm">Week {weekNum}</CardTitle>
                    {weekInfo && (
                      <p className="text-[10px] text-muted-foreground">{weekInfo.weekly_goal}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getPhaseColor(weekNum)}`}>
                    {getPhaseLabel(weekNum)}
                  </span>
                  <span className="text-xs text-muted-foreground">{weekCompleted}/{weekSessions.length}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2 ml-9">
                {weekSessions.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    {statusIcon(s.status)}
                    <span className={`text-sm flex-1 ${
                      s.status === 'completed' ? 'text-muted-foreground line-through' :
                      s.status === 'locked' ? 'text-muted-foreground/50' : 'text-foreground'
                    }`}>
                      {s.session_label || `Session ${s.session_number}`}
                    </span>
                    {(s.status === 'available' || s.status === 'in_progress') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => navigate(`/strength/workout/${s.workout_template_id}?pathway=${assignment.id}&progress=${s.id}`)}
                      >
                        Start
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Guidance Messages */}
      {assignment.status === 'completed' && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="font-bold text-green-700">🎉 12-Week Block Complete!</p>
            <p className="text-sm text-muted-foreground mt-1">Coach review required before progressing to the next level.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
