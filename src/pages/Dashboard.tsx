import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Map, Trash2, Swords } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/sonner';

const MARTIAL_ARTS = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'];

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [maStats, setMaStats] = useState({ total: 0, thisWeek: 0, discipline: '' });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const sevenDaysAgo = subDays(new Date(), 7).toISOString().split('T')[0];

    const { data: recent } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(20);

    setRecentSessions(recent || []);

    // Martial arts stats
    const maSessions = (recent || []).filter(s => MARTIAL_ARTS.includes(s.discipline));
    const topDiscipline = profile?.discipline || 'MMA';
    setMaStats({ total: maSessions.length, thisWeek: maSessions.length, discipline: topDiscipline });

    setLoading(false);
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('training_sessions').delete().eq('id', sessionId);
    if (error) {
      toast.error('Failed to delete session');
    } else {
      toast.success('Session deleted');
      setRecentSessions(prev => prev.filter(s => s.id !== sessionId));
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">TRG Training</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
              <User className="mr-1 h-4 w-4" />{profile?.name}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={() => navigate('/session/new')} className="flex-1 h-12">
            <Plus className="mr-2 h-4 w-4" /> Session
          </Button>
          <Button onClick={() => navigate('/pathway')} variant="outline" className="flex-1 h-12">
            <Map className="mr-2 h-4 w-4" /> My Pathway
          </Button>
        </div>

        {/* Martial Arts Journal */}
        <Card className="border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Swords className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Martial Arts Journal</p>
            </div>
            <p className="text-lg font-bold">{maStats.discipline}</p>
            <div className="flex items-center gap-4 mt-2">
              <div>
                <p className="text-2xl font-black text-foreground">{maStats.total}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions (7 days) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Sessions (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No sessions in the last 7 days.</p>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/10 rounded px-2 -mx-2"
                    onClick={() => navigate(`/session/${session.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{session.title || `${session.discipline} Training`}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(session.date), 'EEE, MMM d')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.intensity && (
                        <Badge variant="outline" className="text-xs">RPE {session.intensity}</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{session.discipline}</Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete session?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={(e) => deleteSession(session.id, e)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
