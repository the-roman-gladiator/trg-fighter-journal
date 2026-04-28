import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CoachNoteComments } from './CoachNoteComments';
import { ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import { format } from 'date-fns';

/**
 * "Shared with me" — coach notes shared by other coaches with the current
 * user, plus notes visible because they're set to all_coaches.
 */
export function SharedWithMe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [permissionByNote, setPermissionByNote] = useState<Record<string, 'view' | 'comment' | 'owner'>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const load = async () => {
    // Pull shares where I'm the recipient
    const { data: myShares } = await supabase
      .from('coach_note_shares')
      .select('*')
      .eq('shared_with', user!.id);
    const sharedIds = (myShares || []).map(s => s.coach_session_id);
    const permByShare: Record<string, 'view' | 'comment'> = {};
    (myShares || []).forEach(s => { permByShare[s.coach_session_id] = s.permission; });

    // Pull notes set to all_coaches (RLS will permit since we have coach_level)
    const { data: allCoachNotes } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('visibility_scope', 'all_coaches')
      .neq('user_id', user!.id);

    // Pull explicitly-shared notes (only if any)
    let sharedNotes: any[] = [];
    if (sharedIds.length > 0) {
      const { data } = await supabase
        .from('coach_sessions')
        .select('*')
        .in('id', sharedIds);
      sharedNotes = data || [];
    }

    // Merge unique
    const merged: Record<string, any> = {};
    [...sharedNotes, ...(allCoachNotes || [])].forEach(n => { merged[n.id] = n; });
    const list = Object.values(merged);
    setItems(list);

    const perms: Record<string, 'view' | 'comment' | 'owner'> = {};
    list.forEach((n: any) => {
      perms[n.id] = permByShare[n.id] || 'view';
    });
    setPermissionByNote(perms);

    const authorIds = [...new Set(list.map((n: any) => n.user_id))];
    if (authorIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles').select('id, name, middle_name, surname').in('id', authorIds);
      const m: Record<string, string> = {};
      (profs || []).forEach(p => {
        m[p.id] = [p.name, p.middle_name, p.surname].filter(Boolean).join(' ');
      });
      setAuthorNames(m);
    }
  };

  if (items.length === 0) {
    return (
      <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
        No coach notes have been shared with you.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(n => {
        const open = openId === n.id;
        const perm = permissionByNote[n.id] || 'view';
        const chain = [n.first_movement, n.opponent_action, n.second_movement].filter(Boolean).join(' → ');
        return (
          <Card key={n.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                    <Share2 className="h-3.5 w-3.5 text-primary/60" />
                    {n.title}
                    <Badge variant="outline" className="text-[10px]">{n.discipline}</Badge>
                    {n.note_type === 'technical_note' && <Badge variant="secondary" className="text-[10px]">Technical</Badge>}
                    <Badge variant="outline" className="text-[10px]">{perm === 'comment' ? 'View + comment' : 'View only'}</Badge>
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    From {authorNames[n.user_id] || 'Coach'}
                    {n.scheduled_date && ` · ${format(new Date(n.scheduled_date), 'MMM d')}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setOpenId(open ? null : n.id)}>
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {open && (
              <CardContent className="space-y-2 text-sm">
                {n.tactic && <p><span className="text-muted-foreground">Tactic:</span> {n.tactic}</p>}
                {n.technique && <p><span className="text-muted-foreground">Technique:</span> {n.technique}</p>}
                {chain && <p className="font-mono text-xs text-primary/80">{chain}</p>}
                {n.session_plan && <p className="text-xs text-muted-foreground whitespace-pre-wrap"><b>Plan:</b> {n.session_plan}</p>}
                {n.drills && <p className="text-xs text-muted-foreground"><b>Drills:</b> {n.drills}</p>}
                {n.notes && <p className="text-xs text-muted-foreground"><b>Notes:</b> {n.notes}</p>}
                {(n.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {n.tags.map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                )}
                <div className="pt-3 border-t border-border/40">
                  <p className="text-[11px] text-muted-foreground mb-2">Comments</p>
                  <CoachNoteComments coachSessionId={n.id} canComment={perm === 'comment'} />
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
