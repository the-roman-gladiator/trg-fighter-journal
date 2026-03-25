import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const DISCIPLINES = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ', 'Boxing', 'General'];
const TARGET_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

export default function CoachSessionEdit() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    title: '',
    discipline: 'MMA',
    session_plan: '',
    drills: '',
    target_level: 'All Levels',
    target_students: '',
    duration_minutes: 60,
    notes: '',
    scheduled_date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!profile?.coach_level) { navigate('/'); return; }
    if (!isNew) loadSession();
  }, [user, id]);

  const loadSession = async () => {
    const { data } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (data) {
      setForm({
        title: data.title || '',
        discipline: data.discipline || 'MMA',
        session_plan: data.session_plan || '',
        drills: data.drills || '',
        target_level: data.target_level || 'All Levels',
        target_students: data.target_students || '',
        duration_minutes: data.duration_minutes || 60,
        notes: data.notes || '',
        scheduled_date: data.scheduled_date || new Date().toISOString().split('T')[0],
      });
    }
  };

  const handleSave = async () => {
    if (!user || !form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);

    const payload = {
      ...form,
      user_id: user.id,
      duration_minutes: Number(form.duration_minutes) || 60,
    };

    if (isNew) {
      const { error } = await supabase.from('coach_sessions').insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Coach session created');
    } else {
      const { error } = await supabase.from('coach_sessions').update(payload).eq('id', id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Coach session updated');
    }

    setSaving(false);
    navigate('/coach');
  };

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-xl font-bold mt-2">
            {isNew ? 'New Coach Session' : 'Edit Coach Session'}
          </h1>
          <p className="text-xs text-muted-foreground">Plan a class or training session for your students</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title">Session Title *</Label>
          <Input id="title" value={form.title} onChange={e => update('title', e.target.value)}
            placeholder="e.g. Tuesday Muay Thai Fundamentals" />
        </div>

        {/* Discipline & Level */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Discipline</Label>
            <Select value={form.discipline} onValueChange={v => update('discipline', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISCIPLINES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Target Level</Label>
            <Select value={form.target_level} onValueChange={v => update('target_level', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TARGET_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Schedule & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="date">Scheduled Date</Label>
            <Input id="date" type="date" value={form.scheduled_date}
              onChange={e => update('scheduled_date', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duration">Duration (min)</Label>
            <Input id="duration" type="number" value={form.duration_minutes}
              onChange={e => update('duration_minutes', e.target.value)} />
          </div>
        </div>

        {/* Session Plan */}
        <div className="space-y-1.5">
          <Label htmlFor="plan">Session Plan</Label>
          <Textarea id="plan" value={form.session_plan} onChange={e => update('session_plan', e.target.value)}
            placeholder="e.g. Warm-up → Shadow boxing → Pad work (jab-cross-hook combos) → Clinch entries → Sparring rounds → Cool down"
            rows={4} />
          <p className="text-[10px] text-muted-foreground">Outline the structure and flow of the class.</p>
        </div>

        {/* Drills */}
        <div className="space-y-1.5">
          <Label htmlFor="drills">Drills & Exercises</Label>
          <Textarea id="drills" value={form.drills} onChange={e => update('drills', e.target.value)}
            placeholder="e.g. 3x3min pad rounds (jab-cross-hook), 2x3min clinch knees, 5x2min sparring"
            rows={3} />
          <p className="text-[10px] text-muted-foreground">List the specific drills, rounds, and exercises.</p>
        </div>

        {/* Target Students */}
        <div className="space-y-1.5">
          <Label htmlFor="students">Target Students</Label>
          <Input id="students" value={form.target_students} onChange={e => update('target_students', e.target.value)}
            placeholder="e.g. All students, Fighters only, Beginners group" />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Coach Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={e => update('notes', e.target.value)}
            placeholder="Private notes about student progress, focus areas, etc."
            rows={3} />
        </div>

        {/* Save */}
        <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-base font-bold">
          {saving ? 'Saving...' : isNew ? 'Create Session' : 'Update Session'}
        </Button>
      </main>
    </div>
  );
}
