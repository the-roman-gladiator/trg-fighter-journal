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

export function SessionForm({ sessionId }: SessionFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [discipline, setDiscipline] = useState<MartialArtsDiscipline>('MMA');
  const [strategy, setStrategy] = useState<Strategy | ''>('');
  const [technique, setTechnique] = useState<string>('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [intensity, setIntensity] = useState<number>(5);
  const [feeling, setFeeling] = useState<string>('Normal');
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
      setDiscipline(session.discipline as MartialArtsDiscipline);
      setStrategy((session.strategy as Strategy) || '');
      setTechnique(session.first_movement || '');
      setTitle(session.title || '');
      setNotes(session.notes || '');
      setIntensity(session.intensity || 5);
      setFeeling(session.feeling || 'Normal');

      // Load tags
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

    if (!technique) {
      toast({ title: 'Validation', description: 'Please select a technique', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const sessionData: any = {
        user_id: user.id,
        date,
        session_type: 'Completed',
        discipline,
        title: title || null,
        intensity,
        feeling: feeling || null,
        notes: notes || null,
        strategy: strategy || null,
        first_movement: technique || null,
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

      // Build auto-tags from discipline, strategy, technique
      const autoTags: string[] = [discipline];
      if (strategy) autoTags.push(strategy);
      if (technique) autoTags.push(technique);

      // Merge with custom tags, deduplicate (case-insensitive)
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

      // Save tags
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

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date */}
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            {/* Discipline */}
            <div>
              <Label>Discipline</Label>
              <Select value={discipline} onValueChange={(value: MartialArtsDiscipline) => {
                setDiscipline(value);
                setTechnique('');
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {disciplines.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Strategy */}
            <div>
              <Label>Strategy</Label>
              <Select value={strategy} onValueChange={(v: Strategy) => setStrategy(v)}>
                <SelectTrigger><SelectValue placeholder="Select strategy" /></SelectTrigger>
                <SelectContent>
                  {strategies.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Technique */}
            <div>
              <Label>Technique</Label>
              <Select value={technique} onValueChange={setTechnique}>
                <SelectTrigger><SelectValue placeholder="Select technique" /></SelectTrigger>
                <SelectContent>
                  {techniqueOptions.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Jab timing study" />
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="What happened in training? What worked? What needs improvement?" />
            </div>

            {/* Intensity */}
            <div>
              <Label>Intensity (1-10)</Label>
              <Input type="number" min="1" max="10" value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value))} />
            </div>

            {/* Feeling */}
            <div>
              <Label>Feeling</Label>
              <Select value={feeling} onValueChange={setFeeling}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {feelings.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
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
