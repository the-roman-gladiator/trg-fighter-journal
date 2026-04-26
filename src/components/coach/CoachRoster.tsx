import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Crown } from 'lucide-react';
import { format } from 'date-fns';

type CoachLevel = 'head_coach' | 'main_coach' | 'level_2' | 'level_1';

const LEVEL_LABEL: Record<CoachLevel, string> = {
  head_coach: 'Head Coach',
  main_coach: 'Main Coach',
  level_2: 'L2 Coach',
  level_1: 'L1 Coach',
};

const LEVEL_BADGE: Record<CoachLevel, string> = {
  head_coach: 'bg-primary/20 text-primary border-primary/40',
  main_coach: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  level_2: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  level_1: 'bg-muted text-muted-foreground border-border',
};

interface CoachRow {
  id: string;
  name: string | null;
  surname: string | null;
  email: string;
  coach_level: CoachLevel;
  assigned_disciplines: string[];
  invited_by: string | null;
  created_at: string;
  inviter_name?: string;
}

export function CoachRoster() {
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from('profiles')
        .select('id, name, surname, email, coach_level, assigned_disciplines, invited_by, created_at')
        .not('coach_level', 'is', null)
        .order('coach_level', { ascending: true })
        .order('created_at', { ascending: true });

      const list = (rows || []) as CoachRow[];

      // Resolve inviter names
      const inviterIds = Array.from(
        new Set(list.map(c => c.invited_by).filter(Boolean) as string[])
      );
      let nameMap = new Map<string, string>();
      if (inviterIds.length > 0) {
        const { data: inviters } = await supabase
          .from('profiles')
          .select('id, name, surname')
          .in('id', inviterIds);
        nameMap = new Map(
          (inviters || []).map((p: any) => [
            p.id,
            [p.name, p.surname].filter(Boolean).join(' ') || 'Unknown',
          ])
        );
      }

      setCoaches(
        list.map(c => ({
          ...c,
          inviter_name: c.invited_by ? nameMap.get(c.invited_by) : undefined,
        }))
      );
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Coach Roster
          <span className="text-xs text-muted-foreground font-normal">
            ({coaches.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
        ) : coaches.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No coaches in the system yet.
          </p>
        ) : (
          coaches.map(c => {
            const fullName = [c.name, c.surname].filter(Boolean).join(' ') || c.email;
            return (
              <div
                key={c.id}
                className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {c.coach_level === 'head_coach' && (
                        <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <p className="text-sm font-medium truncate">{fullName}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${LEVEL_BADGE[c.coach_level]}`}>
                    {LEVEL_LABEL[c.coach_level]}
                  </Badge>
                </div>

                {c.assigned_disciplines && c.assigned_disciplines.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {c.assigned_disciplines.map(d => (
                      <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {d}
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  {c.inviter_name
                    ? `Nominated by ${c.inviter_name}`
                    : c.coach_level === 'head_coach'
                    ? 'Founding head coach'
                    : 'Direct assignment'}
                  {' · '}
                  Joined {format(new Date(c.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
