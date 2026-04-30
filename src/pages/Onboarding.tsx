import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, CheckCircle, Activity, Scale, Dumbbell, Target } from 'lucide-react';
import {
  classify, getTrainingPrescriptions, getReassessmentWeeks, getClassificationMessage,
  type Sex, type ClassificationResult, type TrainingPrescription
} from '@/lib/classificationEngine';
import { logEvent } from '@/hooks/useAnalytics';

const DISCIPLINES = ['MMA', 'Muay Thai', 'K1', 'BJJ', 'Grappling'] as const;
const STEPS = ['Discipline', 'Fitness Test', 'Body Composition', 'Results'];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [pushups, setPushups] = useState<number>(0);
  const [situps, setSitups] = useState<number>(0);
  const [squats, setSquats] = useState<number>(0);
  const [plankSeconds, setPlankSeconds] = useState<number | undefined>();
  const [walkingHr, setWalkingHr] = useState<number | undefined>();
  const [heightCm, setHeightCm] = useState<number>(170);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [age, setAge] = useState<number>(25);
  const [sex, setSex] = useState<Sex>('male');
  const [bodyFat, setBodyFat] = useState<number | undefined>();
  const [notes, setNotes] = useState('');

  // Result state
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [prescriptions, setPrescriptions] = useState<TrainingPrescription[]>([]);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  useEffect(() => {
    logEvent('onboarding_started', {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logEvent('onboarding_step_completed', { step, step_name: STEPS[step] });
  }, [step]);

  const canProceed = () => {
    switch (step) {
      case 0: return !!discipline;
      case 1: return true;
      case 2: return heightCm > 0 && weightKg > 0 && age > 0;
      default: return true;
    }
  };

  const handleNext = () => {
    if (step === 2) {
      const classResult = classify(weightKg, heightCm, sex, pushups, situps, squats, bodyFat);
      setResult(classResult);
      setPrescriptions(getTrainingPrescriptions(classResult.finalClass));
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSave = async () => {
    if (!user || !result) return;
    setSaving(true);
    try {
      // 1. Save assessment
      const { data: assessment, error: aErr } = await supabase.from('user_assessments').insert({
        user_id: user.id,
        discipline,
        height_cm: heightCm,
        weight_kg: weightKg,
        age,
        sex,
        body_fat_percent: bodyFat || null,
        pushups_max: pushups,
        situps_max: situps,
        squats_max: squats,
        plank_seconds: plankSeconds || null,
        walking_hr_recovery: walkingHr || null,
        notes: notes || null,
      }).select().single();
      if (aErr) throw aErr;

      // 2. Save classification
      const { error: cErr } = await supabase.from('body_composition_classifications').insert({
        assessment_id: assessment.id,
        bmi_value: result.bmiValue,
        bmi_class: result.bmiClass,
        bodyfat_class: result.bodyfatClass,
        performance_class: result.performanceClass,
        final_class: result.finalClass,
      });
      if (cErr) throw cErr;

      // 3. Create assigned program
      const firstPhase = prescriptions[0];
      const reassessWeeks = getReassessmentWeeks(result.finalClass);
      const startDate = new Date();
      const reassessDate = new Date(startDate);
      reassessDate.setDate(reassessDate.getDate() + reassessWeeks * 7);

      const { error: pErr } = await supabase.from('assigned_programs').insert({
        user_id: user.id,
        assessment_id: assessment.id,
        classification_result: result.finalClass,
        current_phase: firstPhase.phase,
        phase_week_start: firstPhase.weekStart,
        phase_week_end: firstPhase.weekEnd,
        start_date: startDate.toISOString().split('T')[0],
        reassessment_date: reassessDate.toISOString().split('T')[0],
        martial_arts_sessions_per_week: firstPhase.martialArtsPerWeek,
        cardio_sessions_per_week: firstPhase.cardioPerWeek,
        strength_sessions_per_week: firstPhase.strengthPerWeek,
      });
      if (pErr) throw pErr;

      // 4. Update profile discipline
      await supabase.from('profiles').update({ discipline }).eq('id', user.id);

      logEvent('onboarding_finished', {
        discipline,
        classification: result.finalClass,
        sex,
        age,
      });
      toast({ title: 'Assessment Complete!', description: 'Your training pathway has been assigned.' });
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {step > 0 ? 'Back' : 'Cancel'}
          </Button>
          <h1 className="text-xl font-bold text-foreground mt-2">Beginner Assessment</h1>
          <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          <Progress value={((step + 1) / STEPS.length) * 100} className="mt-3 h-2" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Select Your Discipline</CardTitle>
              <CardDescription>Choose the martial art you want to train in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DISCIPLINES.map(d => (
                <Button
                  key={d}
                  variant={discipline === d ? 'default' : 'outline'}
                  className="w-full justify-start text-left h-14 text-base"
                  onClick={() => setDiscipline(d)}
                >
                  {d}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-primary" /> Fitness Assessment</CardTitle>
              <CardDescription>Do your best! These help us understand your starting point.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Push-ups (max reps)</Label>
                <Input type="number" min={0} value={pushups} onChange={e => setPushups(Number(e.target.value))} className="mt-1 text-lg h-12" />
              </div>
              <div>
                <Label>Sit-ups (max reps)</Label>
                <Input type="number" min={0} value={situps} onChange={e => setSitups(Number(e.target.value))} className="mt-1 text-lg h-12" />
              </div>
              <div>
                <Label>Squats (max reps)</Label>
                <Input type="number" min={0} value={squats} onChange={e => setSquats(Number(e.target.value))} className="mt-1 text-lg h-12" />
              </div>
              <div>
                <Label>Plank time (seconds) — optional</Label>
                <Input type="number" min={0} value={plankSeconds ?? ''} onChange={e => setPlankSeconds(e.target.value ? Number(e.target.value) : undefined)} className="mt-1 h-12" />
              </div>
              <div>
                <Label>Walking HR recovery (bpm) — optional</Label>
                <Input type="number" min={0} value={walkingHr ?? ''} onChange={e => setWalkingHr(e.target.value ? Number(e.target.value) : undefined)} className="mt-1 h-12" />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> Body Composition</CardTitle>
              <CardDescription>Enter your measurements so we can find the right pathway for you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Height (cm)</Label>
                <Input type="number" min={100} max={250} value={heightCm} onChange={e => setHeightCm(Number(e.target.value))} className="mt-1 text-lg h-12" />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" min={30} max={300} value={weightKg} onChange={e => setWeightKg(Number(e.target.value))} className="mt-1 text-lg h-12" />
              </div>
              <div>
                <Label>Age</Label>
                <Input type="number" min={10} max={80} value={age} onChange={e => setAge(Number(e.target.value))} className="mt-1 text-lg h-12" />
              </div>
              <div>
                <Label>Sex</Label>
                <Select value={sex} onValueChange={v => setSex(v as Sex)}>
                  <SelectTrigger className="mt-1 h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Body Fat % — optional (more accurate if available)</Label>
                <Input type="number" min={1} max={60} value={bodyFat ?? ''} onChange={e => setBodyFat(e.target.value ? Number(e.target.value) : undefined)} className="mt-1 h-12" />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any injuries, conditions, or notes for your coach..." className="mt-1" />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && result && (
          <div className="space-y-4">
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Your Assessment Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">BMI</p>
                    <p className="text-xl font-bold text-foreground">{result.bmiValue}</p>
                    <Badge variant="outline" className="mt-1 text-xs">{result.bmiClass}</Badge>
                  </div>
                  {result.bodyfatClass && (
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Body Fat Class</p>
                      <p className="text-sm font-semibold text-foreground">{result.bodyfatClass}</p>
                    </div>
                  )}
                  <div className="bg-muted/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Performance</p>
                    <Badge variant={result.performanceClass === 'Low Capacity Beginner' ? 'destructive' : 'default'} className="mt-1 text-xs">
                      {result.performanceClass}
                    </Badge>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                    <p className="text-xs text-muted-foreground">Final Classification</p>
                    <p className="text-sm font-bold text-primary">{result.finalClass}</p>
                  </div>
                </div>

                <div className="bg-accent/50 rounded-lg p-4 border border-accent">
                  <p className="text-sm text-foreground leading-relaxed">
                    {getClassificationMessage(result.finalClass, result.performanceClass)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Training Pathway</CardTitle>
                <CardDescription>Entry path: {result.finalEntryPath}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {prescriptions.map((p, i) => (
                  <div key={i} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">{p.phase}</h4>
                      <Badge variant="outline" className="text-xs">Weeks {p.weekStart}–{p.weekEnd}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/20 rounded p-2">
                        <p className="text-lg font-bold text-foreground">{p.martialArtsPerWeek}</p>
                        <p className="text-xs text-muted-foreground">Martial Arts</p>
                      </div>
                      <div className="bg-muted/20 rounded p-2">
                        <p className="text-lg font-bold text-foreground">{p.cardioPerWeek}</p>
                        <p className="text-xs text-muted-foreground">Cardio</p>
                      </div>
                      <div className="bg-muted/20 rounded p-2">
                        <p className="text-lg font-bold text-foreground">{p.strengthPerWeek}</p>
                        <p className="text-xs text-muted-foreground">Strength</p>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center">
                  Reassessment in {getReassessmentWeeks(result.finalClass)} weeks
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-primary/20">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground italic text-center">
                  "Technique with strength is the goal. Build the body correctly so martial arts can grow properly."
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          {step < 3 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="w-full h-14 text-base">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="w-full h-14 text-base">
              <CheckCircle className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Start My Program'}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
