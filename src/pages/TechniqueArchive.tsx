import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, BookMarked, Trash2 } from 'lucide-react';
import { MultiDisciplineSelect } from '@/components/MultiDisciplineSelect';
import { PredictiveTagInput } from '@/components/PredictiveTagInput';

interface ArchiveEntry {
  id: string;
  title: string;
  disciplines: string[];
  strategy: string | null;
  class_type: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
}

export default function TechniqueArchive() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // form state
  const [title, setTitle] = useState('');
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [strategy, setStrategy] = useState('');
  const [classType, setClassType] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    load();
  }, [user, navigate]);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('technique_archive')
      .select('*')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setEntries((data || []) as any);
    }
  };

  const reset = () => {
    setTitle(''); setDisciplines([]); setStrategy(''); setClassType(''); setTags([]); setNotes('');
    setShowForm(false);
  };

  const save = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('technique_archive').insert({
      owner_user_id: user.id,
      title: title.trim(),
      disciplines,
      strategy: strategy || null,
      class_type: classType || null,
      tags,
      notes: notes || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Technique archived' });
      reset();
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('technique_archive').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Removed' });
      load();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 max-w-lg">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <BookMarked className="h-6 w-6" /> My Technique Archive
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Personal storage for techniques. Visible to you and Head Coach.</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-4">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Technique
          </Button>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">New Archive Entry</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Jab → Cross → Low Kick" />
              </div>
              <MultiDisciplineSelect
                options={['MMA', 'Muay Thai', 'K1', 'BJJ', 'Grappling', 'Wrestling']}
                value={disciplines}
                onChange={setDisciplines}
                label="Disciplines"
              />
              <div>
                <Label>Strategy</Label>
                <Input value={strategy} onChange={e => setStrategy(e.target.value)} placeholder="e.g. Attacking, Countering" />
              </div>
              <div>
                <Label>Class Type</Label>
                <Input value={classType} onChange={e => setClassType(e.target.value)} placeholder="e.g. Sparring, Technical Skills" />
              </div>
              <div>
                <Label>Tags</Label>
                <PredictiveTagInput selectedTags={tags} onTagsChange={setTags} disciplines={disciplines} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Details, cues, references..." />
              </div>
              <div className="flex gap-2">
                <Button onClick={save} disabled={loading} className="flex-1">
                  {loading ? 'Adding…' : 'Add to Archive'}
                </Button>
                <Button variant="outline" onClick={reset} type="button">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {entries.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              No techniques archived yet. Add your first one above.
            </CardContent>
          </Card>
        ) : (
          entries.map(e => (
            <Card key={e.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{e.title}</h3>
                  <Button size="icon" variant="ghost" onClick={() => remove(e.id)} className="h-7 w-7">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
                {e.disciplines.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {e.disciplines.map(d => <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>)}
                  </div>
                )}
                {(e.strategy || e.class_type) && (
                  <p className="text-xs text-muted-foreground">
                    {e.strategy && <span>Strategy: {e.strategy}</span>}
                    {e.strategy && e.class_type && ' · '}
                    {e.class_type && <span>Class: {e.class_type}</span>}
                  </p>
                )}
                {e.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {e.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>)}
                  </div>
                )}
                {e.notes && <p className="text-xs text-foreground/80 whitespace-pre-wrap">{e.notes}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
