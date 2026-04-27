import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logEvent } from '@/hooks/useAnalytics';

/**
 * Privacy: lets a signed-in user wipe all of their AI conversations,
 * messages, feedback, analytics events, and error logs in one click.
 * Training sessions, profile, and pathway data are NOT touched here —
 * those have their own deletion flows.
 */
export function DeleteMyDataSection() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('delete_my_personal_data' as never);
      if (error) throw error;
      const deleted = (data as { deleted?: Record<string, number> } | null)?.deleted;
      logEvent('user_data_deleted', { deleted: deleted ?? {} });
      toast({
        title: 'Personal data deleted',
        description: deleted
          ? `Removed ${deleted.conversations ?? 0} conversations, ${deleted.messages ?? 0} messages, ${deleted.events ?? 0} events.`
          : 'Your AI history and analytics have been removed.',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not delete data';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-destructive/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Delete my AI &amp; analytics data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Removes your Gladius conversations, feedback, error logs and usage events.
              Your training sessions and profile stay intact.
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="w-full" disabled={busy}>
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {busy ? 'Deleting…' : 'Delete my data'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete personal data?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes all of your AI conversations, message
                feedback, analytics events and error logs. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
