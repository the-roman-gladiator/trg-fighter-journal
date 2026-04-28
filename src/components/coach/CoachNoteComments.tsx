import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  coachSessionId: string;
  /** True if current user can post comments (owner, admin/head coach, or share with permission='comment') */
  canComment: boolean;
}

export function CoachNoteComments({ coachSessionId, canComment }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!coachSessionId) return;
    load();
  }, [coachSessionId]);

  const load = async () => {
    const { data } = await supabase
      .from('coach_note_comments')
      .select('*')
      .eq('coach_session_id', coachSessionId)
      .order('created_at', { ascending: true });
    setComments(data || []);

    const ids = [...new Set((data || []).map(c => c.author_id))];
    if (ids.length === 0) return;
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, name, middle_name, surname')
      .in('id', ids);
    const m: Record<string, string> = {};
    (profs || []).forEach(p => {
      m[p.id] = [p.name, p.middle_name, p.surname].filter(Boolean).join(' ');
    });
    setAuthors(m);
  };

  const handlePost = async () => {
    if (!user || !body.trim()) return;
    setPosting(true);
    const { error } = await supabase.from('coach_note_comments').insert({
      coach_session_id: coachSessionId,
      author_id: user.id,
      body: body.trim(),
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setBody('');
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('coach_note_comments').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setComments(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground">No comments yet.</p>
        )}
        {comments.map(c => (
          <Card key={c.id} className="bg-muted/20 border-border/40">
            <CardContent className="py-2.5 px-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">
                    {authors[c.author_id] || 'Coach'} · {format(new Date(c.created_at), 'MMM d, HH:mm')}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                </div>
                {c.author_id === user?.id && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                    onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {canComment && (
        <div className="space-y-2">
          <Textarea value={body} onChange={e => setBody(e.target.value)} rows={2}
            placeholder="Add a comment…" />
          <Button size="sm" onClick={handlePost} disabled={posting || !body.trim()}>
            {posting ? 'Posting…' : 'Post Comment'}
          </Button>
        </div>
      )}
    </div>
  );
}
