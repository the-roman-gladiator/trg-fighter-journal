import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { MartialArtsDiscipline, Strategy, StrengthExerciseState, StrengthWorkoutTotals, WorkoutMode } from '@/types/training';
import { Badge } from '@/components/ui/badge';
import { disciplines, strategies } from '@/config/dropdownOptions';
import { PredictiveTagInput } from './PredictiveTagInput';
import { MultiDisciplineSelect } from './MultiDisciplineSelect';
import { StrengthWorkoutForm } from './StrengthWorkoutForm';
import { Brain, Heart, Zap, Swords, Dumbbell, Activity, ListChecks } from 'lucide-react';
import { useUserLists, DEFAULT_CLASS_TYPES, DEFAULT_EMOTIONS, DEFAULT_MINDSETS, classTypeCategory } from '@/hooks/useUserLists';
import { Checkbox } from '@/components/ui/checkbox';
import { useFighterProfile } from '@/hooks/useFighterProfile';
import { logEvent } from '@/hooks/useAnalytics';

interface SessionFormProps {
  sessionId?: string;
}

const effortLevels = ['Easy', 'Light', 'Moderate', 'Hard', 'Max'] as const;

const effortToScore = (level: string): number => {
  switch (level) {
    case 'Easy': return 1;
    case 'Light': return 2;
    case 'Moderate': return 3;
    case 'Hard': return 4;
    case 'Max': return 5;
    default: return 0;
  }
};

const CARDIO_ACTIVITIES = [
  'Kickboxing', 'Boxing', 'Muay Thai Pad Work',
  'Kickboxing Bag Work', 'MMA Conditioning', 'Grappling Conditioning',
  'Shadow Boxing', 'Sparring Conditioning', 'Treadmill Running',
  'Cycling', 'Rowing Machine', 'Jump Rope',
  'HIIT', 'Functional Training', 'Swimming',
  'Other',
];

const FUNCTIONAL_PRESETS = ['Tabata', 'AMRAP', 'EMOM', 'Circuit', 'Ladder', 'For Time'];

const DISTANCE_ACTIVITIES = new Set(['Treadmill Running', 'Cycling', 'Rowing Machine', 'Swimming']);

// Backwards-compatible category checks. The truth source is classTypeCategory(),
// but we keep these helpers so the rest of the form code reads naturally.
const isCardioType = (ct: string) => classTypeCategory(ct) === 'cardio';
const isStrengthType = (ct: string) => classTypeCategory(ct) === 'strength';
const isTechnicalType = (ct: string) => classTypeCategory(ct) === 'technical';

function rpeLabel(rpe: number): string {
  if (rpe <= 3) return 'Easy';
  if (rpe <= 6) return 'Moderate';
  if (rpe <= 8) return 'Hard';
  return 'Max';
}

