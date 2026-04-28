import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookmarkPlus, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

/**
 * Inbox of pending coach notes the student has been allowed to save.
 * Coach notes are private until the coach explicitly offers them — this
 * component reads from coach_note_offers (status = 'pending') only.
 */
export function CoachNoteOffersInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[]>([]);
  const [coachNotes, setCoachNotes] = useState<Record<string, any>>({});
  const [coachNames, setCoachNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const load = async () => {
    const { data: o } = await supabase
      .from('coach_note_offers')
      .select('*')
      .eq('student_id', user!.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setOffers(o || []);

    const sessionIds = (o || []).map(x => x.coach_session_id);
    if (sessionIds.length === 0) return;
    const { data: notes } = await supabase
      .from('coach_sessions')
      .select('*')
      .in('id', sessionIds);
    const map: Record<string, any> = {};
    (notes || []).forEach(n => { map[n.id] = n; });
    setCoachNotes(map);

    const coachIds = [...new Set((notes || []).map(n => n.user_id))];
    if (coachIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, name, middle_name, surname')
        .in('id', coachIds);
      const nm: Record<string, string> = {};
      (profs || []).forEach(p => {
        nm[p.id] = [p.name, p.middle_name, p.surname].filter(Boolean).join(' ');
      });
      setCoachNames(nm);
    }
  };

  const handleDismiss = async (offerId: string) => {
    const { error } = await supabase
      .from('coach_note_offers')
      .update({ status: 'dismissed' })
      .eq('id', offerId);
    if (error) { toast.error(error.message); return; }
    setOffers(prev => prev.filter(o => o.id !== offerId));
  };

  if (offers.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
          Coach Notes for You
        </h2>
        <span className="text-[10px] text-muted-foreground">{offers.length} pending</span>
      </div>
      <div className="space-y-2">
        {offers.map(offer => {
          const note = coachNotes[offer.coach_session_id];
          if (!note) return null;
          const coachName = coachNames[note.user_id] || 'Coach';
          return (
            <Card key={offer.id} className="bg-card border-border border-l-4 border-l-primary/60">
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{note.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">From {coachName}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{note.discipline}</Badge>
                      {note.note_type === 'technical_note' && (
                        <Badge variant="secondary" className="text-[10px]">Technical</Badge>
                      )}
                      {note.tactic && <Badge variant="outline" className="text-[10px]">{note.tactic}</Badge>}
                    </div>
                  </div>
                  <GraduationCap className="h-4 w-4 text-primary/40 shrink-0 mt-1" />
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs"
                    onClick={() => handleDismiss(offer.id)}>
                    <X className="h-3 w-3 mr-1" /> Dismiss
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs"
                    onClick={() => navigate(`/coach-note/save/${offer.id}`)}>
                    <BookmarkPlus className="h-3 w-3 mr-1" /> Review & Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
