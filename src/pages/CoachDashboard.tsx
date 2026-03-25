import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, X, Swords, Shield, Plus, User, GraduationCap } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppMode } from '@/hooks/useAppMode';
import { ModeSwitcher } from '@/components/ModeSwitcher';
import { format } from 'date-fns';

const ALL_FIGHT_DISCIPLINES = ['MMA', 'Muay Thai', 'K1', 'Boxing', 'BJJ', 'Grappling', 'Wrestling'];

interface FighterRequest {
  id: string;
  user_id: string;
  fighter_status: string;
  requested_fight_disciplines: string[];
  approved_fight_disciplines: string[];
  created_at: string;
  profile_name?: string;
  profile_email?: string;
}

export default function CoachDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<FighterRequest[]>([]);
  const [fighterSessions, setFighterSessions] = useState<any[]>([]);
  const [coachSessions, setCoachSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalDisciplines, setApprovalDisciplines] = useState<Record<string, string[]>>({});

  const isHeadCoach = profile?.coach_level === 'head_coach';

  const isCoach = !!profile?.coach_level;

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!isCoach) return;
    fetchData();
  }, [user, isCoach]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch all fighter profiles
    const { data: fighters } = await supabase
      .from('fighter_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch associated profile names
    if (fighters && fighters.length > 0) {
      const userIds = fighters.map((f: any) => f.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const enriched = fighters.map((f: any) => ({
        ...f,
        profile_name: profileMap.get(f.user_id)?.name || 'Unknown',
        profile_email: profileMap.get(f.user_id)?.email || '',
      }));
      setRequests(enriched);

      // Initialize approval disciplines
      const initialDiscs: Record<string, string[]> = {};
      enriched.forEach(f => {
        initialDiscs[f.id] = f.approved_fight_disciplines || [];
      });
      setApprovalDisciplines(initialDiscs);
    }

    // Fetch fighter sessions in review
    const { data: sessions } = await supabase
      .from('fighter_sessions')
      .select('*')
      .eq('status', 'in_review')
      .order('created_at', { ascending: false });
    setFighterSessions(sessions || []);

    setLoading(false);
  };

  const handleApprove = async (request: FighterRequest) => {
    const selectedDiscs = approvalDisciplines[request.id] || [];
    const { error } = await supabase
      .from('fighter_profiles')
      .update({
        fighter_status: 'approved',
        approved_fight_disciplines: selectedDiscs,
        approved_by_head_coach: user!.id,
        approved_at: new Date().toISOString(),
        discipline_approved_by: user!.id,
        discipline_approved_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Approved', description: `${request.profile_name} approved as fighter.` });
    fetchData();
  };

  const handleReject = async (request: FighterRequest) => {
    const { error } = await supabase
      .from('fighter_profiles')
      .update({ fighter_status: 'rejected' })
      .eq('id', request.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Rejected', description: `${request.profile_name} fighter request rejected.` });
    fetchData();
  };

  const toggleDiscipline = (requestId: string, disc: string) => {
    setApprovalDisciplines(prev => {
      const current = prev[requestId] || [];
      return {
        ...prev,
        [requestId]: current.includes(disc) ? current.filter(d => d !== disc) : [...current, disc],
      };
    });
  };

  const handleApproveSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('fighter_sessions')
      .update({ status: 'approved' })
      .eq('id', sessionId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Session Approved' });
    fetchData();
  };

  if (!isHeadCoach) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-destructive/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Head Coach access only.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.fighter_status === 'pending');
  const approvedFighters = requests.filter(r => r.fighter_status === 'approved');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-xl font-bold mt-2">Coach Dashboard</h1>
          <p className="text-sm text-muted-foreground">Head Coach Control Panel</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        <Tabs defaultValue="requests">
          <TabsList className="w-full">
            <TabsTrigger value="requests" className="flex-1">
              Fighter Requests {pendingRequests.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px]">{pendingRequests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="fighters" className="flex-1">Approved Fighters</TabsTrigger>
            <TabsTrigger value="sessions" className="flex-1">
              Sessions {fighterSessions.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{fighterSessions.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Pending Requests */}
          <TabsContent value="requests" className="space-y-3 mt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : pendingRequests.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No pending fighter requests.</CardContent></Card>
            ) : (
              pendingRequests.map(req => (
                <Card key={req.id}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">{req.profile_name}</p>
                        <p className="text-xs text-muted-foreground">{req.profile_email}</p>
                      </div>
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30">Pending</Badge>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Requested disciplines:</p>
                      <div className="flex gap-1 flex-wrap">
                        {(req.requested_fight_disciplines || []).map(d => (
                          <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Approve disciplines:</p>
                      <div className="flex gap-2 flex-wrap">
                        {ALL_FIGHT_DISCIPLINES.map(d => (
                          <label key={d} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox
                              checked={(approvalDisciplines[req.id] || []).includes(d)}
                              onCheckedChange={() => toggleDiscipline(req.id, d)}
                            />
                            {d}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => handleApprove(req)} className="flex-1">
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(req)} className="flex-1">
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Approved Fighters */}
          <TabsContent value="fighters" className="space-y-3 mt-4">
            {approvedFighters.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No approved fighters yet.</CardContent></Card>
            ) : (
              approvedFighters.map(f => (
                <Card key={f.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">{f.profile_name}</p>
                        <p className="text-xs text-muted-foreground">{f.profile_email}</p>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">Approved</Badge>
                    </div>
                    <div className="flex gap-1 flex-wrap mt-2">
                      {(f.approved_fight_disciplines || []).map(d => (
                        <Badge key={d} variant="default" className="text-xs">{d}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Sessions in Review */}
          <TabsContent value="sessions" className="space-y-3 mt-4">
            {fighterSessions.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No sessions awaiting review.</CardContent></Card>
            ) : (
              fighterSessions.map(s => (
                <Card key={s.id}>
                  <CardContent className="pt-6 space-y-2">
                    <p className="font-semibold text-sm">{s.title}</p>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">{s.discipline}</Badge>
                      {s.tactic && <Badge variant="secondary" className="text-xs">{s.tactic}</Badge>}
                    </div>
                    {s.strategy && <p className="text-xs text-muted-foreground line-clamp-2">{s.strategy}</p>}
                    <Button size="sm" onClick={() => handleApproveSession(s.id)}>
                      <Check className="h-3 w-3 mr-1" /> Approve Session
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
