import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Discipline, MartialArtsDiscipline, Strategy, TechniqueChain, WorkoutMode, CardioType, StrengthExerciseState, StrengthWorkoutTotals, isMartialArt } from '@/types/training';
import { disciplines, sessionTypes, feelings, strategies, getFirstMovements } from '@/config/dropdownOptions';
import { TechniqueChainForm } from './TechniqueChainForm';
import { StrengthWorkoutForm } from './StrengthWorkoutForm';
import { TagSelector } from './TagSelector';
import { CardioActivityForm } from './CardioActivityForm';
import { Plus, Trash2 } from 'lucide-react';

interface SessionFormProps {
  sessionId?: string;
}

export function SessionForm({ sessionId }: SessionFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [sessionType, setSessionType] = useState<'Planned' | 'Completed'>('Completed');
  const [discipline, setDiscipline] = useState<Discipline>('MMA');
  const [title, setTitle] = useState('');
  const [intensity, setIntensity] = useState<number>(5);
  const [feeling, setFeeling] = useState<string>('Normal');
  const [strategy, setStrategy] = useState<Strategy | ''>('');
  const [firstMovement, setFirstMovement] = useState<string>('');
  const [opponentAction, setOpponentAction] = useState<string>('');
  const [secondMovement, setSecondMovement] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [techniqueChains, setTechniqueChains] = useState<TechniqueChain[]>([]);
  const [showTechniqueForm, setShowTechniqueForm] = useState(false);
  const [editingTechniqueId, setEditingTechniqueId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Strength training state
  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState('');
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('manual');
  const [exercises, setExercises] = useState<StrengthExerciseState[]>([]);

  // Cardio state
  const [cardioActivityName, setCardioActivityName] = useState('');
  const [cardioType, setCardioType] = useState<CardioType | ''>('');
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [calories, setCalories] = useState<number | null>(null);
  const [avgPace, setAvgPace] = useState<number | null>(null);
  const [avgHeartRate, setAvgHeartRate] = useState<number | null>(null);
  const [maxHeartRate, setMaxHeartRate] = useState<number | null>(null);

  const totals: StrengthWorkoutTotals = useMemo(() => {
    let totalLoad = 0, totalReps = 0, totalSets = 0;
    exercises.forEach(ex => {
      ex.sets.forEach(s => {
        totalSets++;
        totalReps += s.reps || 0;
        totalLoad += (s.reps || 0) * (s.weight || 0);
      });
    });
    return { totalLoad, totalReps, totalSets, totalExercises: exercises.length };
  }, [exercises]);

  useEffect(() => {
    if (sessionId && sessionId !== 'new') {
      fetchSession();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    if (!sessionId || sessionId === 'new') return;

    const { data: session, error } = await supabase
      .from('training_sessions')
      .select(`*, technique_chains (*)`)
      .eq('id', sessionId)
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to load session', variant: 'destructive' });
      return;
    }

    if (session) {
      setDate(session.date);
      setTime(session.time || '');
      setSessionType(session.session_type as 'Planned' | 'Completed');
      setDiscipline(session.discipline as Discipline);
      setTitle(session.title || '');
      setIntensity(session.intensity || 5);
      setFeeling(session.feeling || 'Normal');
      setStrategy((session.strategy as Strategy) || '');
      setFirstMovement(session.first_movement || '');
      setOpponentAction(session.opponent_action || '');
      setSecondMovement(session.second_movement || '');
      setNotes(session.notes || '');
      setTechniqueChains((session.technique_chains as TechniqueChain[]) || []);

      // Load tags
      const { data: sessionTagsData } = await supabase
        .from('session_tags')
        .select('tag_id, tags(name)')
        .eq('session_id', sessionId);
      if (sessionTagsData) {
        setSelectedTags(sessionTagsData.map((st: any) => st.tags?.name).filter(Boolean));
      }

      setWorkoutName(session.workout_name || '');
      setWorkoutType(session.workout_type || '');
      setWorkoutMode((session.workout_mode as WorkoutMode) || 'manual');

      // Cardio fields
      setCardioActivityName(session.cardio_activity_name || '');
      setCardioType((session.cardio_type as CardioType) || '');
      setDurationSeconds(session.duration_seconds);
      setDistanceMeters(session.distance_meters ? Number(session.distance_meters) : null);
      setCalories(session.calories);
      setAvgPace(session.avg_pace_seconds_per_km ? Number(session.avg_pace_seconds_per_km) : null);
      setAvgHeartRate(session.avg_heart_rate);
      setMaxHeartRate(session.max_heart_rate);

      // Load strength exercises
      if (session.discipline === 'Strength Training') {
        const { data: exData } = await supabase
          .from('strength_workout_exercises')
          .select('*, strength_workout_sets(*)')
          .eq('training_session_id', sessionId)
          .order('exercise_order');

        if (exData) {
          const loadedExercises: StrengthExerciseState[] = exData.map((ex: any) => ({
            id: ex.id,
            exerciseName: ex.exercise_name,
            exerciseLibraryId: ex.exercise_library_id || undefined,
            sets: (ex.strength_workout_sets || [])
              .sort((a: any, b: any) => a.set_number - b.set_number)
              .map((s: any) => ({
                id: s.id,
                setNumber: s.set_number,
                reps: s.reps,
                weight: s.weight ? Number(s.weight) : null,
                notes: s.notes,
              })),
          }));
          setExercises(loadedExercises);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (discipline === 'Strength Training' && exercises.length === 0) {
      toast({ title: 'Validation', description: 'Add at least one exercise', variant: 'destructive' });
      return;
    }
    if (discipline === 'Cardio Activity' && !durationSeconds && !distanceMeters && !calories) {
      toast({ title: 'Validation', description: 'Enter at least duration, distance, or calories', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const sessionData: any = {
        user_id: user.id,
        date,
        time: time || null,
        session_type: sessionType,
        discipline,
        title: title || null,
        intensity,
        feeling: feeling || null,
        notes: notes || null,
      };

      if (isMartialArt(discipline)) {
        sessionData.strategy = strategy || null;
        sessionData.first_movement = firstMovement || null;
        sessionData.opponent_action = opponentAction || null;
        sessionData.second_movement = secondMovement || null;
      }

      if (discipline === 'Strength Training') {
        sessionData.workout_mode = workoutMode;
        sessionData.workout_name = workoutName || null;
        sessionData.workout_type = workoutType || null;
        sessionData.total_load = totals.totalLoad;
        sessionData.total_reps = totals.totalReps;
        sessionData.total_sets = totals.totalSets;
        sessionData.total_exercises = totals.totalExercises;
      }

      if (discipline === 'Cardio Activity') {
        sessionData.cardio_activity_name = cardioActivityName || null;
        sessionData.cardio_type = cardioType || null;
        sessionData.duration_seconds = durationSeconds;
        sessionData.distance_meters = distanceMeters;
        sessionData.calories = calories;
        sessionData.avg_pace_seconds_per_km = avgPace;
        sessionData.avg_heart_rate = avgHeartRate;
        sessionData.max_heart_rate = maxHeartRate;
      }

      let savedSessionId = sessionId;

      if (sessionId && sessionId !== 'new') {
        const { error } = await supabase.from('training_sessions').update(sessionData).eq('id', sessionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('training_sessions').insert([sessionData]).select().single();
        if (error) throw error;
        savedSessionId = data.id;
      }

      // Save strength exercises
      if (discipline === 'Strength Training' && savedSessionId) {
        // Delete old exercises (cascade deletes sets)
        await supabase.from('strength_workout_exercises').delete().eq('training_session_id', savedSessionId);

        for (let i = 0; i < exercises.length; i++) {
          const ex = exercises[i];
          const { data: savedEx, error: exErr } = await supabase.from('strength_workout_exercises').insert({
            training_session_id: savedSessionId,
            exercise_name: ex.exerciseName,
            exercise_library_id: ex.exerciseLibraryId || null,
            exercise_order: i,
          }).select().single();

          if (exErr || !savedEx) throw exErr || new Error('Failed to save exercise');

          const setsData = ex.sets.map(s => ({
            strength_workout_exercise_id: savedEx.id,
            set_number: s.setNumber,
            reps: s.reps,
            weight: s.weight,
            notes: s.notes || null,
          }));

          if (setsData.length > 0) {
            const { error: setErr } = await supabase.from('strength_workout_sets').insert(setsData);
            if (setErr) throw setErr;
          }
        }
      }

      // Save tags
      if (savedSessionId && selectedTags.length > 0) {
        // Delete old session tags
        await supabase.from('session_tags').delete().eq('session_id', savedSessionId);
        
        // Get or create tags
        for (const tagName of selectedTags) {
          let { data: existingTag } = await supabase.from('tags').select('id').eq('name', tagName).single();
          if (!existingTag) {
            const { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select().single();
            existingTag = newTag;
          }
          if (existingTag) {
            await supabase.from('session_tags').insert({ session_id: savedSessionId, tag_id: existingTag.id });
          }
        }
      } else if (savedSessionId && selectedTags.length === 0) {
        await supabase.from('session_tags').delete().eq('session_id', savedSessionId);
      }

      toast({ title: 'Success', description: 'Session saved successfully' });
      navigate(`/session/${savedSessionId}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTechnique = async (technique: Partial<TechniqueChain>) => {
    if (!sessionId || sessionId === 'new') {
      toast({ title: 'Save session first', description: 'Please save the session before adding techniques', variant: 'destructive' });
      return;
    }

    const techniqueData = {
      training_session_id: sessionId,
      discipline: technique.discipline!,
      sub_type: technique.sub_type!,
      tactical_goal: technique.tactical_goal!,
      starting_action: technique.starting_action!,
      defender_reaction: technique.defender_reaction!,
      continuation_finish: technique.continuation_finish!,
      custom_notes: technique.custom_notes || null,
    };

    try {
      if (editingTechniqueId) {
        const { error } = await supabase.from('technique_chains').update(techniqueData).eq('id', editingTechniqueId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('technique_chains').insert([techniqueData]);
        if (error) throw error;
      }

      toast({ title: 'Success', description: 'Technique saved' });
      setShowTechniqueForm(false);
      setEditingTechniqueId(null);
      fetchSession();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteTechnique = async (id: string) => {
    try {
      const { error } = await supabase.from('technique_chains').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Technique removed' });
      fetchSession();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const isMartialArtDiscipline = isMartialArt(discipline);
  const isStrength = discipline === 'Strength Training';
  const isCardio = discipline === 'Cardio Activity';

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="time">Time (optional)</Label>
                <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Session Type</Label>
                <Select value={sessionType} onValueChange={(v: any) => setSessionType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sessionTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discipline</Label>
                <Select value={discipline} onValueChange={(value: Discipline) => {
                  setDiscipline(value);
                  setFirstMovement('');
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {disciplines.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., MMA Striking – Cage Work" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Intensity (1-10)</Label>
                <Input type="number" min="1" max="10" value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value))} />
              </div>
              <div>
                <Label>Feeling</Label>
                <Select value={feeling} onValueChange={setFeeling}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {feelings.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Martial Arts specific fields */}
            {isMartialArtDiscipline && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Strategy</Label>
                    <Select value={strategy} onValueChange={(v: Strategy) => setStrategy(v)}>
                      <SelectTrigger><SelectValue placeholder="Select strategy" /></SelectTrigger>
                      <SelectContent>
                        {strategies.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>1st Movement</Label>
                    <Select value={firstMovement} onValueChange={setFirstMovement}>
                      <SelectTrigger><SelectValue placeholder="Select movement" /></SelectTrigger>
                      <SelectContent>
                        {getFirstMovements(discipline as MartialArtsDiscipline).map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Opponent Action</Label>
                    <Textarea value={opponentAction} onChange={(e) => setOpponentAction(e.target.value)} rows={2} placeholder="e.g., Parried my jab, Checked low kick..." />
                  </div>
                  <div>
                    <Label>2nd Movement</Label>
                    <Textarea value={secondMovement} onChange={(e) => setSecondMovement(e.target.value)} rows={2} placeholder="e.g., Cross to the body, Switch kick counter..." />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Additional session notes..." />
            </div>

            {/* Tags */}
            <TagSelector
              sessionId={sessionId}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </CardContent>
        </Card>

        {/* Strength Training Section */}
        {isStrength && user && (
          <StrengthWorkoutForm
            sessionId={sessionId}
            userId={user.id}
            workoutName={workoutName}
            setWorkoutName={setWorkoutName}
            workoutType={workoutType}
            setWorkoutType={setWorkoutType}
            workoutMode={workoutMode}
            setWorkoutMode={setWorkoutMode}
            exercises={exercises}
            setExercises={setExercises}
            totals={totals}
          />
        )}

        {/* Cardio Activity Section */}
        {isCardio && (
          <CardioActivityForm
            cardioActivityName={cardioActivityName}
            setCardioActivityName={setCardioActivityName}
            cardioType={cardioType}
            setCardioType={setCardioType}
            durationSeconds={durationSeconds}
            setDurationSeconds={setDurationSeconds}
            distanceMeters={distanceMeters}
            setDistanceMeters={setDistanceMeters}
            calories={calories}
            setCalories={setCalories}
            avgPace={avgPace}
            setAvgPace={setAvgPace}
            avgHeartRate={avgHeartRate}
            setAvgHeartRate={setAvgHeartRate}
            maxHeartRate={maxHeartRate}
            setMaxHeartRate={setMaxHeartRate}
          />
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Session'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>

      {/* Technique Chains - only for martial arts */}
      {isMartialArtDiscipline && sessionId && sessionId !== 'new' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Technique Chains</CardTitle>
              <Button onClick={() => { setEditingTechniqueId(null); setShowTechniqueForm(true); }} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Technique
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {techniqueChains.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No techniques added yet</p>
            ) : (
              <div className="space-y-4">
                {techniqueChains.map((tc) => (
                  <Card key={tc.id} className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-1 rounded bg-primary/10 text-primary text-sm">{tc.discipline}</span>
                            <span className="px-2 py-1 rounded bg-secondary/10 text-secondary text-sm">{tc.sub_type}</span>
                            <span className="px-2 py-1 rounded bg-accent/10 text-accent text-sm">{tc.tactical_goal}</span>
                          </div>
                          <p className="text-sm">
                            <strong>Start:</strong> {tc.starting_action} → <strong>Defense:</strong> {tc.defender_reaction} → <strong>Finish:</strong> {tc.continuation_finish}
                          </p>
                          {tc.custom_notes && <p className="text-sm text-muted-foreground">{tc.custom_notes}</p>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTechnique(tc.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showTechniqueForm && (
        <TechniqueChainForm
          defaultDiscipline={discipline}
          onSave={handleSaveTechnique}
          onCancel={() => { setShowTechniqueForm(false); setEditingTechniqueId(null); }}
        />
      )}
    </div>
  );
}
