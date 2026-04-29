import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Lock, Users, Globe, Sparkles, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { strategies, disciplines as DISCIPLINES } from '@/config/dropdownOptions';
import { useUserLists } from '@/hooks/useUserLists';
import { StudentOfferPicker } from '@/components/coach/StudentOfferPicker';
import { SharedCoachesPicker, CoachShare } from '@/components/coach/SharedCoachesPicker';
import { StudentSaveStatus } from '@/components/coach/StudentSaveStatus';
import { CoachNoteComments } from '@/components/coach/CoachNoteComments';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSubscription } from '@/hooks/useSubscription';

const TARGET_GROUPS = [
  { value: 'all_students', label: 'All Students' },
  { value: 'beginners', label: 'Beginners' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'fighters', label: 'Fighters' },
];

type NoteType = 'class_plan' | 'technical_note';
type Visibility = 'private' | 'selected_coaches' | 'all_coaches';

export default function CoachSessionEdit() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const { getActive } = useUserLists();

  const [noteType, setNoteType] = useState<NoteType>('class_plan');
  const [customTechnique, setCustomTechnique] = useState('');
  const [form, setForm] = useState({
    title: '',
    discipline: 'MMA',
    // class plan
    session_plan: '',
    drills: '',
    target_group: 'all_students',
    duration_minutes: 60,
    notes: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    // technical note
    technique: '',
    tactic: '',
    first_movement: '',
    opponent_action: '',
    second_movement: '',
    target_level: 'All Levels',
    video_url: '',
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [visibility, setVisibility] = useState<Visibility>('private');
  const [shares, setShares] = useState<CoachShare[]>([]);
  const [studentOffers, setStudentOffers] = useState<string[]>([]);
  const [existingOfferStudentIds, setExistingOfferStudentIds] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);

  // AI draft
  const { isPro } = useSubscription();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) { toast.error('Tell the AI what the session is about'); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach-note-draft', {
        body: {
          noteType,
          discipline: form.discipline,
          prompt: aiPrompt.trim(),
          current: { ...form, tags },
        },
      });
      if (error) {
        const msg = (error as any)?.context?.error || (error as any)?.message || 'AI draft failed';
        toast.error(String(msg));
        setAiLoading(false);
        return;
      }
      const draft = (data as any)?.draft;
      if (!draft) { toast.error('No draft returned'); setAiLoading(false); return; }

      setForm(prev => ({
        ...prev,
        title: draft.title || prev.title,
        discipline: draft.discipline || prev.discipline,
        // class plan
        session_plan: draft.session_plan ?? prev.session_plan,
        drills: draft.drills ?? prev.drills,
        duration_minutes: draft.duration_minutes ?? prev.duration_minutes,
        target_group: draft.target_group ?? prev.target_group,
        // technical note
        technique: draft.technique ?? prev.technique,
        tactic: draft.tactic ?? prev.tactic,
        first_movement: draft.first_movement ?? prev.first_movement,
        opponent_action: draft.opponent_action ?? prev.opponent_action,
        second_movement: draft.second_movement ?? prev.second_movement,
        target_level: draft.target_level ?? prev.target_level,
        // shared
        notes: draft.notes ?? prev.notes,
      }));
      if (Array.isArray(draft.tags) && draft.tags.length > 0) {
        const merged = Array.from(new Set([...tags, ...draft.tags.map(String)]));
        setTags(merged);
      }
      toast.success('AI draft applied — review and edit before saving');
      setAiOpen(false);
      setAiPrompt('');
    } catch (e: any) {
      toast.error(e?.message || 'AI draft failed');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!profile?.coach_level) { navigate('/'); return; }
    if (!isNew) loadAll();
  }, [user, id]);

  const loadAll = async () => {
    const { data } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!data) return;
    setNoteType((data.note_type || 'class_plan') as NoteType);
    setForm({
      title: data.title || '',
      discipline: data.discipline || 'MMA',
      session_plan: data.session_plan || '',
      drills: data.drills || '',
      target_group: data.target_group || 'all_students',
      duration_minutes: data.duration_minutes || 60,
      notes: data.notes || '',
      scheduled_date: data.scheduled_date || new Date().toISOString().split('T')[0],
      technique: data.technique || '',
      tactic: data.tactic || '',
      first_movement: data.first_movement || '',
      opponent_action: data.opponent_action || '',
      second_movement: data.second_movement || '',
      target_level: data.target_level || 'All Levels',
      video_url: (data as any).video_url || '',
    });
    setTags(data.tags || []);
    setVisibility((data.visibility_scope || 'private') as Visibility);

    const { data: shareRows } = await supabase
      .from('coach_note_shares').select('*').eq('coach_session_id', id);
    setShares((shareRows || []).map((r: any) => ({
      shared_with: r.shared_with,
      permission: r.permission,
      see_student_status: r.see_student_status,
      see_class_plan: r.see_class_plan,
    })));

    const { data: offerRows } = await supabase
      .from('coach_note_offers').select('student_id').eq('coach_session_id', id);
    const ids = (offerRows || []).map((r: any) => r.student_id);
    setStudentOffers(ids);
    setExistingOfferStudentIds(new Set(ids));
  };

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Pre-populated technique options for the selected discipline (mirrors athlete SessionForm)
  const techniqueOptions = useMemo(
    () => getActive('technique', form.discipline).map(i => i.item_name),
    [getActive, form.discipline]
  );
  const isCustomTechnique =
    !!form.technique && !techniqueOptions.includes(form.technique);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.map(x => x.toLowerCase()).includes(t.toLowerCase())) setTags([...tags, t]);
    setTagInput('');
  };

  const handleSave = async (status: string = 'draft') => {
    if (!user || !form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (noteType === 'technical_note' && !form.technique.trim()) {
      toast.error('Technique is required for a Technical Note');
      return;
    }
    setSaving(true);

    const payload: any = {
      user_id: user.id,
      title: form.title,
      discipline: form.discipline,
      note_type: noteType,
      tags,
      visibility_scope: visibility,
      status,
      // class plan fields (always store; harmless when blank for technical notes)
      session_plan: form.session_plan || null,
      drills: form.drills || null,
      target_group: noteType === 'class_plan' ? form.target_group : null,
      duration_minutes: noteType === 'class_plan' ? Number(form.duration_minutes) || 60 : null,
      scheduled_date: noteType === 'class_plan' ? form.scheduled_date : null,
      notes: form.notes || null,
      // technical note fields
      technique: form.technique || null,
      tactic: form.tactic || null,
      first_movement: form.first_movement || null,
      opponent_action: form.opponent_action || null,
      second_movement: form.second_movement || null,
      target_level: form.target_level || null,
      video_url: form.video_url.trim() || null,
    };

    let savedId = id as string | undefined;
    if (isNew) {
      const { data, error } = await supabase.from('coach_sessions').insert(payload).select().single();
      if (error || !data) { toast.error(error?.message || 'Save failed'); setSaving(false); return; }
      savedId = data.id;
    } else {
      const { error } = await supabase.from('coach_sessions').update(payload).eq('id', id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    // Sync coach-to-coach shares (only meaningful when visibility = selected_coaches)
    if (savedId) {
      // Strategy: replace shares fully on save.
      await supabase.from('coach_note_shares').delete().eq('coach_session_id', savedId);
      if (visibility === 'selected_coaches' && shares.length > 0) {
        const rows = shares.map(s => ({
          coach_session_id: savedId,
          shared_by: user.id,
          shared_with: s.shared_with,
          permission: s.permission,
          see_student_status: s.see_student_status,
          see_class_plan: s.see_class_plan,
        }));
        const { error: shErr } = await supabase.from('coach_note_shares').insert(rows);
        if (shErr) toast.error(shErr.message);
      }

      // Sync student offers: insert new ones; do NOT delete existing offers
      // (a student may have already saved/dismissed — preserve their state).
      const newOffers = studentOffers.filter(sid => !existingOfferStudentIds.has(sid));
      if (newOffers.length > 0) {
        const rows = newOffers.map(sid => ({
          coach_session_id: savedId,
          coach_id: user.id,
          student_id: sid,
          status: 'pending',
        }));
        const { error: offErr } = await supabase.from('coach_note_offers').insert(rows);
        if (offErr) toast.error(offErr.message);
      }
    }

    setSaving(false);
    toast.success(status === 'scheduled' ? 'Saved & scheduled' : 'Draft saved');
    navigate('/coach');
  };

  const visibilityIcon = useMemo(() => {
    if (visibility === 'private') return <Lock className="h-3.5 w-3.5" />;
    if (visibility === 'selected_coaches') return <Users className="h-3.5 w-3.5" />;
    return <Globe className="h-3.5 w-3.5" />;
  }, [visibility]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-xl font-bold mt-2">
            {isNew ? 'New Coach Note' : 'Edit Coach Note'}
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            {visibilityIcon}
            {visibility === 'private' && 'Private — only you can see this'}
            {visibility === 'selected_coaches' && `Shared with ${shares.length} coach${shares.length !== 1 ? 'es' : ''}`}
            {visibility === 'all_coaches' && 'Visible to all coaches in the org'}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-5">
        {/* AI Draft button (Pro only) */}
        {isPro && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setAiOpen(true)}
            className="w-full h-11 border-primary/40 text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Draft this note with AI
          </Button>
        )}

        {/* Note Type Switcher */}
        <Tabs value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="class_plan">Class Plan</TabsTrigger>
            <TabsTrigger value="technical_note">Technical Note</TabsTrigger>
          </TabsList>

          {/* Common: Title + Discipline */}
          <Card className="mt-4">
            <CardContent className="space-y-4 pt-5">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={e => update('title', e.target.value)}
                  placeholder={noteType === 'class_plan' ? 'e.g. Tuesday Muay Thai Fundamentals' : 'e.g. Closing distance with the jab'} />
              </div>
              <div>
                <Label>Discipline</Label>
                <Select value={form.discipline} onValueChange={v => update('discipline', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...DISCIPLINES, 'General'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Class Plan section */}
          <TabsContent value="class_plan" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Class Plan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Scheduled Date</Label>
                    <Input type="date" value={form.scheduled_date} onChange={e => update('scheduled_date', e.target.value)} />
                  </div>
                  <div>
                    <Label>Duration (min)</Label>
                    <Input type="number" value={form.duration_minutes} onChange={e => update('duration_minutes', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Session Plan</Label>
                  <Textarea value={form.session_plan} onChange={e => update('session_plan', e.target.value)} rows={4}
                    placeholder="Warm-up → Pad work → Clinch → Sparring → Cool down" />
                </div>
                <div>
                  <Label>Drills & Exercises</Label>
                  <Textarea value={form.drills} onChange={e => update('drills', e.target.value)} rows={3}
                    placeholder="3x3min pad rounds, 2x3min clinch knees, 5x2min sparring" />
                </div>
                <div>
                  <Label>Target Group</Label>
                  <Select value={form.target_group} onValueChange={v => update('target_group', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TARGET_GROUPS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Coach Notes <span className="text-[10px] text-muted-foreground">(private)</span></Label>
                  <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3}
                    placeholder="Private observations about student progress, focus areas, etc." />
                </div>
                <div>
                  <Label>YouTube / Video URL (optional)</Label>
                  <Input type="url" inputMode="url" maxLength={500}
                    value={form.video_url} onChange={e => update('video_url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..." />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Technical Note section */}
          <TabsContent value="technical_note" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Coach Technical Note</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Technique *</Label>
                  <Select
                    value={isCustomTechnique || form.technique === '__custom__' ? '__custom__' : form.technique}
                    onValueChange={(v) => {
                      if (v === '__custom__') {
                        update('technique', customTechnique || '');
                      } else {
                        setCustomTechnique('');
                        update('technique', v);
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select technique" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__custom__">+ Custom (type your own)</SelectItem>
                      {techniqueOptions.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {(isCustomTechnique || (form.technique === '' && customTechnique !== '')) && (
                    <Input
                      className="mt-2"
                      value={isCustomTechnique ? form.technique : customTechnique}
                      onChange={(e) => {
                        setCustomTechnique(e.target.value);
                        update('technique', e.target.value);
                      }}
                      placeholder="Type your custom technique"
                    />
                  )}
                  {techniqueOptions.length === 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      No saved techniques for {form.discipline} yet — add them in Profile → Custom Lists, or use Custom.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Tactic</Label>
                  <Select value={form.tactic} onValueChange={v => update('tactic', v)}>
                    <SelectTrigger><SelectValue placeholder="Select tactic" /></SelectTrigger>
                    <SelectContent>
                      {strategies
                        .filter(s => !(form.discipline === 'K1' && s === 'Control'))
                        .map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Movement Chain</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <Input value={form.first_movement} onChange={e => update('first_movement', e.target.value)} placeholder="My first movement (e.g. Jab)" />
                    <Input value={form.opponent_action} onChange={e => update('opponent_action', e.target.value)} placeholder="Opponent reaction (e.g. Slip right)" />
                    <Input value={form.second_movement} onChange={e => update('second_movement', e.target.value)} placeholder="My follow-up (e.g. Right hook)" />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3}
                    placeholder="Cues, common mistakes, when to use..." />
                </div>
                <div>
                  <Label>YouTube / Video URL (optional)</Label>
                  <Input type="url" inputMode="url" maxLength={500}
                    value={form.video_url} onChange={e => update('video_url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div>
                  <Label>Target Level</Label>
                  <Select value={form.target_level} onValueChange={v => update('target_level', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Beginner', 'Intermediate', 'Advanced', 'All Levels'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tags (both modes) */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Tags</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add tag and press Enter" />
              <Button type="button" size="sm" onClick={addTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <button key={t} type="button"
                    onClick={() => setTags(tags.filter(x => x !== t))}
                    className="text-[11px] px-2 py-0.5 rounded border border-border hover:border-destructive">
                    {t} ✕
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visibility & Coach Sharing */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Visibility</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private to me only</SelectItem>
                <SelectItem value="selected_coaches">Share with selected coaches</SelectItem>
                <SelectItem value="all_coaches">Share with all coaches in the org</SelectItem>
              </SelectContent>
            </Select>
            {visibility === 'selected_coaches' && (
              <div>
                <Label className="text-xs">Choose coaches</Label>
                <SharedCoachesPicker selected={shares} onChange={setShares} />
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Coach notes are private by default. Students never see this note unless you explicitly allow them to save it below.
            </p>
          </CardContent>
        </Card>

        {/* Allow students to save */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Allow Students to Save</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentOfferPicker
              selected={studentOffers}
              onChange={setStudentOffers}
              discipline={form.discipline}
            />
            <p className="text-[10px] text-muted-foreground mt-2">
              Selected students will see a "Save coach note" prompt. Their saved copy is an immutable snapshot.
              Existing pending/saved/dismissed states are preserved.
            </p>
          </CardContent>
        </Card>

        {/* Existing-only sections (after save) */}
        {!isNew && id && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-sm">Student Save Status</CardTitle></CardHeader>
              <CardContent>
                <StudentSaveStatus coachSessionId={id} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Comments</CardTitle></CardHeader>
              <CardContent>
                <CoachNoteComments coachSessionId={id} canComment={true} />
              </CardContent>
            </Card>
          </>
        )}

        {/* Save buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="h-12 font-bold">
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => handleSave(noteType === 'class_plan' ? 'scheduled' : 'completed')} disabled={saving} className="h-12 font-bold">
            {saving ? 'Saving...' : noteType === 'class_plan' ? 'Schedule' : 'Save'}
          </Button>
        </div>
      </main>
    </div>
  );
}
