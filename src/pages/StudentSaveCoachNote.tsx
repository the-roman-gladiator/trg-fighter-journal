import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BookmarkPlus, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { PredictiveTagInput } from '@/components/PredictiveTagInput';
import {
  useUserLists, DEFAULT_EMOTIONS, DEFAULT_MINDSETS,
} from '@/hooks/useUserLists';
import { format } from 'date-fns';

const EFFORTS = ['Easy', 'Light', 'Moderate', 'Hard', 'Max'];

/**
 * Student page to review a coach note that was offered to them and save it
 * as their own training session (immutable snapshot of the coach note + their
 * own emotional/effort/notes/tags fields).
 */
export default function StudentSaveCoachNote() {
  const { offerId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getActive } = useUserLists();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offer, setOffer] = useState<any>(null);
  const [coachNote, setCoachNote] = useState<any>(null);
  const [coachName, setCoachName] = useState('');

  // Editable student fields
  const [beforeEmotion, setBeforeEmotion] = useState('');
  const [beforeMindset, setBeforeMindset] = useState('');
  const [afterEmotion, setAfterEmotion] = useState('');
  const [afterMindset, setAfterMindset] = useState('');
  const [physicalEffort, setPhysicalEffort] = useState('');
  const [mentalEffort, setMentalEffort] = useState('');
  const [notes, setNotes] = useState('');
  const [extraTags, setExtraTags] = useState<string[]>([]);

  const userEmotions = getActive('emotion').map(i => i.item_name);
  const emotionOptions = userEmotions.length > 0 ? userEmotions : DEFAULT_EMOTIONS;
  const userMindsets = getActive('mindset').map(i => i.item_name);
  const mindsetOptions = userMindsets.length > 0 ? userMindsets : DEFAULT_MINDSETS;

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!offerId) return;
    load();
  }, [offerId, user]);

  const load = async () => {
    setLoading(true);
    const { data: o } = await supabase
      .from('coach_note_offers')
      .select('*')
      .eq('id', offerId!)
      .maybeSingle();

    if (!o || o.student_id !== user!.id) {
      toast.error('Offer not found.');
      navigate('/');
      return;
    }
    setOffer(o);

    const { data: cn } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('id', o.coach_session_id)
      .maybeSingle();
    setCoachNote(cn);

    if (cn?.user_id) {
      const { data: cp } = await supabase
        .from('profiles')
        .select('name, middle_name, surname')
        .eq('id', cn.user_id)
        .maybeSingle();
      if (cp) setCoachName([cp.name, cp.middle_name, cp.surname].filter(Boolean).join(' '));
    }
    setLoading(false);
  };

  const handleDismiss = async () => {
    if (!offer) return;
    const { error } = await supabase
      .from('coach_note_offers')
      .update({ status: 'dismissed' })
      .eq('id', offer.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Note dismissed');
    navigate('/');
  };

  const handleSave = async () => {
    if (!offer || !coachNote || !user) return;
    setSaving(true);

    // Build immutable snapshot of the coach note
    const snapshot = {
      coach_session_id: coachNote.id,
      coach_id: coachNote.user_id,
      coach_name: coachName,
      note_type: coachNote.note_type,
      title: coachNote.title,
      discipline: coachNote.discipline,
      technique: coachNote.technique,
      tactic: coachNote.tactic,
      first_movement: coachNote.first_movement,
      opponent_action: coachNote.opponent_action,
      second_movement: coachNote.second_movement,
      session_plan: coachNote.session_plan,
      drills: coachNote.drills,
      notes: coachNote.notes,
      tags: coachNote.tags || [],
      snapshot_at: new Date().toISOString(),
    };

    const sessionData: any = {
      user_id: user.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      session_type: 'Completed',
      discipline: coachNote.discipline,
      disciplines: [coachNote.discipline],
      title: coachNote.title || coachNote.technique || 'Coach Note',
      technique: coachNote.technique || null,
      strategy: coachNote.tactic || null,
      first_movement: coachNote.first_movement || null,
      opponent_action: coachNote.opponent_action || null,
      second_movement: coachNote.second_movement || null,
      notes: notes || null,
      before_emotion: beforeEmotion || null,
      before_mindset: beforeMindset || null,
      after_emotion: afterEmotion || null,
      after_mindset: afterMindset || null,
      physical_effort_level: physicalEffort || null,
      mental_effort_level: mentalEffort || null,
      coach_session_id: coachNote.id,
      saved_from_coach_note: true,
      coach_note_snapshot: snapshot,
    };

    const { data: inserted, error } = await supabase
      .from('training_sessions')
      .insert([sessionData])
      .select()
      .single();
    if (error || !inserted) {
      toast.error(error?.message || 'Failed to save');
      setSaving(false);
      return;
    }

    // Auto-tags: discipline, tactic, technique, movements, plus coach-supplied tags + student extras
    const allTags: string[] = [
      coachNote.discipline,
      coachNote.tactic,
      coachNote.technique,
      coachNote.first_movement,
      coachNote.opponent_action,
      coachNote.second_movement,
      ...(coachNote.tags || []),
      ...extraTags,
    ].filter(Boolean);
    const seen = new Set<string>();
    const uniqueTags = allTags.filter(t => {
      const k = String(t).toLowerCase().trim();
      if (!k || seen.has(k)) return false;
      seen.add(k); return true;
    });

    for (const tagName of uniqueTags) {
      let { data: existingTag } = await supabase.from('tags').select('id').eq('name', tagName).single();
      if (!existingTag) {
        const { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select().single();
        existingTag = newTag;
      }
      if (existingTag) {
        await supabase.from('session_tags').insert({ session_id: inserted.id, tag_id: existingTag.id });
      }
    }

    // Update offer status
    await supabase
      .from('coach_note_offers')
      .update({ status: 'saved', saved_session_id: inserted.id })
      .eq('id', offer.id);

    toast.success('Saved to your journal');
    navigate(`/session/${inserted.id}`);
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!coachNote) return null;

  const chain = [coachNote.first_movement, coachNote.opponent_action, coachNote.second_movement].filter(Boolean).join(' → ');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 max-w-lg">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-xl font-bold mt-2">Save Coach Note</h1>
          <p className="text-xs text-muted-foreground">
            Add your reflection and save this to your journal. The coach's note will be preserved as a snapshot.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {/* Coach note preview (read-only snapshot) */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              🎓 {coachNote.title}
              <Badge variant="outline" className="text-[10px]">{coachNote.discipline}</Badge>
              {coachNote.note_type === 'technical_note' && <Badge variant="secondary" className="text-[10px]">Technical</Badge>}
            </CardTitle>
            {coachName && <p className="text-xs text-muted-foreground">From {coachName}</p>}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Discipline:</span> {coachNote.discipline}</p>
            {coachNote.tactic && <p><span className="text-muted-foreground">Tactic:</span> {coachNote.tactic}</p>}
            {coachNote.technique && <p><span className="text-muted-foreground">Technique:</span> {coachNote.technique}</p>}
            {chain && <p className="font-mono text-xs text-primary/80">{chain}</p>}
            {coachNote.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap"><b>Coach notes:</b> {coachNote.notes}</p>}
            {(coachNote.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {coachNote.tags.map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student-editable fields */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Your Reflection</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Before Emotion</Label>
                <Select value={beforeEmotion} onValueChange={setBeforeEmotion}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{emotionOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Before Mindset</Label>
                <Select value={beforeMindset} onValueChange={setBeforeMindset}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{mindsetOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">After Emotion</Label>
                <Select value={afterEmotion} onValueChange={setAfterEmotion}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{emotionOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">After Mindset</Label>
                <Select value={afterMindset} onValueChange={setAfterMindset}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{mindsetOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Physical Effort</Label>
                <Select value={physicalEffort} onValueChange={setPhysicalEffort}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{EFFORTS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Mental Effort</Label>
                <Select value={mentalEffort} onValueChange={setMentalEffort}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{EFFORTS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">What the coach helped me with / Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                placeholder="What stood out, what to drill next, your takeaways..." />
            </div>

            <div>
              <Label className="text-xs">Extra Tags (optional)</Label>
              <PredictiveTagInput selectedTags={extraTags} onTagsChange={setExtraTags} disciplines={[coachNote.discipline]} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleDismiss} disabled={saving} className="h-12">
            <X className="h-4 w-4 mr-1" /> Dismiss
          </Button>
          <Button onClick={handleSave} disabled={saving} className="h-12 font-bold">
            <BookmarkPlus className="h-4 w-4 mr-1" />
            {saving ? 'Saving…' : 'Save to Journal'}
          </Button>
        </div>
      </main>
    </div>
  );
}
