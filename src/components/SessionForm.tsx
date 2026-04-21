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
import { useToast } from '@/hooks/use-toast';
import { MartialArtsDiscipline, Strategy } from '@/types/training';
import { Badge } from '@/components/ui/badge';
import { disciplines, strategies } from '@/config/dropdownOptions';
import { PredictiveTagInput } from './PredictiveTagInput';
import { MultiDisciplineSelect } from './MultiDisciplineSelect';
import { Brain, Heart, Zap, Swords } from 'lucide-react';
import { useUserLists, DEFAULT_CLASS_TYPES, DEFAULT_EMOTIONS, DEFAULT_MINDSETS } from '@/hooks/useUserLists';
import { Checkbox } from '@/components/ui/checkbox';
import { useFighterProfile } from '@/hooks/useFighterProfile';

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

export function SessionForm({ sessionId }: SessionFormProps) {
  const { user, profile } = useAuth();
  const { getActive } = useUserLists();
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
  // Multi-select disciplines. First selected stays as the primary `discipline` for backward compat.
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(
    profileDisciplines.length === 1 ? [profileDisciplines[0]] : []
  );
  const discipline: MartialArtsDiscipline = (selectedDisciplines[0] as MartialArtsDiscipline) || (availableDisciplines[0] || 'MMA');
  const [strategy, setStrategy] = useState<Strategy | ''>('');
  const [technique, setTechnique] = useState<string>('');
  const [title, setTitle] = useState('');
  const [firstMovement, setFirstMovement] = useState('');
  const [opponentReaction, setOpponentReaction] = useState('');
  const [thirdMovement, setThirdMovement] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Performance fields
  const [beforeEmotion, setBeforeEmotion] = useState('');
  const [beforeMindset, setBeforeMindset] = useState('');
  const [afterEmotion, setAfterEmotion] = useState('');
  const [afterMindset, setAfterMindset] = useState('');
  const [physicalEffort, setPhysicalEffort] = useState('');
  const [mentalEffort, setMentalEffort] = useState('');
  const [classType, setClassType] = useState('');

  useEffect(() => {
    if (sessionId && sessionId !== 'new') {
      fetchSession();
    }
  }, [sessionId]);

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
      setBeforeEmotion((session as any).before_emotion || '');
      setBeforeMindset((session as any).before_mindset || '');
      setAfterEmotion((session as any).after_emotion || '');
      setAfterMindset((session as any).after_mindset || '');
      setPhysicalEffort((session as any).physical_effort_level || '');
      setMentalEffort((session as any).mental_effort_level || '');
      setClassType((session as any).class_type || '');

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

    if (selectedDisciplines.length === 0) {
      toast({ title: 'Validation', description: 'Please select at least one discipline', variant: 'destructive' });
      return;
    }

    if (!technique) {
      toast({ title: 'Validation', description: 'Please select a technique', variant: 'destructive' });
      return;
    }

    setLoading(true);

    // Calculate effort score
    let effortScore: number | null = null;
    if (physicalEffort || mentalEffort) {
      const pScore = effortToScore(physicalEffort);
      const mScore = effortToScore(mentalEffort);
      const count = (pScore > 0 ? 1 : 0) + (mScore > 0 ? 1 : 0);
      effortScore = count > 0 ? (pScore + mScore) / count : null;
    }

    try {
      const sessionData: any = {
        user_id: user.id,
        date,
        time: startTime || null,
        session_type: 'Completed',
        discipline, // primary (first selected) — kept for backward compat
        disciplines: selectedDisciplines, // full multi-discipline list
        title: title || null,
        notes: notes || null,
        strategy: strategy || null,
        technique: technique || null,
        first_movement: firstMovement || null,
        opponent_action: opponentReaction || null,
        second_movement: thirdMovement || null,
        before_emotion: beforeEmotion || null,
        before_mindset: beforeMindset || null,
        after_emotion: afterEmotion || null,
        after_mindset: afterMindset || null,
        physical_effort_level: physicalEffort || null,
        mental_effort_level: mentalEffort || null,
        effort_score: effortScore,
        class_type: classType || null,
      };

      let savedSessionId = sessionId;

      if (sessionId && sessionId !== 'new') {
        const { error } = await supabase.from('training_sessions').update(sessionData).eq('id', sessionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('training_sessions').insert([sessionData]).select().single();
        if (error) throw error;
        savedSessionId = data.id;
      }

      // Build auto-tags from all fields (one tag per selected discipline)
      const autoTags: string[] = [...selectedDisciplines];
      if (strategy) autoTags.push(strategy);
      if (technique) autoTags.push(technique);
      if (firstMovement) autoTags.push(firstMovement);
      if (opponentReaction) autoTags.push(opponentReaction);
      if (thirdMovement) autoTags.push(thirdMovement);

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

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Session Details */}
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Session Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Jab timing study" />
            </div>

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

            <MultiDisciplineSelect
              options={availableDisciplines}
              value={selectedDisciplines}
              onChange={(next) => {
                setSelectedDisciplines(next);
                // Clear technique if its discipline is no longer selected
                setTechnique('');
              }}
              helper={profileDisciplines.length > 0 ? 'From your profile — pick one or more for this session.' : undefined}
            />

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
              <Label>Technique</Label>
              <Select value={technique} onValueChange={setTechnique}>
                <SelectTrigger><SelectValue placeholder="Select technique" /></SelectTrigger>
                <SelectContent>
                  {techniqueOptions.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Type Classes */}
        <Card>
          <CardHeader>
            <CardTitle>Type Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {classTypeOptions.map((ct) => (
                <Badge
                  key={ct}
                  variant={classType === ct ? 'default' : 'outline'}
                  className={`cursor-pointer text-xs px-2.5 py-1.5 transition-colors ${
                    classType === ct
                      ? 'bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/40 hover:bg-primary/5'
                  }`}
                  onClick={() => setClassType(classType === ct ? '' : ct)}
                >
                  {ct}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Movement Chain */}
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
          </CardContent>
        </Card>

        {/* My Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              My Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Before Training */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Before Training</p>
              </div>
              <div>
                <Label className="text-xs">Emotion</Label>
                <ChipSelect options={emotionOptions} value={beforeEmotion} onChange={setBeforeEmotion} />
              </div>
              <div>
                <Label className="text-xs">Mindset</Label>
                <ChipSelect options={mindsetOptions} value={beforeMindset} onChange={setBeforeMindset} />
              </div>
            </div>

            <div className="border-t border-border" />

            {/* After Training */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">After Training</p>
              </div>
              <div>
                <Label className="text-xs">Emotion</Label>
                <ChipSelect options={emotionOptions} value={afterEmotion} onChange={setAfterEmotion} />
              </div>
              <div>
                <Label className="text-xs">Mindset</Label>
                <ChipSelect options={mindsetOptions} value={afterMindset} onChange={setAfterMindset} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Effort */}
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

        {/* Notes & Tags */}
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

            <PredictiveTagInput
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              disciplines={selectedDisciplines}
            />
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex gap-4 sticky bottom-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Saving...' : 'Save Session'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}