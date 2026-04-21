import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFighterProfile } from '@/hooks/useFighterProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Swords, Network, Shield, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { useAppMode } from '@/hooks/useAppMode';
import { ModeSwitcher } from '@/components/ModeSwitcher';
import { FighterStatistics } from '@/components/fighter/FighterStatistics';

export default function FighterDashboard() {
  const { user, profile, signOut } = useAuth();
  const { fighterProfile, isFighterApproved, loading: fpLoading } = useFighterProfile();
  const { mode } = useAppMode();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect when mode changes away from fighter
  useEffect(() => {
    if (mode === 'athlete') navigate('/');
    else if (mode === 'coach') navigate('/coach');
  }, [mode]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!fpLoading && !isFighterApproved) return;
    fetchSessions();
  }, [user, fpLoading, isFighterApproved]);

  const fetchSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('fighter_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setSessions(data || []);
    setLoading(false);
  };

  if (fpLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isFighterApproved) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-xl font-bold mt-2">Fighters Area</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <Shield className="h-10 w-10 text-destructive/60" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Restricted Access</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This section is available for approved fighters only.
          </p>
          {fighterProfile?.fighter_status === 'pending' && (
            <Badge variant="outline" className="text-amber-500 border-amber-500/30">
              <Clock className="h-3 w-3 mr-1" /> Your request is pending approval
            </Badge>
          )}
          {fighterProfile?.fighter_status === 'rejected' && (
            <Badge variant="outline" className="text-destructive border-destructive/30">
              Your request was not approved
            </Badge>
          )}
          {!fighterProfile && (
            <Button onClick={() => navigate('/profile')}>
              Request Fighter Access in Profile
            </Button>
          )}
        </main>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    in_review: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-display font-bold tracking-wide text-primary">TRG</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Fighter Mode</p>
          </div>
          <div className="flex items-center gap-2">
            <ModeSwitcher />
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">Fighter Dashboard</h2>
            <p className="text-xs text-muted-foreground">
              Fighting in: {fighterProfile?.approved_fight_disciplines?.join(', ') || 'Pending'}
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/fighter/session/new')}>
            <Plus className="h-4 w-4 mr-1" /> New Session
          </Button>
        </div>


        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate('/fighter/pathway')}>
            <CardContent className="py-4 flex items-center gap-3">
              <Network className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Fighter Pathway</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => navigate('/fighter/session/new')}>
            <CardContent className="py-4 flex items-center gap-3">
              <Swords className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Add Session</span>
            </CardContent>
          </Card>
        </div>

        {/* Approved disciplines */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Approved Fight Disciplines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {(fighterProfile?.approved_fight_disciplines || []).map(d => (
                <Badge key={d} variant="default">{d}</Badge>
              ))}
              {(fighterProfile?.approved_fight_disciplines || []).length === 0 && (
                <p className="text-xs text-muted-foreground">No disciplines approved yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent sessions */}
        <div>
          <h2 className="text-sm font-semibold mb-2">Recent Fighter Sessions</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No fighter sessions yet.</p>
                <Button size="sm" className="mt-3" onClick={() => navigate('/fighter/session/new')}>
                  Create First Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <Card key={s.id} className="cursor-pointer hover:border-primary/20" onClick={() => navigate(`/fighter/session/${s.id}`)}>
                  <CardContent className="py-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(s.created_at), 'MMM d, yyyy')}</p>
                        {s.strategy && <p className="text-xs text-primary/70 mt-1 line-clamp-1">{s.strategy}</p>}
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <Badge variant="outline" className="text-[10px]">{s.discipline}</Badge>
                        <Badge className={`text-[10px] ${statusColor[s.status] || ''}`}>{s.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
