import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { KeyRound } from 'lucide-react';

export function RedeemCoachCode() {
  const { refreshProfile } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const redeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('redeem_coach_invitation', { _code: code.trim() });
    setLoading(false);

    if (error) {
      toast({ title: 'Could not redeem code', description: error.message, variant: 'destructive' });
      return;
    }
    const result = data as { success: boolean; error?: string; coach_level?: string };
    if (!result.success) {
      const map: Record<string, string> = {
        invalid_code: 'Invalid or already used code.',
        expired: 'This code has expired.',
        email_mismatch: 'This code was issued for a different email.',
        not_authenticated: 'Please sign in first.',
      };
      toast({
        title: 'Could not redeem code',
        description: map[result.error || ''] || result.error,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Coach access granted', description: `You are now a ${result.coach_level?.replace('_', ' ')}.` });
    setCode('');
    await refreshProfile();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> Redeem Coach Invite Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          If a Head Coach or Main Coach gave you an invite code, enter it here to activate your coach access.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="redeem-code" className="text-xs">Invite Code</Label>
          <Input
            id="redeem-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC12345"
            className="font-mono tracking-widest uppercase"
            maxLength={12}
          />
        </div>
        <Button onClick={redeem} disabled={loading || !code.trim()} className="w-full" size="sm">
          {loading ? 'Redeeming…' : 'Redeem Code'}
        </Button>
      </CardContent>
    </Card>
  );
}
