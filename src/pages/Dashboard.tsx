import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingSession } from '@/types/training';
import { Plus, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [plannedSessions, setPlannedSessions] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchSessions();
  }, [user, navigate]);

  const fetchSessions = async () => {
    if (!user) return;

    setLoading(true);

    // Fetch planned sessions
    const { data: planned } = await supabase
      .from('training_sessions')
      .select(`
        *,
        technique_chains (count)
      `)
      .eq('user_id', user.id)
      .eq('session_type', 'Planned')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(5);

    // Fetch recent completed sessions
    const { data: recent } = await supabase
      .from('training_sessions')
      .select(`
        *,
        technique_chains (count)
      `)
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .order('date', { ascending: false })
      .limit(5);

    setPlannedSessions(planned || []);
    setRecentSessions(recent || []);
    setLoading(false);
  };

  const SessionCard = ({ session }: { session: any }) => (
    <Card
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={() => navigate(`/session/${session.id}`)}
    >
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {format(new Date(session.date), 'MMM d, yyyy')}
              {session.time && ` at ${session.time}`}
            </p>
            <h3 className="font-semibold text-lg">
              {session.title || `${session.discipline} Training`}
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 rounded bg-primary/10 text-primary">
                {session.discipline}
              </span>
              <span className="text-muted-foreground">
                {session.session_type}
              </span>
            </div>
          </div>
          {session.technique_chains && (
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {session.technique_chains[0]?.count || 0}
              </p>
              <p className="text-xs text-muted-foreground">techniques</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Training Journal</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
            >
              <User className="mr-2 h-4 w-4" />
              {profile?.name}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <Button onClick={() => navigate('/session/new')} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Add Session
          </Button>
        </div>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Upcoming Planned Sessions</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/sessions')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              View All
            </Button>
          </div>
          {plannedSessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No planned sessions. Create one to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {plannedSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-4">Recent Sessions</h3>
          {recentSessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No completed sessions yet. Log your first training!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recentSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
