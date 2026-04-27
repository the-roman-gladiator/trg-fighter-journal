import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Bot,
  MessageSquare,
  Users,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface DailyPoint {
  date: string;
  count: number;
}
interface TopEvent {
  event_name: string;
  count: number;
}

export default function AdminAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeUsers7d, setActiveUsers7d] = useState(0);
  const [aiMessages7d, setAiMessages7d] = useState(0);
  const [errors24h, setErrors24h] = useState(0);
  const [signups7d, setSignups7d] = useState(0);
  const [eventsPerDay, setEventsPerDay] = useState<DailyPoint[]>([]);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  async function loadData() {
    setLoading(true);
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();
    const oneDayAgo = subDays(new Date(), 1).toISOString();

    const [activeRes, aiRes, errRes, signupRes, eventsRes, topRes, recentErrRes] =
      await Promise.all([
        supabase
          .from('analytics_events')
          .select('user_id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo)
          .not('user_id', 'is', null),
        supabase
          .from('ai_messages')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
        supabase
          .from('error_logs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo),
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo)
          .eq('event_name', 'auth_signup'),
        supabase
          .from('analytics_events')
          .select('created_at')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: true })
          .limit(2000),
        supabase
          .from('analytics_events')
          .select('event_name')
          .gte('created_at', sevenDaysAgo)
          .limit(2000),
        supabase
          .from('error_logs')
          .select('id, message, route, level, source, created_at')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

    setActiveUsers7d(activeRes.count ?? 0);
    setAiMessages7d(aiRes.count ?? 0);
    setErrors24h(errRes.count ?? 0);
    setSignups7d(signupRes.count ?? 0);

    // Bucket events per day
    const bucket: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const k = format(subDays(new Date(), i), 'MMM d');
      bucket[k] = 0;
    }
    (eventsRes.data ?? []).forEach((e) => {
      const k = format(new Date(e.created_at), 'MMM d');
      if (k in bucket) bucket[k]++;
    });
    setEventsPerDay(Object.entries(bucket).map(([date, count]) => ({ date, count })));

    // Top events
    const counts: Record<string, number> = {};
    (topRes.data ?? []).forEach((e) => {
      counts[e.event_name] = (counts[e.event_name] ?? 0) + 1;
    });
    setTopEvents(
      Object.entries(counts)
        .map(([event_name, count]) => ({ event_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    );

    setRecentErrors(recentErrRes.data ?? []);
    setLoading(false);
  }

  if (authLoading || subLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-primary/30">
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Admin only</h2>
            <p className="text-sm text-muted-foreground">
              You need an admin role to view this dashboard.
            </p>
            <Button onClick={() => navigate('/')}>Back to app</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Last 7 days · admin view
          </p>
        </div>
        <Badge variant="outline" className="ml-auto border-primary/40 text-primary">
          ADMIN
        </Badge>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Active users (7d)" value={activeUsers7d} loading={loading} />
        <StatCard icon={Activity} label="New signups (7d)" value={signups7d} loading={loading} />
        <StatCard icon={MessageSquare} label="AI messages (7d)" value={aiMessages7d} loading={loading} />
        <StatCard icon={AlertTriangle} label="Errors (24h)" value={errors24h} loading={loading} accent={errors24h > 0} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Events per day</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eventsPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top events (7d)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : topEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No events yet — they'll appear as users interact with the app.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEvents} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="event_name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  width={150}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Recent errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No errors logged. 🎉
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {recentErrors.map((e) => (
                <li key={e.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{e.message}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {e.source}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {e.route ?? '—'} · {format(new Date(e.created_at), 'MMM d, HH:mm')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: typeof Bot;
  label: string;
  value: number;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-destructive/40' : undefined}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${accent ? 'text-destructive' : 'text-primary'}`} />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {label}
          </p>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="text-2xl font-black">{value.toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  );
}
