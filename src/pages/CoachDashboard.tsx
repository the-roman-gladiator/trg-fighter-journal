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
  const { mode } = useAppMode();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<FighterRequest[]>([]);
  const [fighterSessions, setFighterSessions] = useState<any[]>([]);
  const [coachSessions, setCoachSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalDisciplines, setApprovalDisciplines] = useState<Record<string, string[]>>({});
  const [fighterNotes, setFighterNotes] = useState<Record<string, any[]>>({});
  const [fighterProfiles, setFighterProfiles] = useState<Record<string, any>>({});

  const isHeadCoach = profile?.coach_level === 'head_coach';

  const isCoach = !!profile?.coach_level;

  // Redirect when mode changes away from coach
  useEffect(() => {
    if (mode === 'athlete') navigate('/');
    else if (mode === 'fighter') navigate('/fighter');
  }, [mode]);

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
        .select('id, name, middle_name, surname, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const enriched = fighters.map((f: any) => {
        const prof = profileMap.get(f.user_id);
        const fullName = [prof?.name, prof?.middle_name, prof?.surname].filter(Boolean).join(' ');
        return {
          ...f,
          profile_name: fullName || 'Unknown',
          profile_email: prof?.email || '',
        };
      });
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

    // Fetch coach's own planned sessions
    const { data: cSessions } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setCoachSessions(cSessions || []);

    // Load all approved fighters' training sessions and full profile details
    if (fighters && fighters.length > 0) {
      const approvedIds = fighters
        .filter((f: any) => f.fighter_status === 'approved')
        .map((f: any) => f.user_id);

      if (approvedIds.length > 0) {
        const { data: allNotes } = await supabase
          .from('training_sessions')
          .select('*')
          .in('user_id', approvedIds)
          .eq('session_type', 'Completed')
          .order('date', { ascending: false });

        const notesGrouped: Record<string, any[]> = {};
        (allNotes || []).forEach((note: any) => {
          if (!notesGrouped[note.user_id]) notesGrouped[note.user_id] = [];
          notesGrouped[note.user_id].push(note);
        });
        setFighterNotes(notesGrouped);

        const { data: fullProfiles } = await supabase
          .from('profiles')
          .select('id, name, middle_name, surname, nickname, email')
          .in('id', approvedIds);

        const profilesById: Record<string, any> = {};
        (fullProfiles || []).forEach((p: any) => { profilesById[p.id] = p; });
        setFighterProfiles(profilesById);
      }
    }

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

  const handleCompleteCoachSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('coach_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Session Completed', description: 'Students can now record this in their journal.' });
    fetchData();
  };

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-destructive/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Coach access only.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.fighter_status === 'pending');
  const approvedFighters = requests.filter(r => r.fighter_status === 'approved');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-display font-bold tracking-wide text-primary">TRG</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Coach Mode</p>
          </div>
          <div className="flex items-center gap-2">
            <ModeSwitcher />
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        {/* New Coach Session button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Coach Dashboard</h2>
          <Button size="sm" onClick={() => navigate('/coach/session/new')}>
            <Plus className="h-4 w-4 mr-1" /> Plan Session
          </Button>
        </div>

        <Tabs defaultValue="my_sessions">
          <TabsList className="w-full">
            <TabsTrigger value="my_sessions" className="flex-1">
              <GraduationCap className="h-3.5 w-3.5 mr-1" /> My Sessions
            </TabsTrigger>
            {isHeadCoach && (
              <TabsTrigger value="requests" className="flex-1">
                Requests {pendingRequests.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px]">{pendingRequests.length}</Badge>}
              </TabsTrigger>
            )}
            {isHeadCoach && (
              <TabsTrigger value="fighters" className="flex-1">Fighters</TabsTrigger>
            )}
            {isHeadCoach && (
              <TabsTrigger value="fighter_notes" className="flex-1">
                Fighter Notes
              </TabsTrigger>
            )}
            {isHeadCoach && (
              <TabsTrigger value="sessions" className="flex-1">
                Reviews {fighterSessions.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{fighterSessions.length}</Badge>}
              </TabsTrigger>
            )}
          </TabsList>

          {/* My Coach Sessions */}
          <TabsContent value="my_sessions" className="space-y-3 mt-4">
            <div className="space-y-2">
              {coachSessions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">No coach sessions yet.</p>
                    <Button size="sm" className="mt-3" onClick={() => navigate('/coach/session/new')}>
                      Plan First Session
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                coachSessions.map(cs => (
                   <Card key={cs.id} className="cursor-pointer hover:border-primary/20"
                    onClick={() => navigate(`/coach/session/${cs.id}/edit`)}>
                    <CardContent className="py-3">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{cs.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {cs.scheduled_date ? format(new Date(cs.scheduled_date), 'MMM d, yyyy') : 'No date'}
                            {cs.duration_minutes && ` · ${cs.duration_minutes}min`}
                          </p>
                          {cs.session_plan && <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">{cs.session_plan}</p>}
                        </div>
                        <div className="flex gap-1 ml-2 shrink-0 items-center">
                          <Badge variant={cs.status === 'scheduled' ? 'default' : cs.status === 'completed' ? 'secondary' : 'outline'} className="text-[10px]">
                            {cs.status === 'scheduled' ? 'Scheduled' : cs.status === 'completed' ? 'Completed' : 'Draft'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{cs.discipline}</Badge>
                          {cs.status === 'scheduled' && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 ml-1"
                              onClick={(e) => handleCompleteCoachSession(cs.id, e)}>
                              <Check className="h-3 w-3 mr-0.5" /> Done
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

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

          {/* Fighter Notes */}
          <TabsContent value="fighter_notes" className="space-y-4 mt-4">
            {approvedFighters.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No approved fighters yet.
                </CardContent>
              </Card>
            ) : (
              approvedFighters.map(fighter => {
                const prof = fighterProfiles[fighter.user_id];
                const notes = fighterNotes[fighter.user_id] || [];
                const fullName = [prof?.name, prof?.middle_name, prof?.surname]
                  .filter(Boolean).join(' ') || fighter.profile_name;
                const nickname = prof?.nickname;

                return (
                  <Card key={fighter.id} className="border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Swords className="h-4 w-4 text-primary" />
                            {fullName}
                          </CardTitle>
                          {nickname && (
                            <p className="text-xs text-primary/70 mt-0.5 italic">
                              "{nickname}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {prof?.email || fighter.profile_email}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                            Approved Fighter
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notes.length} session{notes.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap mt-2">
                        {(fighter.approved_fight_disciplines || []).map((d: string) => (
                          <Badge key={d} variant="default" className="text-[10px]">{d}</Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {notes.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          No training sessions recorded yet.
                        </p>
                      ) : (
                        notes.map(note => {
                          const chain = [
                            note.first_movement,
                            note.opponent_action,
                            note.second_movement,
                          ].filter(Boolean).join(' → ');
                          return (
                            <div
                              key={note.id}
                              className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 space-y-1"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-sm font-medium truncate flex-1">
                                  {note.title || note.technique || `${note.discipline} Training`}
                                </p>
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {note.discipline}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(note.date), 'MMM d, yyyy')}
                                {note.time && ` · ${note.time}`}
                                {note.strategy && ` · ${note.strategy}`}
                              </p>
                              {chain && (
                                <p className="text-xs text-primary/70 font-mono">
                                  {chain}
                                </p>
                              )}
                              {note.notes && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {note.notes}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
