import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TrainingSession } from '@/types/training';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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

export default function SessionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchSession();
  }, [id, user, navigate]);

  const fetchSession = async () => {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('training_sessions')
      .select(`
        *,
        technique_chains (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load session',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setSession(data);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!id) return;

    const { error } = await supabase
      .from('training_sessions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Deleted',
      description: 'Session deleted successfully',
    });

    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {session.title || `${session.discipline} Training`}
              </h1>
              <p className="text-muted-foreground">
                {format(new Date(session.date), 'MMMM d, yyyy')}
                {session.time && ` at ${session.time}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/session/${id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this training session and all associated techniques.
                    </AlertDialogDescription>
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

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Discipline</p>
                <p className="font-semibold">{session.discipline}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-semibold">{session.session_type}</p>
              </div>
              {session.intensity && (
                <div>
                  <p className="text-sm text-muted-foreground">Intensity</p>
                  <p className="font-semibold">{session.intensity}/10</p>
                </div>
              )}
              {session.feeling && (
                <div>
                  <p className="text-sm text-muted-foreground">Feeling</p>
                  <p className="font-semibold">{session.feeling}</p>
                </div>
              )}
              {session.strategy && (
                <div>
                  <p className="text-sm text-muted-foreground">Strategy</p>
                  <p className="font-semibold">{session.strategy}</p>
                </div>
              )}
              {session.first_movement && (
                <div>
                  <p className="text-sm text-muted-foreground">1st Movement</p>
                  <p className="font-semibold">{session.first_movement}</p>
                </div>
              )}
            </div>
            {(session.opponent_action || session.second_movement) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {session.opponent_action && (
                  <div>
                    <p className="text-sm text-muted-foreground">Opponent Action</p>
                    <p className="font-semibold">{session.opponent_action}</p>
                  </div>
                )}
                {session.second_movement && (
                  <div>
                    <p className="text-sm text-muted-foreground">2nd Movement</p>
                    <p className="font-semibold">{session.second_movement}</p>
                  </div>
                )}
              </div>
            )}
            {session.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{session.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-semibold mb-4">Technique Chains</h2>
          {!session.technique_chains || session.technique_chains.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No techniques added yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {session.technique_chains.map((tc: any) => (
                <Card key={tc.id} className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 rounded bg-primary/10 text-primary text-sm font-medium">
                          {tc.discipline}
                        </span>
                        <span className="px-2 py-1 rounded bg-secondary/10 text-secondary text-sm font-medium">
                          {tc.sub_type}
                        </span>
                        <span className="px-2 py-1 rounded bg-accent/10 text-accent text-sm font-medium">
                          {tc.tactical_goal}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Start:</span>{' '}
                          <span className="font-semibold">{tc.starting_action}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Opponent:</span>{' '}
                          <span className="font-semibold">{tc.defender_reaction}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Finish:</span>{' '}
                          <span className="font-semibold">{tc.continuation_finish}</span>
                        </p>
                      </div>
                      {tc.custom_notes && (
                        <p className="text-sm text-muted-foreground italic">
                          {tc.custom_notes}
                        </p>
                      )}
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
