import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoachAccess } from '@/hooks/useCoachAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck } from 'lucide-react';

/**
 * Head-coach-only toggle that lets Main and L2 coaches nominate
 * within their permitted levels. When OFF only the head coach can nominate.
 */
export function HierarchySettings() {
  const { profile, refreshProfile } = useAuth();
  const { isHeadCoach } = useCoachAccess();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const enabled = !!(profile as any)?.hierarchy_delegation_enabled;

  if (!isHeadCoach) return null;

  const handleToggle = async (next: boolean) => {
    if (!profile?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ hierarchy_delegation_enabled: next })
      .eq('id', profile.id);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: next ? 'Delegation enabled' : 'Delegation disabled',
        description: next
          ? 'Main and L2 coaches can now nominate within their permitted levels.'
          : 'Only head coaches can nominate other coaches.',
      });
      await refreshProfile();
    }
    setSaving(false);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Hierarchy Delegation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Allow lower-level coaches to nominate</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              ON · Main coaches can invite L2 / L1, L2 coaches can invite L1 — within their assigned disciplines.<br />
              OFF · Only head coaches can nominate any coach.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
        </div>
      </CardContent>
    </Card>
  );
}
