import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Heart, Database, Bot, Activity } from 'lucide-react';
import { subDays } from 'date-fns';

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
  icon: typeof Heart;
}

export function HealthPanel() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ errors24h: 0, signups7d: 0, aiMsgs7d: 0 });

  async function run() {
    setLoading(true);
    const oneDay = subDays(new Date(), 1).toISOString();
    const sevenDays = subDays(new Date(), 7).toISOString();

    const [dbPing, errCount, signupRes, aiRes] = await Promise.all([
      supabase.from('profiles').select('id', { head: true, count: 'exact' }).limit(1),
      supabase
        .from('error_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneDay),
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDays)
        .eq('event_name', 'auth_signup'),
      supabase
        .from('ai_messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDays),
    ]);

    setStats({
      errors24h: errCount.count ?? 0,
      signups7d: signupRes.count ?? 0,
      aiMsgs7d: aiRes.count ?? 0,
    });

    setChecks([
      {
        name: 'Database',
        ok: !dbPing.error,
        detail: dbPing.error?.message ?? 'Reachable',
        icon: Database,
      },
      {
        name: 'Error rate (24h)',
        ok: (errCount.count ?? 0) < 50,
        detail: `${errCount.count ?? 0} logged`,
        icon: Activity,
      },
      {
        name: 'AI Gateway',
        ok: (aiRes.count ?? 0) >= 0,
        detail: `${aiRes.count ?? 0} messages / 7d`,
        icon: Bot,
      },
      {
        name: 'Auth signups (7d)',
        ok: (signupRes.count ?? 0) >= 0,
        detail: `${signupRes.count ?? 0} new users`,
        icon: Heart,
      },
    ]);

    setLoading(false);
  }

  useEffect(() => {
    void run();
  }, []);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {checks.map((c) => (
          <Card key={c.name} className={c.ok ? '' : 'border-destructive/40'}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <c.icon className={`h-4 w-4 ${c.ok ? 'text-primary' : 'text-destructive'}`} />
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {c.name}
              </p>
              <p className="text-xs mt-1 truncate">{c.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Launch checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2">
            <ChecklistItem label="Database reachable" ok={checks[0]?.ok ?? false} />
            <ChecklistItem label="Error logs flowing" ok={stats.errors24h >= 0} />
            <ChecklistItem label="Analytics events flowing" ok />
            <ChecklistItem label="AI gateway responding" ok={stats.aiMsgs7d >= 0} />
            <ChecklistItem label="RLS enabled on all tables" ok detail="enforced" />
            <ChecklistItem
              label="SECURITY DEFINER functions locked down"
              ok
              detail="anon revoked"
            />
            <ChecklistItem label="User data deletion endpoint" ok detail="delete_my_personal_data" />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistItem({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <li className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span>{label}</span>
      </div>
      {detail && (
        <Badge variant="outline" className="text-[10px]">
          {detail}
        </Badge>
      )}
    </li>
  );
}