export function SessionForm({ sessionId }: SessionFormProps) {
  const { user, profile } = useAuth();
  const { getActive } = useUserLists();
  const { fighterProfile, isFighterApproved } = useFighterProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const profileDisciplines: MartialArtsDiscipline[] = profile?.discipline
    ? (profile.discipline.split(',').map(d => d.trim()).filter(d => disciplines.includes(d as MartialArtsDiscipline)) as MartialArtsDiscipline[])
    : [];
  const availableDisciplines = profileDisciplines.length > 0 ? profileDisciplines : disciplines;

  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(
    profileDisciplines.length === 1 ? [profileDisciplines[0]] : []
  );
  const discipline: MartialArtsDiscipline = (selectedDisciplines[0] as MartialArtsDiscipline) || (availableDisciplines[0] || 'MMA');
  const [strategy, setStrategy] = useState<Strategy | ''>('');
  const [technique, setTechnique] = useState<string>('');
  const [customTechnique, setCustomTechnique] = useState<string>('');
  const [title, setTitle] = useState('');
  const [firstMovement, setFirstMovement] = useState('');
  const [opponentReaction, setOpponentReaction] = useState('');
  const [thirdMovement, setThirdMovement] = useState('');
  const [notes, setNotes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Performance fields
  const [beforeEmotion, setBeforeEmotion] = useState('');
  const [beforeMindset, setBeforeMindset] = useState('');
  const [afterEmotion, setAfterEmotion] = useState('');
  const [afterMindset, setAfterMindset] = useState('');
  const [physicalEffort, setPhysicalEffort] = useState('');
  const [mentalEffort, setMentalEffort] = useState('');
  const [classType, setClassType] = useState('');

  // Fighter Note fields (optional)
  const [makeFighterNote, setMakeFighterNote] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState<string>('');
  const [executedCount, setExecutedCount] = useState<string>('');
  const [physicalEffortExecution, setPhysicalEffortExecution] = useState('');
  const [mindsetEffortExecution, setMindsetEffortExecution] = useState('');

  // 1o1 PT marker (Technical Skills only) — saves to pt_note_flag
  const [pt1o1, setPt1o1] = useState(false);

  // Sparring & Rolling fields (free notes only — duration handled by start/end time, rounds + intensity below)
  const [sparringRounds, setSparringRounds] = useState<string>('');
  const [sparringRoundLength, setSparringRoundLength] = useState<string>('');
  const [sparringIntensity, setSparringIntensity] = useState<number>(5);

  // Stretching & Mobility fields
  type StretchExercise = { name: string; duration: string };
  const [stretchFocusAreas, setStretchFocusAreas] = useState<string[]>([]);
  const [stretchExercises, setStretchExercises] = useState<StretchExercise[]>([]);
  const [stretchNewName, setStretchNewName] = useState<string>('');
  const [stretchNewDuration, setStretchNewDuration] = useState<string>('');

  // My Fight Review fields
  type FightRound = { roundNumber: number; notes: string; techniques: string[] };
  const [fightType, setFightType] = useState<string>('');
  const [fightEvent, setFightEvent] = useState<string>('');
  const [fightResult, setFightResult] = useState<string>('');
  const [fightMethod, setFightMethod] = useState<string>('');
  const [fightRoundCount, setFightRoundCount] = useState<string>('');
  const [fightRoundDuration, setFightRoundDuration] = useState<string>('');
  const [fightOpponentName, setFightOpponentName] = useState<string>('');
  const [fightOpponentStyle, setFightOpponentStyle] = useState<string>('');
  const [fightOpponentStance, setFightOpponentStance] = useState<string>('');
  const [fightOpponentWeight, setFightOpponentWeight] = useState<string>('');
  const [fightOpponentNotes, setFightOpponentNotes] = useState<string>('');
  const [fightRounds, setFightRounds] = useState<FightRound[]>([]);
  const [fightFreeComment, setFightFreeComment] = useState<string>('');
  const [fightMindset, setFightMindset] = useState<string>('');

  // Cardio fields
  const [cardioActivity, setCardioActivity] = useState<string>('');
  const [cardioActivityOther, setCardioActivityOther] = useState<string>('');
  // Functional Training sub-mode: 'preset' | 'build'
  const [functionalMode, setFunctionalMode] = useState<'preset' | 'build'>('preset');
  const [functionalPreset, setFunctionalPreset] = useState<string>('');
  const [functionalBuild, setFunctionalBuild] = useState<string>('');
  const [cardioHours, setCardioHours] = useState<string>('');
  const [cardioMinutes, setCardioMinutes] = useState<string>('');
  const [cardioSeconds, setCardioSeconds] = useState<string>('');
  const [cardioDistance, setCardioDistance] = useState<string>('');
  const [cardioCalories, setCardioCalories] = useState<string>('');
  const [cardioAvgHr, setCardioAvgHr] = useState<string>('');
  const [cardioMaxHr, setCardioMaxHr] = useState<string>('');
  const [cardioRpe, setCardioRpe] = useState<number>(5);

  // Strength fields (rendered through StrengthWorkoutForm; not persisted as exercises here)
  const [workoutName, setWorkoutName] = useState<string>('');
  const [workoutType, setWorkoutType] = useState<string>('');
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('manual');
  const [exercises, setExercises] = useState<StrengthExerciseState[]>([]);
  const [strengthTab, setStrengthTab] = useState<'live' | 'program'>('live');
  const [templates, setTemplates] = useState<any[]>([]);

  const attemptsNum = parseInt(attemptsCount) || 0;
  const executedNum = parseInt(executedCount) || 0;
  const executionRate = attemptsNum > 0 ? Math.round((executedNum / attemptsNum) * 100) : 0;
  const rateColor = executionRate >= 86 ? 'bg-emerald-500' : executionRate >= 66 ? 'bg-amber-500' : 'bg-destructive';

  const strengthTotals: StrengthWorkoutTotals = {
    totalLoad: exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, st) => s + (st.reps || 0) * (st.weight || 0), 0), 0),
    totalReps: exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, st) => s + (st.reps || 0), 0), 0),
    totalSets: exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
    totalExercises: exercises.length,
  };

  useEffect(() => {
    if (sessionId && sessionId !== 'new') {
      fetchSession();
    }
  }, [sessionId]);

  // Fetch templates list when user picks Strength path (for the "Load program" tab)
  useEffect(() => {
    if (!user) return;
    if (!isStrengthType(classType)) return;
    (async () => {
      const { data } = await supabase
        .from('workout_templates')
        .select('*')
        .order('name');
      if (data) setTemplates(data);
    })();
  }, [user, classType]);

  const fetchSession = async () => {
    if (!sessionId || sessionId === 'new') return;

    const { data: session, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to load session', variant: 'destructive' });
      return;
    }

    if (session) {
      setDate(session.date);
      setStartTime(session.time || '');
      const sessAny = session as any;
      const ds: string[] = Array.isArray(sessAny.disciplines) && sessAny.disciplines.length > 0
        ? sessAny.disciplines
        : (session.discipline ? [session.discipline] : []);
      setSelectedDisciplines(ds);
      setStrategy((session.strategy as Strategy) || '');
      setTechnique((session as any).technique || session.first_movement || '');
      setTitle(session.title || '');
      setFirstMovement(session.first_movement || '');
      setOpponentReaction(session.opponent_action || '');
      setThirdMovement(session.second_movement || '');
      setNotes(session.notes || '');
      setVideoUrl((session as any).video_url || '');
      setBeforeEmotion((session as any).before_emotion || '');
      setBeforeMindset((session as any).before_mindset || '');
      setAfterEmotion((session as any).after_emotion || '');
      setAfterMindset((session as any).after_mindset || '');
      setPhysicalEffort((session as any).physical_effort_level || '');
      setMentalEffort((session as any).mental_effort_level || '');
      setClassType((session as any).class_type || '');
      setMakeFighterNote(!!(session as any).make_fighter_note);
      setAttemptsCount((session as any).attempts_count != null ? String((session as any).attempts_count) : '');
      setExecutedCount((session as any).executed_count != null ? String((session as any).executed_count) : '');
      setPhysicalEffortExecution((session as any).physical_effort_execution || '');
      setMindsetEffortExecution((session as any).mindset_effort_execution || '');
      setPt1o1(!!(session as any).pt_note_flag);
      // Sparring prefill (rounds reuse fight_round_count, length stored in fight_duration for now)
      const sFRC = (session as any).fight_round_count;
      const sFD = (session as any).fight_duration;
      if (classTypeCategory((session as any).class_type) === 'sparring') {
        if (sFRC != null) setSparringRounds(String(sFRC));
        if (sFD) setSparringRoundLength(String(sFD));
        if ((session as any).effort_score != null) {
          setSparringIntensity(Math.round(Number((session as any).effort_score) * 2));
        }
      }

      // Stretching & Mobility prefill
      const sFA = (session as any).stretching_focus_areas;
      const sEx = (session as any).stretching_exercises;
      if (Array.isArray(sFA)) setStretchFocusAreas(sFA);
      if (Array.isArray(sEx)) setStretchExercises(sEx as StretchExercise[]);

      // My Fight Review prefill
      if (classTypeCategory((session as any).class_type) === 'fight_review') {
        setFightType((session as any).fight_type || '');
        setFightEvent((session as any).fight_event || '');
        setFightResult((session as any).fight_result || '');
        setFightMethod((session as any).fight_method || '');
        if ((session as any).fight_round_count != null) setFightRoundCount(String((session as any).fight_round_count));
        setFightRoundDuration((session as any).fight_duration || '');
        const opp = (session as any).fight_opponent;
        if (opp && typeof opp === 'object') {
          setFightOpponentName(opp.name || '');
          setFightOpponentStyle(opp.style || '');
          setFightOpponentStance(opp.stance || '');
          setFightOpponentWeight(opp.weight || '');
          setFightOpponentNotes(opp.notes || '');
        }
        const fr = (session as any).fight_rounds;
        if (Array.isArray(fr)) setFightRounds(fr as FightRound[]);
        setFightMindset((session as any).fight_mindset || '');
        setFightFreeComment((session as any).fight_free_comment || '');
      }
      // Cardio fields prefill
      const existingActivity = (session as any).cardio_activity_name || '';
      if (existingActivity) {
        // Functional Training stored as "Functional Training: <preset>" or "Functional Training — Custom: <text>"
        if (existingActivity.startsWith('Functional Training')) {
          setCardioActivity('Functional Training');
          const customMatch = existingActivity.match(/^Functional Training — Custom:\s*(.*)$/);
          const presetMatch = existingActivity.match(/^Functional Training:\s*(.*)$/);
          if (customMatch) {
            setFunctionalMode('build');
            setFunctionalBuild(customMatch[1] || '');
          } else if (presetMatch) {
            setFunctionalMode('preset');
            setFunctionalPreset(presetMatch[1] || '');
          }
        } else if (CARDIO_ACTIVITIES.includes(existingActivity)) {
          setCardioActivity(existingActivity);
        } else {
          setCardioActivity('Other');
          setCardioActivityOther(existingActivity);
        }
      }
      const dur = (session as any).duration_seconds || 0;
      if (dur > 0) {
        setCardioHours(String(Math.floor(dur / 3600)));
        setCardioMinutes(String(Math.floor((dur % 3600) / 60)));
        setCardioSeconds(String(dur % 60));
      }
      if ((session as any).distance_meters != null) setCardioDistance(String((session as any).distance_meters));
      if ((session as any).calories != null) setCardioCalories(String((session as any).calories));
      if ((session as any).avg_heart_rate != null) setCardioAvgHr(String((session as any).avg_heart_rate));
      if ((session as any).max_heart_rate != null) setCardioMaxHr(String((session as any).max_heart_rate));
      if ((session as any).effort_score != null && isCardioType((session as any).class_type || '')) {
        setCardioRpe(Math.round(Number((session as any).effort_score) * 2));
      }

      const { data: sessionTagsData } = await supabase
        .from('session_tags')
        .select('tag_id, tags(name)')
        .eq('session_id', sessionId);
      if (sessionTagsData) {
        setSelectedTags(sessionTagsData.map((st: any) => st.tags?.name).filter(Boolean));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!classType) {
      toast({ title: 'Validation', description: 'Please select a session type', variant: 'destructive' });
      return;
    }

    const technical = isTechnicalType(classType);
    const sparring = classTypeCategory(classType) === 'sparring';
    const stretching = classTypeCategory(classType) === 'stretching';
    const fightReview = classTypeCategory(classType) === 'fight_review';
    const cardio = isCardioType(classType);
    const strength = isStrengthType(classType);
    const showTechnicalEntry = technical;

    if (showTechnicalEntry && selectedDisciplines.length === 0) {
      toast({ title: 'Validation', description: 'Please select at least one discipline', variant: 'destructive' });
      return;
    }

    const resolvedTechnique = technique === '__custom__' ? customTechnique.trim() : technique;

    if (technical && !resolvedTechnique) {
      toast({ title: 'Validation', description: 'Please select or enter a technique', variant: 'destructive' });
      return;
    }

    // Fighter Note validation (only relevant for technical types where the section is rendered)
    if (technical && makeFighterNote) {
      if (attemptsCount === '' || executedCount === '') {
        toast({ title: 'Validation', description: 'Attempts and Executed are required for a Fighter Note', variant: 'destructive' });
        return;
      }
      if (!Number.isInteger(attemptsNum) || !Number.isInteger(executedNum) || attemptsNum < 0 || executedNum < 0) {
        toast({ title: 'Validation', description: 'Attempts and Executed must be whole numbers ≥ 0', variant: 'destructive' });
        return;
      }
      if (executedNum > attemptsNum) {
        toast({ title: 'Validation', description: 'Executed cannot exceed Attempts', variant: 'destructive' });
        return;
      }
    }

    setLoading(true);

    // Calculate effort score
    let effortScore: number | null = null;
    if (cardio) {
      // Map RPE 1-10 → effort_score 0.5-5
      effortScore = cardioRpe / 2;
    } else if (sparring) {
      // Map sparring intensity 1-10 → effort_score 0.5-5
      effortScore = sparringIntensity / 2;
    } else if (physicalEffort || mentalEffort) {
      const pScore = effortToScore(physicalEffort);
      const mScore = effortToScore(mentalEffort);
      const count = (pScore > 0 ? 1 : 0) + (mScore > 0 ? 1 : 0);
      effortScore = count > 0 ? (pScore + mScore) / count : null;
    }

    // Cardio derived values
    const cardioDurationSeconds = cardio
      ? ((parseInt(cardioHours) || 0) * 3600 + (parseInt(cardioMinutes) || 0) * 60 + (parseInt(cardioSeconds) || 0)) || null
      : null;
    const resolvedCardioActivity = cardio
      ? (() => {
          if (cardioActivity === 'Other') return cardioActivityOther.trim() || null;
          if (cardioActivity === 'Functional Training') {
            if (functionalMode === 'build' && functionalBuild.trim()) {
              return `Functional Training — Custom: ${functionalBuild.trim()}`;
            }
            if (functionalMode === 'preset' && functionalPreset) {
              return `Functional Training: ${functionalPreset}`;
            }
            return 'Functional Training';
          }
          return cardioActivity || null;
        })()
      : null;
    const showDistance = cardio && DISTANCE_ACTIVITIES.has(cardioActivity);

    try {
      const sessionData: any = {
        user_id: user.id,
        date,
        time: startTime || null,
        session_type: 'Completed',
        discipline: (cardio || strength) ? (classType || discipline) : discipline,
        disciplines: (cardio || strength) ? [] : selectedDisciplines,
        title: title || null,
        notes: notes || null,
        video_url: videoUrl.trim() || null,
        strategy: showTechnicalEntry ? (strategy || null) : null,
        technique: showTechnicalEntry ? (resolvedTechnique || null) : null,
        first_movement: showTechnicalEntry ? (firstMovement || null) : null,
        opponent_action: showTechnicalEntry ? (opponentReaction || null) : null,
        second_movement: showTechnicalEntry ? (thirdMovement || null) : null,
        before_emotion: beforeEmotion || null,
        before_mindset: beforeMindset || null,
        after_emotion: afterEmotion || null,
        after_mindset: afterMindset || null,
        physical_effort_level: (cardio || sparring) ? null : (physicalEffort || null),
        mental_effort_level: (cardio || sparring) ? null : (mentalEffort || null),
        effort_score: effortScore,
        class_type: classType || null,
        pt_note_flag: technical ? pt1o1 : false,
        // (Sparring & Fight Review share fight_* columns — set below.)
        // Stretching & Mobility
        stretching_focus_areas: stretching && stretchFocusAreas.length > 0 ? stretchFocusAreas : null,
        stretching_exercises: stretching && stretchExercises.length > 0 ? stretchExercises : null,
        // My Fight Review
        fight_type: fightReview ? (fightType || null) : null,
        fight_event: fightReview ? (fightEvent.trim() || null) : null,
        fight_result: fightReview ? (fightResult || null) : null,
        fight_method: fightReview && (fightResult === 'Win' || fightResult === 'Loss') ? (fightMethod || null) : null,
        fight_round_count: fightReview && fightRoundCount !== ''
          ? parseInt(fightRoundCount)
          : (sparring && sparringRounds !== '' ? parseInt(sparringRounds) : null),
        fight_duration: fightReview && fightRoundDuration.trim()
          ? fightRoundDuration.trim()
          : (sparring && sparringRoundLength.trim() ? sparringRoundLength.trim() : null),
        fight_opponent: fightReview
          ? {
              name: fightOpponentName.trim() || null,
              style: fightOpponentStyle || null,
              stance: fightOpponentStance || null,
              weight: fightOpponentWeight.trim() || null,
              notes: fightOpponentNotes.trim() || null,
            }
          : null,
        fight_rounds: fightReview && fightRounds.length > 0 ? fightRounds : null,
        fight_emotion_before: fightReview ? (beforeEmotion || null) : null,
        fight_emotion_after: fightReview ? (afterEmotion || null) : null,
        fight_mindset: fightReview ? (fightMindset || null) : null,
        fight_free_comment: fightReview ? (fightFreeComment.trim() || null) : null,
        // Fighter Note (only on technical sessions)
        make_fighter_note: technical ? makeFighterNote : false,
        fighter_profile_id: technical && makeFighterNote ? (fighterProfile?.id || null) : null,
        attempts_count: technical && makeFighterNote ? attemptsNum : null,
        executed_count: technical && makeFighterNote ? executedNum : null,
        physical_effort_execution: technical && makeFighterNote ? (physicalEffortExecution || null) : null,
        mindset_effort_execution: technical && makeFighterNote ? (mindsetEffortExecution || null) : null,
        // Cardio columns
        cardio_activity_name: resolvedCardioActivity,
        duration_seconds: cardioDurationSeconds,
        distance_meters: cardio && showDistance && cardioDistance !== '' ? Number(cardioDistance) : null,
        calories: cardio && cardioCalories !== '' ? Number(cardioCalories) : null,
        avg_heart_rate: cardio && cardioAvgHr !== '' ? Number(cardioAvgHr) : null,
        max_heart_rate: cardio && cardioMaxHr !== '' ? Number(cardioMaxHr) : null,
      };

      let savedSessionId = sessionId;

      if (sessionId && sessionId !== 'new') {
        sessionData.coach_session_id = null;
        const { error } = await supabase.from('training_sessions').update(sessionData).eq('id', sessionId);
        if (error) throw error;
        logEvent('session_updated', {
          discipline: sessionData.discipline,
          session_type: sessionData.session_type,
          class_type: classType,
        }, 'session');
      } else {
        const { data, error } = await supabase.from('training_sessions').insert([sessionData]).select().single();
        if (error) throw error;
        savedSessionId = data.id;
        logEvent('session_created', {
          discipline: sessionData.discipline,
          session_type: sessionData.session_type,
          class_type: classType,
          has_chains: false,
        }, 'session');
      }

      // Build auto-tags from all fields (one tag per selected discipline)
      const autoTags: string[] = [...selectedDisciplines];
      if (classType) autoTags.push(classType);
      if (showTechnicalEntry) {
        if (strategy) autoTags.push(strategy);
        if (resolvedTechnique) autoTags.push(resolvedTechnique);
        if (firstMovement) autoTags.push(firstMovement);
        if (opponentReaction) autoTags.push(opponentReaction);
        if (thirdMovement) autoTags.push(thirdMovement);
        if (technical && pt1o1) autoTags.push('1o1 PT');
        
      }
      if (cardio && resolvedCardioActivity) autoTags.push(resolvedCardioActivity);
      if (strength && workoutName) autoTags.push(workoutName);
      if (stretching) {
        stretchFocusAreas.forEach(a => autoTags.push(a));
      }
      if (fightReview) {
        if (fightType) autoTags.push(fightType);
        if (fightResult) autoTags.push(fightResult);
        if (fightMethod) autoTags.push(fightMethod);
        if (fightOpponentName.trim()) autoTags.push(`vs ${fightOpponentName.trim()}`);
        if (fightOpponentStyle) autoTags.push(fightOpponentStyle);
        if (fightOpponentStance) autoTags.push(fightOpponentStance);
        if (fightEvent.trim()) autoTags.push(fightEvent.trim());
      }

      const allTagNames = [...autoTags, ...selectedTags];
      const uniqueTags: string[] = [];
      const seen = new Set<string>();
      for (const tag of allTagNames) {
        const lower = tag.toLowerCase().trim();
        if (lower && !seen.has(lower)) {
          seen.add(lower);
          uniqueTags.push(tag.trim());
        }
      }

      if (savedSessionId) {
        await supabase.from('session_tags').delete().eq('session_id', savedSessionId);

        for (const tagName of uniqueTags) {
          let { data: existingTag } = await supabase.from('tags').select('id').eq('name', tagName).single();
          if (!existingTag) {
            const { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select().single();
            existingTag = newTag;
          }
          if (existingTag) {
            await supabase.from('session_tags').insert({ session_id: savedSessionId, tag_id: existingTag.id });
          }
        }
      }

      toast({ title: 'Success', description: 'Session saved.' });
      navigate(`/session/${savedSessionId}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Pull user-specific options (with fallback to defaults until seeded)
  const userTechniqueOptions = getActive('technique', discipline).map(i => i.item_name);
  const techniqueOptions = userTechniqueOptions.length > 0 ? userTechniqueOptions : [];
  const userClassTypes = getActive('class_type').map(i => i.item_name);
  const classTypeOptions = userClassTypes.length > 0 ? userClassTypes : DEFAULT_CLASS_TYPES;
  const userEmotions = getActive('emotion').map(i => i.item_name);
  const emotionOptions = userEmotions.length > 0 ? userEmotions : DEFAULT_EMOTIONS;
  const userMindsets = getActive('mindset').map(i => i.item_name);
  const mindsetOptions = userMindsets.length > 0 ? userMindsets : DEFAULT_MINDSETS;

  const getDuration = () => {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const EffortButton = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <Button
      type="button"
      size="sm"
      variant={selected ? 'default' : 'outline'}
      className={`flex-1 text-xs h-9 ${selected ? '' : 'border-border'}`}
      onClick={onClick}
    >
      {label}
    </Button>
  );

  const ChipSelect = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <Badge
          key={opt}
          variant={value === opt ? 'default' : 'outline'}
          className={`cursor-pointer text-xs px-2.5 py-1 transition-colors ${
            value === opt
              ? 'bg-primary text-primary-foreground'
              : 'border-border hover:border-primary/40 hover:bg-primary/5'
          }`}
          onClick={() => onChange(value === opt ? '' : opt)}
        >
          {opt}
        </Badge>
      ))}
    </div>
  );

  const category = classTypeCategory(classType);
  const technical = category === 'technical';
  const sparring = category === 'sparring';
  const stretching = category === 'stretching';
  const fightReview = category === 'fight_review';
  const cardio = category === 'cardio';
  const strength = category === 'strength';
  // Sparring reuses the technical entry surface (discipline + tactic + technique + movement chain)
  const showTechnicalEntry = technical;
  const showDistance = cardio && DISTANCE_ACTIVITIES.has(cardioActivity);

  const loadTemplateIntoForm = async (templateId: string) => {
    const { data: tmpl } = await supabase.from('workout_templates').select('*').eq('id', templateId).single();
    const { data: tmplExs } = await supabase
      .from('workout_template_exercises')
      .select('*')
      .eq('workout_template_id', templateId)
      .order('exercise_order');

    if (tmpl && tmplExs) {
      setWorkoutName(tmpl.name);
      setWorkoutType(tmpl.workout_type || '');
      const loaded: StrengthExerciseState[] = tmplExs.map((te: any) => {
        const sets = [];
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
      setExercises(loaded);
      setStrengthTab('live');
      toast({ title: 'Program loaded', description: `Loaded "${tmpl.name}" — edit freely` });
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Class Type — TOP of form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Session Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="grid grid-cols-3"
              style={{ gap: 'clamp(8px, 1.6vw, 14px)' }}
            >
              {classTypeOptions.map((ct) => {
                const isActive = classType === ct;
                return (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => setClassType(isActive ? '' : ct)}
                    className="font-bold uppercase text-white transition-colors flex items-center justify-center text-center"
                    style={{
                      background: isActive ? '#cc0000' : '#111111',
                      border: isActive ? '1px solid transparent' : '1px solid #2e2e2e',
                      borderRadius: '6px',
                      padding: 'clamp(10px, 2.4vw, 18px) clamp(4px, 1vw, 10px)',
                      minHeight: 'clamp(64px, 11vw, 92px)',
                      fontSize: 'clamp(11px, 3vw, 15px)',
                      lineHeight: 1.15,
                      letterSpacing: '0.02em',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#4a4a4a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#2e2e2e';
                      }
                    }}
                  >
                    {ct}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Placeholder when no type selected */}
        {!classType && (
          <Card className="border-dashed">
            <CardContent className="py-10">
              <p className="text-center text-sm text-muted-foreground">
                Select a session type above to continue
              </p>
            </CardContent>
          </Card>
        )}

        {/* Everything below requires a classType */}
        {classType && (
          <>
            {/* Session Details — hidden for Stretching & Mobility (simple personal record) */}
            {!stretching && (
            <Card>
              <CardHeader>
                <CardTitle>{fightReview ? 'Review Fight' : 'Session Details'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Session Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Jab timing study" />
                </div>

                {fightReview ? (
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                      </div>
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                      </div>
                      <div>
                        <Label>Duration</Label>
                        <p className="text-sm font-medium mt-2 text-muted-foreground">{getDuration() || '—'}</p>
                      </div>
                    </div>
                  </>
                )}

                {!cardio && !strength && (
                  <MultiDisciplineSelect
                    options={availableDisciplines}
                    value={selectedDisciplines}
                    onChange={(next) => {
                      setSelectedDisciplines(next);
                      setTechnique('');
                    }}
                    helper={profileDisciplines.length > 0 ? 'From your profile — pick one or more for this session.' : undefined}
                  />
                )}
                {/* Tactic & Technique for technical + sparring sessions */}
                {showTechnicalEntry && (
                  <>
                    <div>
                      <Label>Tactic</Label>
                      <Select value={strategy} onValueChange={(v: Strategy) => setStrategy(v)}>
                        <SelectTrigger><SelectValue placeholder="Select tactic" /></SelectTrigger>
                        <SelectContent>
                          {strategies.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Technique</Label>
                      <Select
                        value={technique === '__custom__' || (technique && !techniqueOptions.includes(technique)) ? '__custom__' : technique}
                        onValueChange={(v) => {
                          if (v === '__custom__') {
                            setTechnique('__custom__');
                            setCustomTechnique('');
                          } else {
                            setTechnique(v);
                            setCustomTechnique('');
                          }
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select technique" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__custom__">+ Custom (type your own)</SelectItem>
                          {techniqueOptions.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      {technique === '__custom__' && (
                        <Input
                          className="mt-2"
                          value={customTechnique}
                          onChange={(e) => setCustomTechnique(e.target.value)}
                          placeholder="Type your custom technique (will create a pathway node)"
                        />
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            )}

            {/* Movement Chain — technical & sparring */}
            {showTechnicalEntry && (
              <Card>
                <CardHeader>
                  <CardTitle>Movement Chain</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="firstMovement">1st Movement <span className="text-muted-foreground text-xs">(How did you start?)</span></Label>
                    <Input id="firstMovement" value={firstMovement} onChange={(e) => setFirstMovement(e.target.value)} placeholder="e.g., Jab entry, Level change, Feint low kick" />
                  </div>
                  <div>
                    <Label htmlFor="opponentReaction">2nd Movement <span className="text-muted-foreground text-xs">(Opponent reaction)</span></Label>
                    <Input id="opponentReaction" value={opponentReaction} onChange={(e) => setOpponentReaction(e.target.value)} placeholder="e.g., Stepped back, Parried, Sprawled" />
                  </div>
                  <div>
                    <Label htmlFor="thirdMovement">3rd Movement <span className="text-muted-foreground text-xs">(What did I capitalize with?)</span></Label>
                    <Input id="thirdMovement" value={thirdMovement} onChange={(e) => setThirdMovement(e.target.value)} placeholder="e.g., Low kick, Double leg finish, Back take" />
                  </div>

                  {/* 1o1 PT marker — memory-only flag, technical sessions only */}
                  {technical && (
                    <div className="pt-2 border-t border-border">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={pt1o1}
                          onCheckedChange={(v) => setPt1o1(v === true)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium">1o1 PT session</p>
                          <p className="text-xs text-muted-foreground">
                            Tick if this was a private 1-on-1 with a coach. For your memory only.
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sparring & Rolling — extra details */}
            {sparring && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-4 w-4 text-primary" />
                    Sparring Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="sparringRounds" className="text-xs">Rounds</Label>
                      <Input
                        id="sparringRounds"
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={sparringRounds}
                        onChange={(e) => setSparringRounds(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="e.g., 5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sparringRoundLength" className="text-xs">Round length</Label>
                      <Input
                        id="sparringRoundLength"
                        value={sparringRoundLength}
                        onChange={(e) => setSparringRoundLength(e.target.value)}
                        placeholder="e.g., 3 min"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Free notes only — capture the feel of the session in the Notes card below.
                  </p>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Intensity (1–10)</Label>
                      <span className="text-sm font-semibold tabular-nums">
                        {sparringIntensity} — {rpeLabel(sparringIntensity)}
                      </span>
                    </div>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[sparringIntensity]}
                      onValueChange={(v) => setSparringIntensity(v[0])}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                      <span>1–3 Flow</span>
                      <span>4–6 Sharp</span>
                      <span>7–8 Hard</span>
                      <span>9–10 War</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stretching & Mobility — simple personal record */}
            {stretching && (() => {
              const STRETCH_SUGGESTIONS: Record<string, string[]> = {
                'Hips': ['Pigeon pose', '90/90 hip switch', 'Deep squat hold', 'Butterfly stretch'],
                'Hamstrings': ['Forward fold', 'Single-leg hamstring stretch', 'Downward dog', 'Jefferson curl'],
                'Lower Back': ["Child's pose", 'Cat-cow', 'Supine twist', 'Knees-to-chest'],
                'Upper Back': ['Thread the needle', 'Thoracic extension on foam roller', 'Cat-cow', 'Wall angels'],
                'Shoulders': ['Cross-body shoulder stretch', 'Sleeper stretch', 'Doorway pec stretch', 'Shoulder dislocates'],
                'Neck': ['Upper trap stretch', 'Levator scapulae stretch', 'Chin tucks', 'Neck rotations'],
                'Quads': ['Standing quad stretch', 'Couch stretch', 'Kneeling lunge stretch', 'Side-lying quad stretch'],
                'Calves': ['Wall calf stretch', 'Downward dog calf pulse', 'Soleus stretch', 'Step-down stretch'],
                'Ankles': ['Ankle CARs', 'Banded ankle mobilization', 'Heel sit', 'Calf raises slow'],
                'Wrists': ['Wrist flexor stretch', 'Wrist extensor stretch', 'Prayer stretch', 'Wrist CARs'],
                'Chest': ['Doorway pec stretch', 'Floor angel', 'Cobra pose', 'Foam roller chest opener'],
                'Glutes': ['Figure-4 stretch', 'Pigeon pose', 'Seated glute stretch', 'Supine glute stretch'],
                'Full Body': ["Sun salutation flow", "Child's pose", 'Cat-cow', 'Standing forward fold'],
              };
              const suggested = Array.from(new Set(stretchFocusAreas.flatMap((a) => STRETCH_SUGGESTIONS[a] || [])));
              const addExercise = (name: string, duration = '') => {
                if (!name.trim()) return;
                if (stretchExercises.some((e) => e.name.toLowerCase() === name.toLowerCase())) return;
                setStretchExercises([...stretchExercises, { name: name.trim(), duration: duration.trim() }]);
              };
              return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Stretching & Mobility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block">Focus Areas</Label>
                    <div className="flex flex-wrap gap-1">
                      {[
                        'Hips', 'Hamstrings', 'Lower Back', 'Upper Back',
                        'Shoulders', 'Neck', 'Quads', 'Calves',
                        'Ankles', 'Wrists', 'Chest', 'Glutes',
                        'Full Body',
                      ].map((area) => {
                        const active = stretchFocusAreas.includes(area);
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() =>
                              setStretchFocusAreas(
                                active
                                  ? stretchFocusAreas.filter((a) => a !== area)
                                  : [...stretchFocusAreas, area],
                              )
                            }
                            className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                              active
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border bg-secondary/30 hover:border-primary/40 hover:bg-primary/5 text-foreground'
                            }`}
                          >
                            {area}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block">Exercises</Label>
                    {stretchExercises.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {stretchExercises.map((ex, i) => (
                          <div
                            key={i}
                            className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md border border-primary/40 bg-primary/10 text-xs"
                          >
                            <span className="font-medium">{ex.name}</span>
                            {ex.duration && (
                              <span className="text-muted-foreground">· {ex.duration}</span>
                            )}
                            <button
                              type="button"
                              className="h-4 w-4 inline-flex items-center justify-center text-destructive hover:bg-destructive/10 rounded"
                              onClick={() =>
                                setStretchExercises(stretchExercises.filter((_, j) => j !== i))
                              }
                              aria-label={`Remove ${ex.name}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {suggested.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                          Suggestions for selected areas
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {suggested.map((name) => {
                            const already = stretchExercises.some(
                              (e) => e.name.toLowerCase() === name.toLowerCase(),
                            );
                            return (
                              <button
                                key={name}
                                type="button"
                                disabled={already}
                                onClick={() => addExercise(name)}
                                className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                                  already
                                    ? 'border-primary/30 bg-primary/10 text-muted-foreground cursor-default'
                                    : 'border-dashed border-border hover:border-primary/50 hover:bg-primary/5'
                                }`}
                              >
                                {already ? '✓ ' : '+ '}{name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-[1fr_90px_auto] gap-1.5">
                      <Input
                        className="h-8 text-xs"
                        value={stretchNewName}
                        onChange={(e) => setStretchNewName(e.target.value)}
                        placeholder="Custom exercise"
                      />
                      <Input
                        className="h-8 text-xs"
                        value={stretchNewDuration}
                        onChange={(e) => setStretchNewDuration(e.target.value)}
                        placeholder="60s"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8"
                        disabled={!stretchNewName.trim()}
                        onClick={() => {
                          addExercise(stretchNewName, stretchNewDuration);
                          setStretchNewName('');
                          setStretchNewDuration('');
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })()}

            {/* My Fight Review */}
            {fightReview && (
              <>
                {/* Card 1 — Fight details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Swords className="h-4 w-4 text-destructive" />
                      Fight Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs mb-2 block">Fight Type</Label>
                      <ChipSelect
                        options={['Sparring match', 'Interclub', 'Smoker', 'Amateur', 'Pro']}
                        value={fightType}
                        onChange={setFightType}
                      />
                    </div>

                    <div>
                      <Label htmlFor="fightEvent">Event</Label>
                      <Input
                        id="fightEvent"
                        value={fightEvent}
                        onChange={(e) => setFightEvent(e.target.value)}
                        placeholder="e.g., Cage Warriors 175"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="frc" className="text-xs">Rounds</Label>
                        <Input
                          id="frc"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={fightRoundCount}
                          onChange={(e) => setFightRoundCount(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="e.g., 3"
                        />
                      </div>
                      <div>
                        <Label htmlFor="frd" className="text-xs">Round duration</Label>
                        <Input
                          id="frd"
                          value={fightRoundDuration}
                          onChange={(e) => setFightRoundDuration(e.target.value)}
                          placeholder="e.g., 5 min"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs mb-2 block">Result</Label>
                      <ChipSelect
                        options={['Win', 'Loss', 'Draw', 'No Contest']}
                        value={fightResult}
                        onChange={(v) => {
                          setFightResult(v);
                          if (v !== 'Win' && v !== 'Loss') setFightMethod('');
                        }}
                      />
                    </div>

                    {(fightResult === 'Win' || fightResult === 'Loss') && (
                      <div>
                        <Label>Method</Label>
                        <Select value={fightMethod} onValueChange={setFightMethod}>
                          <SelectTrigger><SelectValue placeholder="How did it end?" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KO/TKO">KO / TKO</SelectItem>
                            <SelectItem value="Submission">Submission</SelectItem>
                            <SelectItem value="Decision (Unanimous)">Decision — Unanimous</SelectItem>
                            <SelectItem value="Decision (Split)">Decision — Split</SelectItem>
                            <SelectItem value="Decision (Majority)">Decision — Majority</SelectItem>
                            <SelectItem value="DQ">DQ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Card 2 — Opponent */}
                <Card>
                  <CardHeader>
                    <CardTitle>Opponent</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="oppName">Name</Label>
                      <Input
                        id="oppName"
                        value={fightOpponentName}
                        onChange={(e) => setFightOpponentName(e.target.value)}
                        placeholder="Opponent's name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-2 block">Fight Style</Label>
                      <ChipSelect
                        options={['Pressure', 'Counter', 'Out-fighter', 'Brawler', 'Grappler', 'Wrestler', 'Mixed']}
                        value={fightOpponentStyle}
                        onChange={setFightOpponentStyle}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-2 block">Stance</Label>
                      <ChipSelect
                        options={['Orthodox', 'Southpaw', 'Switch']}
                        value={fightOpponentStance}
                        onChange={setFightOpponentStance}
                      />
                    </div>
                    <div>
                      <Label htmlFor="oppWeight" className="text-xs">Weight class / Weigh-in</Label>
                      <Input
                        id="oppWeight"
                        value={fightOpponentWeight}
                        onChange={(e) => setFightOpponentWeight(e.target.value)}
                        placeholder="e.g., Welterweight 77kg"
                      />
                    </div>
                    <div>
                      <Label htmlFor="oppNotes" className="text-xs">Opponent notes (optional)</Label>
                      <Textarea
                        id="oppNotes"
                        rows={3}
                        value={fightOpponentNotes}
                        onChange={(e) => setFightOpponentNotes(e.target.value)}
                        placeholder="Tendencies, strengths, weaknesses…"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2.5 — Details (free comment, after Opponent) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label htmlFor="fightDetails" className="text-xs mb-2 block">
                      Anything worth remembering — context, camp, weight cut, gameplan, what went down.
                    </Label>
                    <Textarea
                      id="fightDetails"
                      rows={5}
                      value={fightFreeComment}
                      onChange={(e) => setFightFreeComment(e.target.value)}
                      placeholder="Free notes about the fight…"
                    />
                  </CardContent>
                </Card>

                {/* Card 3 — Rounds */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rounds</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {fightRounds.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Add rounds one by one. Per-round notes and key techniques are stored together.
                      </p>
                    )}

                    {fightRounds.map((round, idx) => (
                      <Card key={idx} className="border-border/60 bg-secondary/20">
                        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                          <CardTitle className="text-sm uppercase tracking-wide">
                            Round {round.roundNumber}
                          </CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() =>
                              setFightRounds(
                                fightRounds
                                  .filter((_, i) => i !== idx)
                                  .map((r, i) => ({ ...r, roundNumber: i + 1 })),
                              )
                            }
                          >
                            ×
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-xs">Notes</Label>
                            <Textarea
                              rows={2}
                              value={round.notes}
                              onChange={(e) => {
                                const next = [...fightRounds];
                                next[idx] = { ...round, notes: e.target.value };
                                setFightRounds(next);
                              }}
                              placeholder="What happened this round?"
                            />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">Techniques used</Label>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {round.techniques.map((t, ti) => (
                                <Badge
                                  key={ti}
                                  variant="default"
                                  className="text-xs px-2 py-1 bg-primary/20 text-primary border border-primary/40 cursor-pointer"
                                  onClick={() => {
                                    const next = [...fightRounds];
                                    next[idx] = {
                                      ...round,
                                      techniques: round.techniques.filter((_, j) => j !== ti),
                                    };
                                    setFightRounds(next);
                                  }}
                                >
                                  {t} ×
                                </Badge>
                              ))}
                            </div>
                            <Input
                              placeholder="Type a technique + Enter (e.g., Jab-Cross-Hook)"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const v = (e.target as HTMLInputElement).value.trim();
                                  if (v) {
                                    const next = [...fightRounds];
                                    next[idx] = { ...round, techniques: [...round.techniques, v] };
                                    setFightRounds(next);
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                            {techniqueOptions.length > 0 && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Tip: matches your technique library — pick from{' '}
                                <a href="/library" className="text-primary underline">/library</a>.
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setFightRounds([
                          ...fightRounds,
                          { roundNumber: fightRounds.length + 1, notes: '', techniques: [] },
                        ])
                      }
                    >
                      + Add Round
                    </Button>
                  </CardContent>
                </Card>

                {/* Card 4 — Outcome reflection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Reflection</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs mb-2 block">Mindset during the fight</Label>
                      <ChipSelect
                        options={mindsetOptions}
                        value={fightMindset}
                        onChange={setFightMindset}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fightFree">Free comment</Label>
                      <Textarea
                        id="fightFree"
                        rows={4}
                        value={fightFreeComment}
                        onChange={(e) => setFightFreeComment(e.target.value)}
                        placeholder="Anything else you want to remember about this fight…"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {cardio && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CARDIO_ACTIVITIES.map((a) => (
                        <Button
                          key={a}
                          type="button"
                          size="sm"
                          variant={cardioActivity === a ? 'default' : 'outline'}
                          className={`text-xs min-h-10 h-auto py-2 px-2 whitespace-normal text-center leading-tight break-words ${cardioActivity === a ? '' : 'border-border'}`}
                          onClick={() => setCardioActivity(cardioActivity === a ? '' : a)}
                        >
                          {a}
                        </Button>
                      ))}
                    </div>
                    {cardioActivity === 'Other' && (
                      <div>
                        <Label className="text-xs">Specify activity</Label>
                        <Input
                          value={cardioActivityOther}
                          onChange={(e) => setCardioActivityOther(e.target.value)}
                          placeholder="Custom activity name"
                        />
                      </div>
                    )}

                    {cardioActivity === 'Functional Training' && (
                      <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3">
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant={functionalMode === 'preset' ? 'default' : 'outline'} className="text-xs h-8 flex-1" onClick={() => setFunctionalMode('preset')}>Preset</Button>
                          <Button type="button" size="sm" variant={functionalMode === 'build' ? 'default' : 'outline'} className="text-xs h-8 flex-1" onClick={() => setFunctionalMode('build')}>Build custom</Button>
                        </div>
                        {functionalMode === 'preset' ? (
                          <div>
                            <Label className="text-xs mb-2 block">Preset format</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {FUNCTIONAL_PRESETS.map((p) => (
                                <Badge
                                  key={p}
                                  variant={functionalPreset === p ? 'default' : 'outline'}
                                  className={`cursor-pointer text-xs px-2.5 py-1 ${functionalPreset === p ? 'bg-primary text-primary-foreground' : 'border-border hover:border-primary/40'}`}
                                  onClick={() => setFunctionalPreset(functionalPreset === p ? '' : p)}
                                >
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Label className="text-xs">Describe your circuit</Label>
                            <Textarea value={functionalBuild} onChange={(e) => setFunctionalBuild(e.target.value)} placeholder="e.g., 5 rounds: 10 burpees, 15 KB swings, 20 air squats" rows={3} />
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Session Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Duration</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input type="number" min="0" placeholder="Hours" value={cardioHours} onChange={(e) => setCardioHours(e.target.value)} />
                        <Input type="number" min="0" max="59" placeholder="Min" value={cardioMinutes} onChange={(e) => setCardioMinutes(e.target.value)} />
                        <Input type="number" min="0" max="59" placeholder="Sec" value={cardioSeconds} onChange={(e) => setCardioSeconds(e.target.value)} />
                      </div>
                    </div>

                    {showDistance && (
                      <div>
                        <Label>Distance (meters)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={cardioDistance}
                          onChange={(e) => setCardioDistance(e.target.value)}
                          placeholder="e.g., 5000"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Calories</Label>
                        <Input type="number" min="0" value={cardioCalories} onChange={(e) => setCardioCalories(e.target.value)} placeholder="kcal (optional)" />
                      </div>
                      <div>
                        <Label>Avg Heart Rate</Label>
                        <Input type="number" min="0" value={cardioAvgHr} onChange={(e) => setCardioAvgHr(e.target.value)} placeholder="bpm (optional)" />
                      </div>
                    </div>

                    <div>
                      <Label>Max Heart Rate</Label>
                      <Input type="number" min="0" value={cardioMaxHr} onChange={(e) => setCardioMaxHr(e.target.value)} placeholder="bpm (optional)" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>RPE (Rate of Perceived Exertion)</Label>
                        <span className="text-sm font-semibold tabular-nums">{cardioRpe} — {rpeLabel(cardioRpe)}</span>
                      </div>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[cardioRpe]}
                        onValueChange={(v) => setCardioRpe(v[0])}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                        <span>1–3 Easy</span>
                        <span>4–6 Moderate</span>
                        <span>7–8 Hard</span>
                        <span>9–10 Max</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Strength: Workout card with two tabs */}
            {strength && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-primary" />
                    Workout
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={strengthTab} onValueChange={(v) => setStrengthTab(v as 'live' | 'program')}>
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="live">Build live</TabsTrigger>
                      <TabsTrigger value="program">Load program</TabsTrigger>
                    </TabsList>

                    <TabsContent value="live" className="mt-4">
                      <StrengthWorkoutForm
                        sessionId={sessionId}
                        userId={user?.id || ''}
                        workoutName={workoutName}
                        setWorkoutName={setWorkoutName}
                        workoutType={workoutType}
                        setWorkoutType={setWorkoutType}
                        workoutMode={workoutMode}
                        setWorkoutMode={setWorkoutMode}
                        exercises={exercises}
                        setExercises={setExercises}
                        totals={strengthTotals}
                      />
                    </TabsContent>

                    <TabsContent value="program" className="mt-4">
                      {templates.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No saved programs yet. Build one in the "Build live" tab and save it as a template.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {templates.map((tmpl) => (
                            <Button
                              key={tmpl.id}
                              type="button"
                              variant="outline"
                              className="w-full justify-start h-auto py-3 text-left"
                              onClick={() => loadTemplateIntoForm(tmpl.id)}
                            >
                              <div>
                                <p className="font-medium">{tmpl.name}</p>
                                {tmpl.workout_type && (
                                  <p className="text-xs text-muted-foreground">{tmpl.workout_type}</p>
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* My Performance — universal (hidden for stretching & fight review) */}
            {!stretching && !fightReview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  My Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Before Training</p>
                  </div>
                  <div>
                    <Label className="text-xs">Emotion</Label>
                    <Select value={beforeEmotion || undefined} onValueChange={(v) => setBeforeEmotion(v === '__clear__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Select emotion" /></SelectTrigger>
                      <SelectContent>
                        {beforeEmotion && <SelectItem value="__clear__">Clear selection</SelectItem>}
                        {emotionOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Mindset</Label>
                    <Select value={beforeMindset || undefined} onValueChange={(v) => setBeforeMindset(v === '__clear__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Select mindset" /></SelectTrigger>
                      <SelectContent>
                        {beforeMindset && <SelectItem value="__clear__">Clear selection</SelectItem>}
                        {mindsetOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-border" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">After Training</p>
                  </div>
                  <div>
                    <Label className="text-xs">Emotion</Label>
                    <Select value={afterEmotion || undefined} onValueChange={(v) => setAfterEmotion(v === '__clear__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Select emotion" /></SelectTrigger>
                      <SelectContent>
                        {afterEmotion && <SelectItem value="__clear__">Clear selection</SelectItem>}
                        {emotionOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Mindset</Label>
                    <Select value={afterMindset || undefined} onValueChange={(v) => setAfterMindset(v === '__clear__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Select mindset" /></SelectTrigger>
                      <SelectContent>
                        {afterMindset && <SelectItem value="__clear__">Clear selection</SelectItem>}
                        {mindsetOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Effort — universal (hidden for stretching) */}
            {!cardio && !sparring && !fightReview && !stretching && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Effort
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs mb-2 block">Physical Effort Level</Label>
                    <div className="flex gap-1.5">
                      {effortLevels.map((level) => (
                        <EffortButton key={level} label={level} selected={physicalEffort === level}
                          onClick={() => setPhysicalEffort(physicalEffort === level ? '' : level)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-2 block">Mental Effort Level</Label>
                    <div className="flex gap-1.5">
                      {effortLevels.map((level) => (
                        <EffortButton key={level} label={level} selected={mentalEffort === level}
                          onClick={() => setMentalEffort(mentalEffort === level ? '' : level)} />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fighter Note — technical only */}
            {technical && isFighterApproved && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-4 w-4 text-primary" />
                    Fighter Note
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={makeFighterNote}
                      onCheckedChange={(v) => setMakeFighterNote(v === true)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">Make this a Fighter Note</p>
                      <p className="text-xs text-muted-foreground">
                        Also link to your Fighter Profile and feed Fighter Statistics.
                      </p>
                    </div>
                  </label>

                  {makeFighterNote && (
                    <div className="space-y-4 pt-2 border-t border-border">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="attempts" className="text-xs">Attempts</Label>
                          <Input
                            id="attempts"
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            value={attemptsCount}
                            onChange={(e) => setAttemptsCount(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="executed" className="text-xs">Executed</Label>
                          <Input
                            id="executed"
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            value={executedCount}
                            onChange={(e) => setExecutedCount(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs mb-2 block">Execution Rate</Label>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full ${rateColor} transition-all`}
                              style={{ width: `${attemptsNum > 0 ? executionRate : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold tabular-nums w-16 text-right">
                            {attemptsNum > 0 ? `${executionRate}%` : 'No data'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs mb-2 block">Physical Effort of Execution</Label>
                        <div className="flex gap-1.5">
                          {effortLevels.map((level) => (
                            <EffortButton
                              key={level}
                              label={level}
                              selected={physicalEffortExecution === level}
                              onClick={() =>
                                setPhysicalEffortExecution(physicalEffortExecution === level ? '' : level)
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs mb-2 block">Mindset Effort of Execution</Label>
                        <ChipSelect
                          options={mindsetOptions}
                          value={mindsetEffortExecution}
                          onChange={setMindsetEffortExecution}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes & Tags — universal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="What happened? What worked? What needs improvement?" />
                </div>

                {!stretching && (
                  <div>
                    <Label>YouTube / Video URL (optional)</Label>
                    <Input
                      type="url"
                      inputMode="url"
                      maxLength={500}
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                )}

                {!stretching && !fightReview && !isCardioType(classType) && (
                  <PredictiveTagInput
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                    disciplines={selectedDisciplines}
                  />
                )}
              </CardContent>
            </Card>

            {/* Save / Cancel — universal */}
            <Card>
              <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving…' : 'Save Session'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </form>
    </div>
  );
}
