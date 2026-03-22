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
import { disciplines, strategies, getTechniques, feelings } from '@/config/dropdownOptions';
import { TagSelector } from './TagSelector';

interface SessionFormProps {
  sessionId?: string;
}

const intensityOptions = ['Low', 'Moderate', 'High', 'Very High'] as const;
const feelingOptions = ['Sharp', 'Good', 'Average', 'Tired', 'Heavy', 'Frustrated', 'Confident', 'Focused'] as const;

export function SessionForm({ sessionId }: SessionFormProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Parse user's profile disciplines
  const profileDisciplines: MartialArtsDiscipline[] = profile?.discipline
    ? (profile.discipline.split(',').map(d => d.trim()).filter(d => disciplines.includes(d as MartialArtsDiscipline)) as MartialArtsDiscipline[])
    : [];
  const availableDisciplines = profileDisciplines.length > 0 ? profileDisciplines : disciplines;
  const singleDiscipline = profileDisciplines.length === 1;
  
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [discipline, setDiscipline] = useState<MartialArtsDiscipline>(availableDisciplines[0] || 'MMA');
  const [strategy, setStrategy] = useState<Strategy | ''>('');
  const [technique, setTechnique] = useState<string>('');
  const [title, setTitle] = useState('');
  const [firstMovement, setFirstMovement] = useState('');
  const [opponentReaction, setOpponentReaction] = useState('');
  const [thirdMovement, setThirdMovement] = useState('');
  const [notes, setNotes] = useState('');
  const [intensity, setIntensity] = useState<string>('');
  const [feeling, setFeeling] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
      setDiscipline(session.discipline as MartialArtsDiscipline);
      setStrategy((session.strategy as Strategy) || '');
      setTechnique((session as any).technique || session.first_movement || '');
      setTitle(session.title || '');
      setFirstMovement(session.first_movement || '');
      setOpponentReaction(session.opponent_action || '');
      setThirdMovement(session.second_movement || '');
      setNotes(session.notes || '');
      // Map old intensity numbers to new labels
      if (session.intensity) {
        if (session.intensity <= 3) setIntensity('Low');
        else if (session.intensity <= 5) setIntensity('Moderate');
        else if (session.intensity <= 7) setIntensity('High');
        else setIntensity('Very High');
      }
      setFeeling(session.feeling || '');

      const { data: sessionTagsData } = await supabase
        .from('session_tags')
        .select('tag_id, tags(name)')
        .eq('session_id', sessionId);
      if (sessionTagsData) {
        setSelectedTags(sessionTagsData.map((st: any) => st.tags?.name).filter(Boolean));
      }
    }
  };

  const intensityToNumber = (label: string): number => {
    switch (label) {
      case 'Low': return 3;
      case 'Moderate': return 5;
      case 'High': return 7;
      case 'Very High': return 9;
      default: return 5;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!technique) {
      toast({ title: 'Validation', description: 'Please select a technique', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const sessionData: any = {
        user_id: user.id,
        date,
        time: startTime || null,
        session_type: 'Completed',
        discipline,
        title: title || null,
        intensity: intensity ? intensityToNumber(intensity) : null,
        feeling: feeling || null,
        notes: notes || null,
        strategy: strategy || null,
        technique: technique || null,
        first_movement: firstMovement || null,
        opponent_action: opponentReaction || null,
        second_movement: thirdMovement || null,
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

      // Build auto-tags from all fields
      const autoTags: string[] = [discipline];
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

  const techniqueOptions = getTechniques(discipline);

  // Duration calculation
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

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 1. Title */}
            <div>
              <Label htmlFor="title">Session Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Jab timing study" />
            </div>

            {/* 2. Date & Time */}
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

            {/* 3. Discipline */}
            {singleDiscipline ? (
              <div>
                <Label>Discipline</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-sm py-1.5 px-3">{discipline}</Badge>
                  <span className="text-xs text-muted-foreground">From your profile</span>
                </div>
              </div>
            ) : (
              <div>
                <Label>Discipline</Label>
                {availableDisciplines.length <= 3 ? (
                  <div className="flex gap-2 mt-1.5">
                    {availableDisciplines.map((d) => (
                      <Button
                        key={d}
                        type="button"
                        size="sm"
                        variant={discipline === d ? 'default' : 'outline'}
                        onClick={() => { setDiscipline(d); setTechnique(''); }}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Select value={discipline} onValueChange={(value: MartialArtsDiscipline) => {
                    setDiscipline(value);
                    setTechnique('');
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableDisciplines.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* 4. Strategy */}
            <div>
              <Label>Strategy</Label>
              <Select value={strategy} onValueChange={(v: Strategy) => setStrategy(v)}>
                <SelectTrigger><SelectValue placeholder="Select strategy" /></SelectTrigger>
                <SelectContent>
                  {strategies.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Technique */}
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

        {/* Movement Chain */}
        <Card>
          <CardHeader>
            <CardTitle>Movement Chain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 6. 1st Movement */}
            <div>
              <Label htmlFor="firstMovement">1st Movement <span className="text-muted-foreground text-xs">(How did you start?)</span></Label>
              <Input id="firstMovement" value={firstMovement} onChange={(e) => setFirstMovement(e.target.value)} placeholder="e.g., Jab entry, Level change, Feint low kick" />
            </div>

            {/* 7. 2nd Movement */}
            <div>
              <Label htmlFor="opponentReaction">2nd Movement <span className="text-muted-foreground text-xs">(Opponent reaction)</span></Label>
              <Input id="opponentReaction" value={opponentReaction} onChange={(e) => setOpponentReaction(e.target.value)} placeholder="e.g., Stepped back, Parried, Sprawled" />
            </div>

            {/* 8. 3rd Movement */}
            <div>
              <Label htmlFor="thirdMovement">3rd Movement <span className="text-muted-foreground text-xs">(What did I capitalize with?)</span></Label>
              <Input id="thirdMovement" value={thirdMovement} onChange={(e) => setThirdMovement(e.target.value)} placeholder="e.g., Low kick, Double leg finish, Back take" />
            </div>
          </CardContent>
        </Card>

        {/* Notes & State */}
        <Card>
          <CardHeader>
            <CardTitle>Notes & State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 9. Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="What happened? What worked? What needs improvement?" />
            </div>

            {/* 10. Intensity */}
            <div>
              <Label>Intensity</Label>
              <Select value={intensity} onValueChange={setIntensity}>
                <SelectTrigger><SelectValue placeholder="Select intensity" /></SelectTrigger>
                <SelectContent>
                  {intensityOptions.map((i) => (<SelectItem key={i} value={i}>{i}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* 11. Feeling */}
            <div>
              <Label>Feeling</Label>
              <Select value={feeling} onValueChange={setFeeling}>
                <SelectTrigger><SelectValue placeholder="Select feeling" /></SelectTrigger>
                <SelectContent>
                  {feelingOptions.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Tags */}
            <TagSelector
              sessionId={sessionId}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
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
