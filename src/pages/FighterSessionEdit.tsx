import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFighterProfile } from '@/hooks/useFighterProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Shield } from 'lucide-react';
import { getAllowedTactics } from '@/lib/disciplineTactics';


const OPPONENT_SCENARIOS = [
  'Pressure fighter', 'Counter striker', 'Wrestler', 'Grappler',
  'Aggressive starter', 'Defensive fighter', 'Southpaw', 'Orthodox',
] as const;
const GOALS = [
  'Score points', 'Damage', 'Break posture', 'Create takedown',
  'Create submission', 'Cage control', 'Finish',
] as const;
const FIGHT_DISCIPLINES = ['MMA', 'Muay Thai', 'K1', 'Boxing', 'BJJ', 'Grappling', 'Wrestling'];

export default function FighterSessionEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const { fighterProfile, isFighterApproved, loading: fpLoading } = useFighterProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isNew = !id || id === 'new';
  const approvedDiscs = fighterProfile?.approved_fight_disciplines || [];
  const availableDiscs = approvedDiscs.length > 0 ? approvedDiscs : FIGHT_DISCIPLINES;

  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState(availableDiscs[0] || 'MMA');
  const [opponentScenario, setOpponentScenario] = useState('');
  const [strategy, setStrategy] = useState('');
  const [tactic, setTactic] = useState('');
  const [action, setAction] = useState('');
  const [goal, setGoal] = useState('');
  const [notes, setNotes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
  }, [user]);

  useEffect(() => {
    if (!isNew && user) fetchSession();
  }, [id, user]);

  useEffect(() => {
    if (approvedDiscs.length > 0 && !approvedDiscs.includes(discipline)) {
      setDiscipline(approvedDiscs[0]);
    }
  }, [approvedDiscs]);

  // Clear tactic when discipline changes if it's no longer allowed (e.g. switching to K1 with Control selected)
  useEffect(() => {
    if (tactic && !getAllowedTactics(discipline).includes(tactic as any)) {
      setTactic('');
    }
  }, [discipline, tactic]);

  const fetchSession = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('fighter_sessions')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) {
      toast({ title: 'Error', description: 'Session not found', variant: 'destructive' });
      navigate('/fighter');
      return;
    }
    setTitle(data.title);
    setDiscipline(data.discipline);
    setOpponentScenario(data.opponent_scenario || '');
    setStrategy(data.strategy || '');
    setTactic(data.tactic || '');
    setAction(data.action || '');
    setGoal(data.goal || '');
    setNotes(data.notes || '');
    setVideoUrl((data as any).video_url || '');
    setStatus(data.status);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) {
      toast({ title: 'Validation', description: 'Title is required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        user_id: user.id,
        title: title.trim(),
        discipline,
        opponent_scenario: opponentScenario || null,
        strategy: strategy || null,
        tactic: tactic || null,
        action: action || null,
        goal: goal || null,
        notes: notes || null,
        video_url: videoUrl.trim() || null,
        status,
      };

      if (isNew) {
        const { data, error } = await supabase.from('fighter_sessions').insert([payload]).select().single();
        if (error) throw error;
        toast({ title: 'Saved', description: 'Fighter session created.' });
        navigate(`/fighter/session/${data.id}`);
      } else {
        const { error } = await supabase.from('fighter_sessions').update(payload).eq('id', id);
        if (error) throw error;
        toast({ title: 'Updated', description: 'Session updated.' });
        navigate(`/fighter/session/${id}`);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (fpLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  if (!isFighterApproved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-destructive/50 mx-auto mb-4" />
          <p className="text-muted-foreground">This section is available for approved fighters only.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/fighter')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-xl font-bold mt-2">{isNew ? 'New Fighter Session' : 'Edit Fighter Session'}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Details */}
          <Card>
            <CardHeader><CardTitle>Session Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Session Title *</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Clinch to Darce game plan" required />
              </div>
              <div>
                <Label>Discipline</Label>
                <Select value={discipline} onValueChange={setDiscipline}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableDiscs.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Opponent / Scenario</Label>
                <Select value={opponentScenario} onValueChange={setOpponentScenario}>
                  <SelectTrigger><SelectValue placeholder="Select scenario" /></SelectTrigger>
                  <SelectContent>
                    {OPPONENT_SCENARIOS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Goal</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
                  <SelectContent>
                    {GOALS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Strategy · Tactics · Action */}
          <Card>
            <CardHeader><CardTitle>Strategy · Tactics · Action</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Strategy */}
              <div>
                <Label htmlFor="strategy">Strategy</Label>
                <Textarea
                  id="strategy"
                  value={strategy}
                  onChange={e => setStrategy(e.target.value)}
                  rows={3}
                  placeholder="Example: Pressure opponent into clinch, land knees, then transition to Darce choke."
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Strategy = the overall plan or objective you want to achieve in this sequence.
                </p>
              </div>

              {/* Tactics */}
              <div>
                <Label>Tactics</Label>
                <Select value={tactic} onValueChange={setTactic}>
                  <SelectTrigger><SelectValue placeholder="Select tactic" /></SelectTrigger>
                  <SelectContent>
                    {getAllowedTactics(discipline).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Tactics = the tactical situation or approach used to apply the strategy.
                </p>
              </div>

              {/* Action */}
              <div>
                <Label htmlFor="action">Action</Label>
                <Textarea
                  id="action"
                  value={action}
                  onChange={e => setAction(e.target.value)}
                  rows={5}
                  placeholder="Example: Jab and cross while stepping backward to draw pressure. As opponent closes distance, enter head clinch, throw 2–3 knees, snap down to front head control, then finish with Darce choke."
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Action = the exact sequence of movements, reactions, transitions, and finish.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Status */}
          <Card>
            <CardHeader><CardTitle>Notes & Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Additional observations..." />
              </div>
              <div>
                <Label>YouTube / Video URL (optional)</Label>
                <Input type="url" inputMode="url" maxLength={500}
                  value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..." />
              </div>
              <div>
                <Label>Session Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="approved">Approved by Coach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 sticky bottom-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Submitting…' : 'Done'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </form>
      </main>
    </div>
  );
}
