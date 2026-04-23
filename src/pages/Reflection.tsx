import { useEffect, useState } from 'react';
import { NotebookPen, Save, Trash2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAutosave } from '@/hooks/useAutosave';
import { AutosaveStatus } from '@/components/AutosaveStatus';

const QUICK_TAGS = [
  'Life achievement',
  'Downtrend',
  'Skills',
  'Pathway to goal',
  'Anything else',
];

interface Reflection {
  id: string;
  title: string | null;
  content: string;
  mood_tag: string | null;
  reflection_date: string;
  created_at: string;
}

const DRAFT_KEY = 'trg.reflection.draft.v1';

export default function Reflection() {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [moodTag, setMoodTag] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Restore draft from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.title) setTitle(d.title);
        if (d?.content) setContent(d.content);
        if (d?.moodTag) setMoodTag(d.moodTag);
      }
    } catch {
      // ignore corrupt drafts
    }
    setDraftLoaded(true);
  }, []);

  // Autosave the in-progress draft so nothing is lost between sessions.
  const { status: draftStatus } = useAutosave({
    value: { title, content, moodTag },
    enabled: draftLoaded,
    debounceMs: 500,
    onSave: async (snapshot) => {
      try {
        if (!snapshot.title && !snapshot.content && !snapshot.moodTag) {
          localStorage.removeItem(DRAFT_KEY);
        } else {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
        }
      } catch {
        throw new Error('storage');
      }
    },
  });

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('daily_reflections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setReflections(data || []);
    setLoading(false);
  };

  const save = async () => {
    if (!user || !content.trim()) {
      toast.error('Write something first');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('daily_reflections').insert({
      user_id: user.id,
      title: title.trim() || null,
      content: content.trim(),
      mood_tag: moodTag,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not save reflection');
      return;
    }
    toast.success('Reflection saved');
    setTitle('');
    setContent('');
    setMoodTag(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('daily_reflections').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete');
      return;
    }
    setReflections(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-lg flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-display font-bold text-primary">Reflection</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 max-w-lg space-y-5">
        {/* Your Daily Reflection — quick journal */}
        <Card className="border-primary/30 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.25)]">
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary">
                Your Daily Reflection
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Free space to jot anything — wins, struggles, skills, progress toward your goals.
            </p>

            <Input
              placeholder="Title (optional)"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <Textarea
              placeholder="Write freely... what happened today, what you learned, where you're headed."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="min-h-[180px] text-sm leading-relaxed"
            />

            <div>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-2">
                Quick focus (optional)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setMoodTag(moodTag === tag ? null : tag)}
                    className={cn(
                      'px-3 py-1 rounded-full text-[11px] font-medium border transition-all',
                      moodTag === tag
                        ? 'bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.6)]'
                        : 'bg-muted/40 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={save}
              disabled={saving || !content.trim()}
              className="w-full h-11 font-semibold"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Reflection'}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
              Past Reflections
            </h2>
            {reflections.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{reflections.length}</span>
            )}
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-6">Loading...</p>
          ) : reflections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center space-y-2">
                <NotebookPen className="h-8 w-8 text-primary/30 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  No reflections yet. Your first note will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {reflections.map(r => (
                <Card key={r.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        {r.title && (
                          <p className="text-sm font-bold text-foreground truncate">{r.title}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(r.created_at), 'EEE, d MMM yyyy · HH:mm')}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(r.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {r.content}
                    </p>
                    {r.mood_tag && (
                      <Badge variant="outline" className="mt-2 text-[9px] border-primary/30 text-primary">
                        {r.mood_tag}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
