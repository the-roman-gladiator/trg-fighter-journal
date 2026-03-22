import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { StrengthExerciseState, StrengthSetState, StrengthWorkoutTotals, ExerciseLibraryItem, WorkoutMode } from '@/types/training';
import { Plus, Trash2, Dumbbell, QrCode, BookOpen, PenLine } from 'lucide-react';

interface StrengthWorkoutFormProps {
  sessionId?: string;
  userId: string;
  workoutName: string;
  setWorkoutName: (v: string) => void;
  workoutType: string;
  setWorkoutType: (v: string) => void;
  workoutMode: WorkoutMode;
  setWorkoutMode: (v: WorkoutMode) => void;
  exercises: StrengthExerciseState[];
  setExercises: (e: StrengthExerciseState[]) => void;
  totals: StrengthWorkoutTotals;
}

export function StrengthWorkoutForm({
  sessionId, userId, workoutName, setWorkoutName, workoutType, setWorkoutType,
  workoutMode, setWorkoutMode, exercises, setExercises, totals
}: StrengthWorkoutFormProps) {
  const { toast } = useToast();
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryItem[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState('');

  useEffect(() => {
    fetchExerciseLibrary();
    fetchTemplates();
  }, []);

  const fetchExerciseLibrary = async () => {
    const { data } = await supabase.from('exercise_library').select('*').order('name');
    if (data) setExerciseLibrary(data as ExerciseLibraryItem[]);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from('workout_templates').select('*').order('name');
    if (data) setTemplates(data);
  };

  const filteredLibrary = useMemo(() => {
    if (!searchQuery) return exerciseLibrary;
    return exerciseLibrary.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [exerciseLibrary, searchQuery]);

  const addExerciseFromLibrary = (item: ExerciseLibraryItem) => {
    const newExercise: StrengthExerciseState = {
      exerciseName: item.name,
      exerciseLibraryId: item.id,
      sets: [{ setNumber: 1, reps: null, weight: null }],
    };
    setExercises([...exercises, newExercise]);
    setShowExerciseSearch(false);
    setSearchQuery('');
  };

  const addCustomExercise = () => {
    if (!customExerciseName.trim()) return;
    const newExercise: StrengthExerciseState = {
      exerciseName: customExerciseName.trim(),
      sets: [{ setNumber: 1, reps: null, weight: null }],
    };
    setExercises([...exercises, newExercise]);
    setCustomExerciseName('');
    setShowExerciseSearch(false);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const addSet = (exerciseIndex: number) => {
    const updated = [...exercises];
    const ex = updated[exerciseIndex];
    const lastSet = ex.sets[ex.sets.length - 1];
    const newSet: StrengthSetState = {
      setNumber: ex.sets.length + 1,
      reps: lastSet ? lastSet.reps : null,
      weight: lastSet ? lastSet.weight : null,
    };
    ex.sets.push(newSet);
    setExercises(updated);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets = updated[exerciseIndex].sets
      .filter((_, i) => i !== setIndex)
      .map((s, i) => ({ ...s, setNumber: i + 1 }));
    setExercises(updated);
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    const updated = [...exercises];
    const numVal = value === '' ? null : Number(value);
    updated[exerciseIndex].sets[setIndex][field] = numVal;
    setExercises(updated);
  };

  const loadTemplate = async (templateId: string) => {
    const { data: template } = await supabase.from('workout_templates').select('*').eq('id', templateId).single();
    const { data: templateExercises } = await supabase
      .from('workout_template_exercises')
      .select('*')
      .eq('workout_template_id', templateId)
      .order('exercise_order');

    if (template && templateExercises) {
      setWorkoutName(template.name);
      setWorkoutType(template.workout_type || '');
      const loadedExercises: StrengthExerciseState[] = templateExercises.map((te: any) => {
        const sets: StrengthSetState[] = [];
        for (let i = 0; i < (te.default_sets || 3); i++) {
          sets.push({
            setNumber: i + 1,
            reps: te.default_reps || null,
            weight: te.default_weight || null,
          });
        }
        return {
          exerciseName: te.exercise_name,
          exerciseLibraryId: te.exercise_library_id || undefined,
          sets,
        };
      });
      setExercises(loadedExercises);
      toast({ title: 'Template loaded', description: `Loaded "${template.name}" — edit freely` });
    }
  };

  const saveAsTemplate = async () => {
    if (!workoutName.trim() || exercises.length === 0) {
      toast({ title: 'Cannot save template', description: 'Add a name and at least one exercise', variant: 'destructive' });
      return;
    }

    const { data: tmpl, error } = await supabase.from('workout_templates').insert({
      user_id: userId,
      name: workoutName,
      workout_type: workoutType || null,
      source_type: 'manual',
    }).select().single();

    if (error || !tmpl) {
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
      return;
    }

    const templateExercises = exercises.map((ex, i) => ({
      workout_template_id: tmpl.id,
      exercise_name: ex.exerciseName,
      exercise_library_id: ex.exerciseLibraryId || null,
      exercise_order: i,
      default_sets: ex.sets.length,
      default_reps: ex.sets[0]?.reps || 10,
      default_weight: ex.sets[0]?.weight || 0,
    }));

    await supabase.from('workout_template_exercises').insert(templateExercises);
    toast({ title: 'Template saved', description: `"${workoutName}" saved to library` });
    fetchTemplates();
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <Card>
        <CardHeader><CardTitle className="text-base">Workout Mode</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={workoutMode === 'manual' ? 'default' : 'outline'}
              onClick={() => setWorkoutMode('manual')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <PenLine className="h-5 w-5" />
              <span className="text-xs">Manual</span>
            </Button>
            <Button
              type="button"
              variant={workoutMode === 'template' ? 'default' : 'outline'}
              onClick={() => setWorkoutMode('template')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-xs">Library</span>
            </Button>
            <Button
              type="button"
              variant={workoutMode === 'qr' ? 'default' : 'outline'}
              onClick={() => setWorkoutMode('qr')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <QrCode className="h-5 w-5" />
              <span className="text-xs">QR Code</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Picker */}
      {workoutMode === 'template' && (
        <Card>
          <CardContent className="pt-6">
            <Label>Choose Template</Label>
            <Select onValueChange={loadTemplate}>
              <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">No templates yet. Create a workout and save it as a template.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* QR Placeholder */}
      {workoutMode === 'qr' && (
        <Card>
          <CardContent className="pt-6 text-center">
            <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">QR scanning coming soon. Use manual or template mode for now.</p>
          </CardContent>
        </Card>
      )}

      {/* Workout Header */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div>
            <Label>Workout Name</Label>
            <Input value={workoutName} onChange={e => setWorkoutName(e.target.value)} placeholder="e.g., Push Day A" />
          </div>
          <div>
            <Label>Workout Type</Label>
            <Input value={workoutType} onChange={e => setWorkoutType(e.target.value)} placeholder="e.g., Upper Body, Push/Pull, Full Body" />
          </div>
        </CardContent>
      </Card>

      {/* Exercise Builder */}
      {exercises.map((exercise, exIdx) => (
        <Card key={exIdx}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                {exercise.exerciseName}
              </CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeExercise(exIdx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center text-xs text-muted-foreground font-medium">
              <span className="w-8 text-center">Set</span>
              <span>Reps</span>
              <span>Weight (kg)</span>
              <span className="w-8"></span>
            </div>
            {exercise.sets.map((set, setIdx) => (
              <div key={setIdx} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                <span className="w-8 text-center text-sm font-medium text-muted-foreground">{set.setNumber}</span>
                <Input
                  type="number"
                  min="0"
                  value={set.reps ?? ''}
                  onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                  placeholder="Reps"
                  className="h-9"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={set.weight ?? ''}
                  onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                  placeholder="kg"
                  className="h-9"
                />
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={() => removeSet(exIdx, setIdx)}
                  className="w-8 h-8 p-0"
                  disabled={exercise.sets.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addSet(exIdx)} className="w-full">
              <Plus className="h-3 w-3 mr-1" /> Add Set
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Add Exercise */}
      {!showExerciseSearch ? (
        <Button type="button" variant="outline" onClick={() => setShowExerciseSearch(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Add Exercise
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredLibrary.map(item => (
                <Button
                  key={item.id} type="button" variant="ghost"
                  className="w-full justify-start text-sm h-auto py-2"
                  onClick={() => addExerciseFromLibrary(item)}
                >
                  <span>{item.name}</span>
                  {item.muscle_group && <span className="text-xs text-muted-foreground ml-2">({item.muscle_group})</span>}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Or type custom exercise..."
                value={customExerciseName}
                onChange={e => setCustomExerciseName(e.target.value)}
              />
              <Button type="button" size="sm" onClick={addCustomExercise} disabled={!customExerciseName.trim()}>Add</Button>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowExerciseSearch(false); setSearchQuery(''); }} className="w-full">
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Live Totals */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{totals.totalExercises}</p>
              <p className="text-xs text-muted-foreground">Exercises</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{totals.totalSets}</p>
              <p className="text-xs text-muted-foreground">Sets</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{totals.totalReps}</p>
              <p className="text-xs text-muted-foreground">Reps</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{totals.totalLoad.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Load (kg)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save as template */}
      <Button type="button" variant="outline" onClick={saveAsTemplate} className="w-full">
        <BookOpen className="h-4 w-4 mr-2" /> Save as Template
      </Button>
    </div>
  );
}
