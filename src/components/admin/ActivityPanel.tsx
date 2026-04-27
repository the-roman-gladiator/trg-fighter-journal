import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import { format } from 'date-fns';

interface Action {
  id: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: any;
  created_at: string;
  actor_email?: string;
}

export function ActivityPanel() {
  const [rows, setRows] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('admin_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const actorIds = Array.from(new Set((data ?? []).map((r: any) => r.actor_id)));
      let actorMap: Record<string, string> = {};
      if (actorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id,email')
          .in('id', actorIds);
        actorMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.email]));
      }

      setRows(
        ((data ?? []) as any[]).map((r) => ({ ...r, actor_email: actorMap[r.actor_id] })),
      );
      setLoading(false);
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No admin actions logged yet.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((r) => (
              <li key={r.id} className="py-2 text-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <span className="font-medium">{r.action.replace(/_/g, ' ')}</span>
                    {r.target_id && (
                      <span className="text-muted-foreground text-xs ml-2 font-mono">
                        {r.target_type}/{r.target_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {r.actor_email ?? r.actor_id.slice(0, 8)}
                  </Badge>
                </div>
                {r.details && Object.keys(r.details).length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    {JSON.stringify(r.details)}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(r.created_at), 'MMM d, HH:mm:ss')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
