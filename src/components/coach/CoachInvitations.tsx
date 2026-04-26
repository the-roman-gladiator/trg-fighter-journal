import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy, Send, UserPlus, Mail, Check, X, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useCoachAccess } from '@/hooks/useCoachAccess';

type CoachLevel = 'head_coach' | 'main_coach' | 'level_2' | 'level_1';

const LEVEL_LABEL: Record<CoachLevel, string> = {
  head_coach: 'Head Coach',
  main_coach: 'Main Coach',
  level_2: 'L2 Coach',
  level_1: 'L1 Coach',
};

interface Invitation {
  id: string;
  invited_email: string;
  invite_code: string;
  coach_level: CoachLevel;
  assigned_disciplines: string[];
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export function CoachInvitations() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState<CoachLevel>('level_1');
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{ code?: string; promoted?: boolean } | null>(null);

  const inviterLevel = profile?.coach_level as CoachLevel | undefined;
  const {
    isHeadCoach: isHead,
    isMainCoach: isMain,
    isLevel2,
    delegationEnabled,
    allowedNominationLevels,
    assignableDisciplines,
  } = useCoachAccess();

  const allowedLevels = allowedNominationLevels;
  const inviterDisciplines = assignableDisciplines;
  // Show the "you're locked out by delegation toggle" notice for non-head coaches
  const blockedByDelegation = !isHead && (isMain || isLevel2) && !delegationEnabled;

  useEffect(() => {
    fetchInvitations();
  }, [user?.id]);

  const fetchInvitations = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('coach_invitations')
      .select('*')
      .eq('invited_by', user.id)
      .order('created_at', { ascending: false });
    setInvitations((data || []) as Invitation[]);
    setLoading(false);
  };

  const toggleDiscipline = (d: string) => {
    setDisciplines(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const resetForm = () => {
    setEmail('');
    setLevel('level_1');
    setDisciplines([]);
  };

  const handleSubmit = async () => {
    if (!user || !inviterLevel) return;
    if (!email.trim()) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    if (disciplines.length === 0) {
      toast({ title: 'Select at least one discipline', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    setLastResult(null);

    // Step 1: try promote existing user
    const { data: promoteData, error: promoteErr } = await supabase
      .rpc('promote_existing_user_to_coach', {
        _email: email.trim(),
        _coach_level: level,
        _disciplines: disciplines,
      });

    if (!promoteErr && promoteData && (promoteData as any).success) {
      toast({ title: 'Coach promoted', description: `${email} is now ${LEVEL_LABEL[level]}.` });
      setLastResult({ promoted: true });
      resetForm();
      fetchInvitations();
      setSubmitting(false);
      return;
    }

    // Step 2: create invitation (for users who don't have an account yet, or when promote failed for any reason)
    const { data: inv, error: invErr } = await supabase
      .from('coach_invitations')
      .insert({
        invited_email: email.trim(),
        coach_level: level,
        assigned_disciplines: disciplines,
        invited_by: user.id,
        invited_by_level: inviterLevel,
      })
      .select()
      .single();

    if (invErr) {
      toast({ title: 'Could not create invitation', description: invErr.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    setLastResult({ code: inv.invite_code });
    toast({ title: 'Invitation created', description: `Share code with ${email}` });
    resetForm();
    fetchInvitations();
    setSubmitting(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Code copied' });
  };

  const revokeInvitation = async (id: string) => {
    const { error } = await supabase
      .from('coach_invitations')
      .update({ status: 'revoked' })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    fetchInvitations();
  };

  if (allowedLevels.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          You don't have permission to invite other coaches.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invite form */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Invite a Coach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="coach@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Coach Level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as CoachLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedLevels.map(l => (
                  <SelectItem key={l} value={l}>{LEVEL_LABEL[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Assigned Disciplines</Label>
            <div className="grid grid-cols-2 gap-2">
              {inviterDisciplines.map(d => (
                <label key={d} className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5 cursor-pointer">
                  <Checkbox
                    checked={disciplines.includes(d)}
                    onCheckedChange={() => toggleDiscipline(d)}
                  />
                  <span className="text-xs">{d}</span>
                </label>
              ))}
            </div>
            {isMain && (
              <p className="text-[10px] text-muted-foreground">You can only assign disciplines you coach.</p>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            <Send className="h-3.5 w-3.5 mr-2" /> {submitting ? 'Working…' : 'Invite Coach'}
          </Button>

          {lastResult?.code && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Account not found for that email. Share this invite code — they sign up first, then redeem it from their profile:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm tracking-widest">
                  {lastResult.code}
                </code>
                <Button size="sm" variant="outline" onClick={() => copyCode(lastResult.code!)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          {lastResult?.promoted && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-300">
              Existing account upgraded instantly. They'll see coach mode on next refresh.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sent invitations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" /> Sent Invitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
          ) : invitations.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No invitations sent yet.</p>
          ) : (
            invitations.map(inv => (
              <div key={inv.id} className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{inv.invited_email}</p>
                  <Badge
                    variant="outline"
                    className={
                      inv.status === 'accepted' ? 'text-emerald-400 border-emerald-500/40'
                      : inv.status === 'revoked' ? 'text-muted-foreground'
                      : inv.status === 'expired' ? 'text-amber-400 border-amber-500/40'
                      : 'text-primary border-primary/40'
                    }
                  >
                    {inv.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {LEVEL_LABEL[inv.coach_level]} · {inv.assigned_disciplines.join(', ') || 'No disciplines'}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground">
                    Sent {format(new Date(inv.created_at), 'MMM d')}
                    {inv.accepted_at && ` · Accepted ${format(new Date(inv.accepted_at), 'MMM d')}`}
                  </p>
                  {inv.status === 'pending' && (
                    <div className="flex items-center gap-1">
                      <code className="text-[11px] font-mono bg-background px-2 py-0.5 rounded">{inv.invite_code}</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyCode(inv.invite_code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => revokeInvitation(inv.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {inv.status === 'accepted' && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
