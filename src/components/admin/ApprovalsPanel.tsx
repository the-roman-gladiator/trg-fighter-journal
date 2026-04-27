import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface FighterRow {
  id: string;
  user_id: string;
  fighter_status: string;
  requested_fight_disciplines: string[];
  created_at: string;
  email?: string;
  name?: string;
}

export function ApprovalsPanel() {
  const [pending, setPending] = useState<FighterRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('fighter_profiles')
      .select('id,user_id,fighter_status,requested_fight_disciplines,created_at')
      .eq('fighter_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(200);

    const ids = (data ?? []).map((r) => r.user_id);
    let profMap: Record<string, { email: string; name: string }> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id,email,name')
        .in('id', ids);
      profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, { email: p.email, name: p.name }]));
    }

    setPending(
      ((data ?? []) as any[]).map((r) => ({
        ...r,
        email: profMap[r.user_id]?.email,
        name: profMap[r.user_id]?.name,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(id: string, approve: boolean) {
    const { data, error } = await supabase.rpc('admin_decide_fighter_profile', {
      _profile_id: id,
      _approve: approve,
    });
    if (error || !(data as any)?.success) {
      toast.error('Failed');
      return;
    }
    toast.success(approve ? 'Fighter approved' : 'Fighter denied');
    void load();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" /> Fighter Approvals ({pending.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No pending fighter requests.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {pending.map((r) => (
              <li key={r.id} className="py-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{r.name || 'Unnamed'}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {r.requested_fight_disciplines.map((d) => (
                      <Badge key={d} variant="outline" className="text-[10px]">
                        {d}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Requested {format(new Date(r.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide(r.id, true)}>
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(r.id, false)}>
                    <X className="h-4 w-4 mr-1" /> Deny
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
