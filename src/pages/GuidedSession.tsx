import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Play, Pause, SkipForward, CheckCircle, Timer, Repeat, Dumbbell } from 'lucide-react';
import { CARDIO_WORKOUTS, GuidedExercise, GuidedWorkoutSection } from '@/data/cardioWorkouts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type SessionState = 'ready' | 'active' | 'rest' | 'complete';

interface FlatStep {
  sectionLabel: string;
  exerciseName: string;
  type: 'timed' | 'reps';
  durationSeconds: number;
  reps?: number;
  roundNumber?: number;
  totalRounds?: number;
}

function flattenWorkout(sections: GuidedWorkoutSection[]): FlatStep[] {
  const steps: FlatStep[] = [];
  for (const section of sections) {
    const rounds = section.repeat || 1;
    for (let r = 0; r < rounds; r++) {
      for (const ex of section.exercises) {
        steps.push({
          sectionLabel: section.label,
          exerciseName: ex.name,
          type: ex.type,
          durationSeconds: ex.durationSeconds || 30,
          reps: ex.reps,
          roundNumber: rounds > 1 ? r + 1 : undefined,
          totalRounds: rounds > 1 ? rounds : undefined,
        });
      }
    }
  }
  return steps;
}

export default function GuidedSession() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const workout = CARDIO_WORKOUTS.find(w => w.id === workoutId || w.qrSlug === workoutId);
  const steps = workout ? flattenWorkout(workout.sections) : [];

  const [state, setState] = useState<SessionState>('ready');
  const [currentStep, setCurrentStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = steps[currentStep];
  const progress = steps.length > 0 ? ((currentStep) / steps.length) * 100 : 0;

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startStep = useCallback((idx: number) => {
    if (idx >= steps.length) { setState('complete'); clearTimer(); return; }
    setCurrentStep(idx);
    const s = steps[idx];
    if (s.type === 'timed') {
      setTimeLeft(s.durationSeconds);
      setIsPaused(false);
    }
  }, [steps, clearTimer]);

  // Timer tick
  useEffect(() => {
    clearTimer();
    if (state !== 'active' || isPaused) return;
    if (!step || step.type !== 'timed') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          // auto-advance after short delay
          setTimeout(() => startStep(currentStep + 1), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [state, isPaused, currentStep, step?.type]);

  const handleStart = () => {
    setState('active');
    setStartTime(new Date());
    startStep(0);
  };

  const handleNext = () => {
    clearTimer();
    startStep(currentStep + 1);
  };

  const handlePause = () => setIsPaused(p => !p);

  const handleFinish = async () => {
    if (!user || !workout) return;

    const { error } = await supabase.from('training_sessions').insert({
      user_id: user.id,
      discipline: 'Cardio Activity' as any,
      session_type: 'Completed' as any,
      title: workout.title,
      cardio_activity_name: workout.title,
      cardio_type: 'Other' as any,
      duration_seconds: startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : workout.durationMinutes * 60,
      intensity: rpe || undefined,
      notes: notes || undefined,
      date: new Date().toISOString().split('T')[0],
    });

    if (error) {
      toast({ title: 'Error saving session', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Session Completed!', description: 'Your cardio session has been logged.' });
      navigate('/beginner');
    }
  };

  if (!workout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Workout not found</p>
          <Button onClick={() => navigate('/beginner')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // READY state
  if (state === 'ready') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            <h1 className="text-xl font-bold mt-2">{workout.title}</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">{workout.level}</Badge>
              <Badge variant="outline">{workout.durationMinutes} min</Badge>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-lg space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4 text-center">
              <p className="text-sm text-muted-foreground italic">
                "If the body cannot sustain effort, strength has no value."
              </p>
            </CardContent>
          </Card>

          {workout.sections.map((section, i) => (
            <Card key={i}>
              <CardContent className="py-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={
                    section.label === 'Warm-up' ? 'bg-blue-500/10 text-blue-700 border-blue-200' :
                    section.label === 'Cooldown' ? 'bg-green-500/10 text-green-700 border-green-200' :
                    'bg-primary/10 text-primary border-primary/20'
                  }>{section.label}</Badge>
                  {section.repeat && section.repeat > 1 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Repeat className="h-3 w-3" /> ×{section.repeat}
                    </span>
                  )}
                </div>
                <ul className="space-y-1">
                  {section.exercises.map((ex, j) => (
                    <li key={j} className="text-sm flex justify-between">
                      <span>{ex.name}</span>
                      <span className="text-muted-foreground">
                        {ex.type === 'timed' ? ex.duration : `${ex.reps} reps`}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          <Button onClick={handleStart} className="w-full h-16 text-lg font-bold">
            <Play className="mr-2 h-5 w-5" /> Start Session
          </Button>
        </main>
      </div>
    );
  }

  // COMPLETE state
  if (state === 'complete') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <h1 className="text-xl font-bold">Session Complete!</h1>
            <p className="text-sm text-muted-foreground">{workout.title}</p>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-lg space-y-4">
          <Card>
            <CardContent className="py-4 space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">How hard was it? (RPE 1–10)</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <Button key={n} size="sm" variant={rpe === n ? 'default' : 'outline'}
                      className={`h-10 text-base font-bold ${rpe === n ? '' : ''}`}
                      onClick={() => setRpe(n)}
                    >{n}</Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Notes (optional)</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did you feel?" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4 text-center">
              <p className="text-sm text-muted-foreground italic">
                "Before power, we build the engine. Before strength, we earn the right to train."
              </p>
            </CardContent>
          </Card>

          <Button onClick={handleFinish} className="w-full h-14 text-base font-bold">
            <CheckCircle className="mr-2 h-5 w-5" /> Save & Finish
          </Button>
        </main>
      </div>
    );
  }

  // ACTIVE state
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="w-full">
        <Progress value={progress} className="h-2 rounded-none" />
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{step?.sectionLabel}</p>
            <p className="text-sm font-semibold">{workout.title}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Step {currentStep + 1}/{steps.length}</p>
            {step?.roundNumber && (
              <p className="text-xs text-muted-foreground">Round {step.roundNumber}/{step.totalRounds}</p>
            )}
          </div>
        </div>
      </header>

      {/* Main exercise display */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center space-y-6 w-full max-w-sm">
          <Badge className={
            step?.sectionLabel === 'Warm-up' ? 'bg-blue-500/10 text-blue-700 border-blue-200' :
            step?.sectionLabel === 'Cooldown' ? 'bg-green-500/10 text-green-700 border-green-200' :
            'bg-primary/10 text-primary border-primary/20'
          }>{step?.sectionLabel}</Badge>

          <h1 className="text-3xl font-extrabold tracking-tight">{step?.exerciseName}</h1>

          {step?.type === 'timed' ? (
            <div className="space-y-2">
              <div className="text-7xl font-black tabular-nums text-primary">
                {formatTime(timeLeft)}
              </div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span className="text-sm">{step.durationSeconds}s total</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-7xl font-black text-primary">
                {step?.reps}
              </div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Dumbbell className="h-4 w-4" />
                <span className="text-sm">reps — tap Next when done</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Controls */}
      <div className="border-t border-border bg-card px-4 py-4 pb-8">
        <div className="flex gap-3 max-w-sm mx-auto">
          {step?.type === 'timed' && (
            <Button variant="outline" size="lg" className="flex-1 h-14" onClick={handlePause}>
              {isPaused ? <Play className="mr-2 h-5 w-5" /> : <Pause className="mr-2 h-5 w-5" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          )}
          <Button size="lg" className="flex-1 h-14 text-base font-bold" onClick={handleNext}>
            <SkipForward className="mr-2 h-5 w-5" />
            {currentStep >= steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
