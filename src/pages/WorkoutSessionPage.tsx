import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Copy, ChevronDown, ChevronUp, SkipForward, Save, CheckCircle2 } from 'lucide-react';

interface SetLog {
  setNumber: number;
  targetReps: number | null;
  completedReps: number | null;
  targetWeight: number | null;
  usedWeight: number | null;
  targetDuration: string | null;
  completedDuration: string | null;
  isCompleted: boolean;
  notes: string;
}

interface ExerciseLog {
  exerciseName: string;
  exerciseOrder: number;
  isSkipped: boolean;
  isOpen: boolean;
  sets: SetLog[];
}

export default function WorkoutSessionPage() {
  const { templateId, logId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const pathwayAssignmentId = searchParams.get('pathway');
  const pathwayProgressId = searchParams.get('progress');

  const [templateName, setTemplateName] = useState('');
  const [templateGoal, setTemplateGoal] = useState('');
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [overallNotes, setOverallNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingLogId, setExistingLogId] = useState<string | null>(logId || null);

  const strengthProfile = profile as any;
  const discipline = strengthProfile?.discipline || 'MMA';
  const strengthLevel = strengthProfile?.strength_level || 'Beginner';
  const programStart = strengthProfile?.strength_program_start_date;

  const currentWeek = programStart
    ? Math.floor((new Date().getTime() - new Date(programStart).getTime()) / 86400000 / 7) + 1
    : 1;

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (logId) {
      loadExistingLog(logId);
    } else if (templateId) {
      loadTemplate(templateId);
    }
  }, [user, templateId, logId]);

  const loadTemplate = async (tid: string) => {
    setLoading(true);
    const { data: template } = await supabase
      .from('workout_templates')
      .select('*, workout_template_exercises(*)')
      .eq('id', tid)
      .single();

    if (!template) {
      toast({ title: 'Error', description: 'Template not found', variant: 'destructive' });
      navigate('/strength');
      return;
    }

    const t = template as any;
    setTemplateName(t.name);
    setTemplateGoal(t.goal || '');

    const templateExercises = (t.workout_template_exercises || [])
      .sort((a: any, b: any) => a.exercise_order - b.exercise_order);

    // Check for previous session data for weight suggestions
    const { data: prevLogs } = await supabase
      .from('workout_log_exercises' as any)
      .select('exercise_name, used_weight, completed_reps')
      .eq('is_completed', true)
      .order('created_at', { ascending: false })
      .limit(100);

    const prevWeights: Record<string, number> = {};
    ((prevLogs || []) as any[]).forEach((l: any) => {
      if (!prevWeights[l.exercise_name] && l.used_weight) {
        prevWeights[l.exercise_name] = l.used_weight;
      }
    });

    const exerciseLogs: ExerciseLog[] = templateExercises.map((ex: any, i: number) => {
      const numSets = ex.default_sets || 1;
      const suggestedWeight = prevWeights[ex.exercise_name] || ex.default_weight || null;

      const sets: SetLog[] = Array.from({ length: numSets }, (_, si) => ({
        setNumber: si + 1,
        targetReps: ex.default_reps || null,
        completedReps: null,
        targetWeight: suggestedWeight,
        usedWeight: suggestedWeight,
        targetDuration: ex.default_duration || null,
        completedDuration: null,
        isCompleted: false,
        notes: '',
      }));

      return {
        exerciseName: ex.exercise_name,
        exerciseOrder: i,
        isSkipped: false,
        isOpen: i === 0,
        sets,
      };
    });

    setExercises(exerciseLogs);
    setLoading(false);
  };

  const loadExistingLog = async (lid: string) => {
    setLoading(true);
    const { data: log } = await supabase
      .from('workout_logs' as any)
      .select('*')
      .eq('id', lid)
      .single();

    if (!log) {
      toast({ title: 'Error', description: 'Workout log not found', variant: 'destructive' });
      navigate('/strength');
      return;
    }

    const l = log as any;
    setTemplateName(`${l.discipline} – ${l.level}`);
    setOverallNotes(l.overall_notes || '');
    setExistingLogId(lid);

    const { data: logExercises } = await supabase
      .from('workout_log_exercises' as any)
      .select('*')
      .eq('workout_log_id', lid)
      .order('exercise_order')
      .order('set_number');

    const exerciseMap = new Map<string, ExerciseLog>();
    ((logExercises || []) as any[]).forEach((le: any) => {
      const key = `${le.exercise_order}-${le.exercise_name}`;
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, {
          exerciseName: le.exercise_name,
          exerciseOrder: le.exercise_order,
          isSkipped: le.is_skipped || false,
          isOpen: false,
          sets: [],
        });
      }
      exerciseMap.get(key)!.sets.push({
        setNumber: le.set_number,
        targetReps: le.target_reps,
        completedReps: le.completed_reps,
        targetWeight: le.target_weight,
        usedWeight: le.used_weight,
        targetDuration: le.target_duration,
        completedDuration: le.completed_duration,
        isCompleted: le.is_completed || false,
        notes: le.notes || '',
      });
    });

    const exerciseArr = Array.from(exerciseMap.values());
    if (exerciseArr.length > 0) exerciseArr[0].isOpen = true;
    setExercises(exerciseArr);
    setLoading(false);
  };

  const addSet = (exIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const ex = { ...updated[exIndex] };
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets = [...ex.sets, {
        setNumber: ex.sets.length + 1,
        targetReps: lastSet?.targetReps || null,
        completedReps: lastSet?.completedReps || lastSet?.targetReps || null,
        targetWeight: lastSet?.targetWeight || null,
        usedWeight: lastSet?.usedWeight || lastSet?.targetWeight || null,
        targetDuration: lastSet?.targetDuration || null,
        completedDuration: lastSet?.completedDuration || null,
        isCompleted: false,
        notes: '',
      }];
      updated[exIndex] = ex;
      return updated;
    });
  };

  const duplicateLastSet = (exIndex: number) => addSet(exIndex);

  const updateSet = (exIndex: number, setIndex: number, field: keyof SetLog, value: any) => {
    setExercises(prev => {
      const updated = [...prev];
      const ex = { ...updated[exIndex] };
      const sets = [...ex.sets];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      ex.sets = sets;
      updated[exIndex] = ex;
      return updated;
    });
  };

  const toggleSkip = (exIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exIndex] = { ...updated[exIndex], isSkipped: !updated[exIndex].isSkipped };
      return updated;
    });
  };

  const toggleOpen = (exIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exIndex] = { ...updated[exIndex], isOpen: !updated[exIndex].isOpen };
      return updated;
    });
  };

  const calcTotals = useCallback(() => {
    let totalSets = 0, totalReps = 0, totalLoad = 0;
    exercises.forEach(ex => {
      if (ex.isSkipped) return;
      ex.sets.forEach(s => {
        if (s.isCompleted || s.completedReps) {
          totalSets++;
          const reps = s.completedReps || 0;
          const weight = s.usedWeight || 0;
          totalReps += reps;
          totalLoad += reps * weight;
        }
      });
    });
    return { totalSets, totalReps, totalLoad, totalExercises: exercises.filter(e => !e.isSkipped).length };
  }, [exercises]);

  const saveWorkout = async (status: 'in_progress' | 'incomplete' | 'completed') => {
    if (!user) return;
    setSaving(true);

    try {
      const totals = calcTotals();
      const completedSets = exercises.reduce((acc, ex) =>
        acc + (ex.isSkipped ? 0 : ex.sets.filter(s => s.isCompleted).length), 0);
      const totalSetsCount = exercises.reduce((acc, ex) =>
        acc + (ex.isSkipped ? 0 : ex.sets.length), 0);
      const completionPct = totalSetsCount > 0 ? Math.round((completedSets / totalSetsCount) * 100) : 0;

      let wLogId = existingLogId;

      if (!wLogId) {
        const { data: newLog, error: logError } = await supabase
          .from('workout_logs' as any)
          .insert({
            user_id: user.id,
            workout_template_id: templateId || null,
            discipline,
            level: strengthLevel,
            week_number: Math.min(currentWeek, 12),
            status,
            started_at: new Date().toISOString(),
            completed_at: status === 'completed' ? new Date().toISOString() : null,
            overall_notes: overallNotes,
            completion_percentage: completionPct,
          } as any)
          .select('id')
          .single();

        if (logError) throw logError;
        wLogId = (newLog as any).id;
        setExistingLogId(wLogId);
      } else {
        await supabase
          .from('workout_logs' as any)
          .update({
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
            overall_notes: overallNotes,
            completion_percentage: completionPct,
          } as any)
          .eq('id', wLogId);

        // Delete existing exercises to re-insert
        await supabase
          .from('workout_log_exercises' as any)
          .delete()
          .eq('workout_log_id', wLogId);
      }

      // Insert all exercise sets
      const rows: any[] = [];
      exercises.forEach(ex => {
        ex.sets.forEach(s => {
          rows.push({
            workout_log_id: wLogId,
            exercise_name: ex.exerciseName,
            exercise_order: ex.exerciseOrder,
            set_number: s.setNumber,
            target_reps: s.targetReps,
            completed_reps: s.completedReps,
            target_weight: s.targetWeight,
            used_weight: s.usedWeight,
            target_duration: s.targetDuration,
            completed_duration: s.completedDuration,
            is_completed: s.isCompleted,
            is_skipped: ex.isSkipped,
            notes: s.notes,
          });
        });
      });

      if (rows.length > 0) {
        const { error: exError } = await supabase
          .from('workout_log_exercises' as any)
          .insert(rows);
        if (exError) throw exError;
      }

      const statusLabels = {
        in_progress: 'Draft saved',
        incomplete: 'Saved as incomplete',
        completed: 'Workout completed! 💪',
      };

      toast({ title: 'Success', description: statusLabels[status] });

      if (status === 'completed') {
        navigate('/strength');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const totals = calcTotals();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading workout...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/strength')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="flex justify-between items-center mt-1">
            <div>
              <h1 className="text-lg font-bold text-foreground">{templateName}</h1>
              {templateGoal && <p className="text-xs text-muted-foreground">{templateGoal}</p>}
            </div>
            <Badge variant="outline">Week {Math.min(currentWeek, 12)}</Badge>
          </div>
        </div>
      </header>

      {/* Live Totals */}
      <div className="sticky top-[88px] z-10 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-2 flex justify-around text-center">
          <div>
            <p className="text-xs text-muted-foreground">Exercises</p>
            <p className="text-sm font-bold">{totals.totalExercises}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sets</p>
            <p className="text-sm font-bold">{totals.totalSets}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reps</p>
            <p className="text-sm font-bold">{totals.totalReps}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Load</p>
            <p className="text-sm font-bold">{totals.totalLoad.toLocaleString()} kg</p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-4 space-y-3">
        {exercises.map((ex, exIndex) => (
          <Card key={exIndex} className={`${ex.isSkipped ? 'opacity-50' : ''}`}>
            <Collapsible open={ex.isOpen} onOpenChange={() => toggleOpen(exIndex)}>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center">
                        {exIndex + 1}
                      </span>
                      <CardTitle className="text-sm text-left">{ex.exerciseName}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {ex.isSkipped && <Badge variant="secondary" className="text-xs">Skipped</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {ex.sets.filter(s => s.isCompleted).length}/{ex.sets.length} sets
                      </span>
                      {ex.isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 px-4 pb-4">
                  {!ex.isSkipped && (
                    <div className="space-y-2">
                      {/* Set Header */}
                      <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground px-1">
                        <span className="col-span-1">Set</span>
                        <span className="col-span-2">Target</span>
                        <span className="col-span-3">Reps</span>
                        <span className="col-span-3">Weight</span>
                        <span className="col-span-3 text-center">Done</span>
                      </div>

                      {ex.sets.map((set, setIndex) => (
                        <div key={setIndex} className={`grid grid-cols-12 gap-1 items-center p-1 rounded ${set.isCompleted ? 'bg-primary/5' : ''}`}>
                          <span className="col-span-1 text-xs font-medium text-center">{set.setNumber}</span>
                          <span className="col-span-2 text-xs text-muted-foreground">
                            {set.targetReps ? `${set.targetReps}r` : ''}
                            {set.targetDuration ? set.targetDuration : ''}
                          </span>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              placeholder="Reps"
                              value={set.completedReps ?? ''}
                              onChange={(e) => updateSet(exIndex, setIndex, 'completedReps', e.target.value ? Number(e.target.value) : null)}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              placeholder="kg"
                              value={set.usedWeight ?? ''}
                              onChange={(e) => updateSet(exIndex, setIndex, 'usedWeight', e.target.value ? Number(e.target.value) : null)}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="col-span-3 flex justify-center">
                            <Checkbox
                              checked={set.isCompleted}
                              onCheckedChange={(checked) => updateSet(exIndex, setIndex, 'isCompleted', !!checked)}
                            />
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => addSet(exIndex)}>
                          <Plus className="mr-1 h-3 w-3" /> Add Set
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => duplicateLastSet(exIndex)}>
                          <Copy className="mr-1 h-3 w-3" /> Duplicate
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      onClick={() => toggleSkip(exIndex)}
                    >
                      <SkipForward className="mr-1 h-3 w-3" />
                      {ex.isSkipped ? 'Unskip' : 'Skip Exercise'}
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {/* Overall Notes */}
        <Card>
          <CardContent className="pt-4">
            <Textarea
              placeholder="Workout notes (optional)..."
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>
      </main>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-20">
        <div className="container mx-auto flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={saving}
            onClick={() => saveWorkout('in_progress')}
          >
            <Save className="mr-1 h-4 w-4" /> Save Draft
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={saving}
            onClick={() => saveWorkout('incomplete')}
          >
            Save Incomplete
          </Button>
          <Button
            className="flex-1"
            disabled={saving}
            onClick={() => saveWorkout('completed')}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Finish
          </Button>
        </div>
      </div>
    </div>
  );
}
