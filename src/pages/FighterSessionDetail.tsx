import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function FighterSessionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (id) fetchSession();
  }, [id, user]);

  const fetchSession = async () => {
    const { data, error } = await supabase
      .from('fighter_sessions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      toast({ title: 'Error', description: 'Session not found', variant: 'destructive' });
      navigate('/fighter');
      return;
    }
    setSession(data);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    const { error } = await supabase.from('fighter_sessions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
      return;
    }
    toast({ title: 'Deleted', description: 'Session deleted.' });
    navigate('/fighter');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!session) return null;

  const statusStyle: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    in_review: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/fighter')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-primary">{session.title}</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(session.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/fighter/session/${id}/edit`)}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete session?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
        {/* Core info */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Discipline</p>
                <p className="font-semibold text-sm">{session.discipline}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={`text-xs ${statusStyle[session.status] || ''}`}>{session.status}</Badge>
              </div>
              {session.opponent_scenario && (
                <div>
                  <p className="text-xs text-muted-foreground">Opponent / Scenario</p>
                  <p className="font-semibold text-sm">{session.opponent_scenario}</p>
                </div>
              )}
              {session.goal && (
                <div>
                  <p className="text-xs text-muted-foreground">Goal</p>
                  <p className="font-semibold text-sm">{session.goal}</p>
                </div>
              )}
              {session.tactic && (
                <div>
                  <p className="text-xs text-muted-foreground">Tactics</p>
                  <p className="font-semibold text-sm">{session.tactic}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Strategy */}
        {session.strategy && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Strategy</p>
              <p className="text-sm whitespace-pre-wrap">{session.strategy}</p>
            </CardContent>
          </Card>
        )}

        {/* Action */}
        {session.action && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Action</p>
              <p className="text-sm whitespace-pre-wrap">{session.action}</p>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {session.notes && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
