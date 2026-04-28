import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';

interface Props { coachSessionId: string }

/**
 * Coach-facing view of student offer status for a coach note:
 * pending / saved / dismissed / deleted_after_save.
 */
export function StudentSaveStatus({ coachSessionId }: Props) {
  const [offers, setOffers] = useState<any[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!coachSessionId) return;
    load();
    // Poll once on mount; could later switch to realtime.
  }, [coachSessionId]);

  const load = async () => {
    const { data } = await supabase
      .from('coach_note_offers')
      .select('*')
      .eq('coach_session_id', coachSessionId);
    setOffers(data || []);

    const ids = [...new Set((data || []).map(o => o.student_id))];
    if (ids.length === 0) return;
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, name, middle_name, surname, nickname')
      .in('id', ids);
    const m: Record<string, string> = {};
    (profs || []).forEach(p => {
      m[p.id] = [p.name, p.middle_name, p.surname].filter(Boolean).join(' ') || p.nickname || 'Student';
    });
    setStudentNames(m);
  };

  // Detect deleted training sessions => mark as deleted_after_save in UI
  useEffect(() => {
    if (offers.length === 0) return;
    const saved = offers.filter(o => o.status === 'saved' && o.saved_session_id);
    if (saved.length === 0) return;
    (async () => {
      const ids = saved.map(o => o.saved_session_id);
      const { data: existing } = await supabase
        .from('training_sessions')
        .select('id')
        .in('id', ids);
      const existingSet = new Set((existing || []).map(s => s.id));
      const deletedOffers = saved.filter(o => !existingSet.has(o.saved_session_id));
      // Mark deleted_after_save (best-effort)
      for (const o of deletedOffers) {
        await supabase
          .from('coach_note_offers')
          .update({ status: 'deleted_after_save' })
          .eq('id', o.id);
      }
      if (deletedOffers.length > 0) load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers.length]);

  if (offers.length === 0) {
    return <p className="text-xs text-muted-foreground">No students offered this note yet.</p>;
  }

  const icon = (s: string) => {
    if (s === 'saved') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    if (s === 'dismissed') return <XCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    if (s === 'deleted_after_save') return <Trash2 className="h-3.5 w-3.5 text-amber-400" />;
    return <Clock className="h-3.5 w-3.5 text-amber-400" />;
  };

  const label = (s: string) => ({
    pending: 'Not saved yet',
    saved: 'Saved',
    dismissed: 'Dismissed',
    deleted_after_save: 'Saved then deleted',
  }[s] || s);

  return (
    <div className="space-y-1.5">
      {offers.map(o => (
        <Card key={o.id} className="bg-muted/20 border-border/40">
          <CardContent className="py-2 px-3 flex items-center justify-between">
            <div className="text-sm truncate">{studentNames[o.student_id] || 'Student'}</div>
            <div className="flex items-center gap-1.5">
              {icon(o.status)}
              <Badge variant="outline" className="text-[10px]">{label(o.status)}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
