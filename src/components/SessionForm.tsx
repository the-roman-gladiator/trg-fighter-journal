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
import { TrainingSession, TechniqueChain, Discipline, Strategy } from '@/types/training';
import { disciplines, sessionTypes, feelings, strategies, getFirstMovements } from '@/config/dropdownOptions';
import { TechniqueChainForm } from './TechniqueChainForm';
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
  const [notes, setNotes] = useState('');
  const [techniqueChains, setTechniqueChains] = useState<TechniqueChain[]>([]);
  const [showTechniqueForm, setShowTechniqueForm] = useState(false);
  const [editingTechniqueId, setEditingTechniqueId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId && sessionId !== 'new') {
      fetchSession();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    if (!sessionId || sessionId === 'new') return;

    const { data: session, error } = await supabase
      .from('training_sessions')
      .select(`
        *,
        technique_chains (*)
      `)
      .eq('id', sessionId)
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load session',
        variant: 'destructive',
      });
      return;
    }

    if (session) {
      setDate(session.date);
      setTime(session.time || '');
      setSessionType(session.session_type);
      setDiscipline(session.discipline);
      setTitle(session.title || '');
      setIntensity(session.intensity || 5);
      setFeeling(session.feeling || 'Normal');
      setStrategy(session.strategy || '');
      setFirstMovement(session.first_movement || '');
      setNotes(session.notes || '');
      setTechniqueChains(session.technique_chains || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const sessionData = {
        user_id: user.id,
        date,
        time: time || null,
        session_type: sessionType,
        discipline,
        title: title || null,
        intensity,
        feeling: (feeling as any) || null,
        strategy: (strategy as any) || null,
        first_movement: firstMovement || null,
        notes: notes || null,
      };

      let savedSessionId = sessionId;

      if (sessionId && sessionId !== 'new') {
        const { error } = await supabase
          .from('training_sessions')
          .update(sessionData)
          .eq('id', sessionId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('training_sessions')
          .insert([sessionData])
          .select()
          .single();

        if (error) throw error;
        savedSessionId = data.id;
      }

      toast({
        title: 'Success',
        description: 'Session saved successfully',
      });

      navigate(`/session/${savedSessionId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTechnique = async (technique: Partial<TechniqueChain>) => {
    if (!sessionId || sessionId === 'new') {
      toast({
        title: 'Save session first',
        description: 'Please save the session before adding techniques',
        variant: 'destructive',
      });
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
        const { error } = await supabase
          .from('technique_chains')
          .update(techniqueData)
          .eq('id', editingTechniqueId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('technique_chains')
          .insert([techniqueData]);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Technique saved',
      });

      setShowTechniqueForm(false);
      setEditingTechniqueId(null);
      fetchSession();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTechnique = async (id: string) => {
    try {
      const { error } = await supabase
        .from('technique_chains')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Technique removed',
      });

      fetchSession();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

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
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="time">Time (optional)</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sessionType">Session Type</Label>
                <Select value={sessionType} onValueChange={(value: any) => setSessionType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="discipline">Discipline</Label>
                <Select value={discipline} onValueChange={(value: Discipline) => {
                  setDiscipline(value);
                  setFirstMovement(''); // Reset first movement when discipline changes
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., MMA Striking – Cage Work"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="intensity">Intensity (1-10)</Label>
                <Input
                  id="intensity"
                  type="number"
                  min="1"
                  max="10"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="feeling">Feeling</Label>
                <Select value={feeling} onValueChange={setFeeling}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {feelings.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strategy">Strategy</Label>
                <Select value={strategy} onValueChange={(value: Strategy) => setStrategy(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="firstMovement">1st Movement</Label>
                <Select value={firstMovement} onValueChange={setFirstMovement}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select movement" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFirstMovements(discipline).map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Additional session notes..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Session'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>

      {sessionId && sessionId !== 'new' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Technique Chains</CardTitle>
              <Button
                onClick={() => {
                  setEditingTechniqueId(null);
                  setShowTechniqueForm(true);
                }}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Technique
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {techniqueChains.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No techniques added yet
              </p>
            ) : (
              <div className="space-y-4">
                {techniqueChains.map((tc) => (
                  <Card key={tc.id} className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-1 rounded bg-primary/10 text-primary text-sm">
                              {tc.discipline}
                            </span>
                            <span className="px-2 py-1 rounded bg-secondary/10 text-secondary text-sm">
                              {tc.sub_type}
                            </span>
                            <span className="px-2 py-1 rounded bg-accent/10 text-accent text-sm">
                              {tc.tactical_goal}
                            </span>
                          </div>
                          <p className="text-sm">
                            <strong>Start:</strong> {tc.starting_action} →{' '}
                            <strong>Defense:</strong> {tc.defender_reaction} →{' '}
                            <strong>Finish:</strong> {tc.continuation_finish}
                          </p>
                          {tc.custom_notes && (
                            <p className="text-sm text-muted-foreground">
                              {tc.custom_notes}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTechnique(tc.id)}
                        >
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
          onCancel={() => {
            setShowTechniqueForm(false);
            setEditingTechniqueId(null);
          }}
        />
      )}
    </div>
  );
}
