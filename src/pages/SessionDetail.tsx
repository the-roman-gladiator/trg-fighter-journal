import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { isMartialArt } from '@/types/training';
import { ArrowLeft, Edit, Trash2, Dumbbell, Activity } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function SessionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [strengthExercises, setStrengthExercises] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchSession();
  }, [id, user, navigate]);

  const fetchSession = async () => {
    if (!id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('training_sessions')
      .select(`*, technique_chains (*)`)
      .eq('id', id)
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to load session', variant: 'destructive' });
      navigate('/');
      return;
    }

    setSession(data);

    // Load strength exercises if applicable
    if (data.discipline === 'Strength Training') {
      const { data: exData } = await supabase
        .from('strength_workout_exercises')
        .select('*, strength_workout_sets(*)')
        .eq('training_session_id', id)
        .order('exercise_order');
      setStrengthExercises(exData || []);
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    const { error } = await supabase.from('training_sessions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete session', variant: 'destructive' });
      return;
    }
    toast({ title: 'Deleted', description: 'Session deleted successfully' });
    navigate('/');
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!session) return null;

  const isMA = isMartialArt(session.discipline);
  const isStrength = session.discipline === 'Strength Training';
  const isCardio = session.discipline === 'Cardio Activity';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {session.title || session.workout_name || session.cardio_activity_name || `${session.discipline} Training`}
              </h1>
              <p className="text-muted-foreground">
                {format(new Date(session.date), 'MMMM d, yyyy')}
                {session.time && ` at ${session.time}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/session/${id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this training session and all associated data.</AlertDialogDescription>
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
        {/* Session Info Card */}
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
            </div>

            {/* Martial Arts Fields */}
            {isMA && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {session.strategy && (
                  <div><p className="text-sm text-muted-foreground">Strategy</p><p className="font-semibold">{session.strategy}</p></div>
                )}
                {session.first_movement && (
                  <div><p className="text-sm text-muted-foreground">1st Movement</p><p className="font-semibold">{session.first_movement}</p></div>
                )}
                {session.opponent_action && (
                  <div><p className="text-sm text-muted-foreground">Opponent Action</p><p className="font-semibold">{session.opponent_action}</p></div>
                )}
                {session.second_movement && (
                  <div><p className="text-sm text-muted-foreground">2nd Movement</p><p className="font-semibold">{session.second_movement}</p></div>
                )}
              </div>
            )}

            {session.notes && (
              <div><p className="text-sm text-muted-foreground mb-1">Notes</p><p className="text-sm">{session.notes}</p></div>
            )}
          </CardContent>
        </Card>

        {/* Strength Training Detail */}
        {isStrength && (
          <>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{session.total_exercises || 0}</p>
                    <p className="text-xs text-muted-foreground">Exercises</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{session.total_sets || 0}</p>
                    <p className="text-xs text-muted-foreground">Sets</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{session.total_reps || 0}</p>
                    <p className="text-xs text-muted-foreground">Reps</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{Number(session.total_load || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Load (kg)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Dumbbell className="h-5 w-5" /> Exercises
              </h2>
              <div className="space-y-4">
                {strengthExercises.map((ex: any) => (
                  <Card key={ex.id}>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-3">{ex.exercise_name}</h3>
                      <div className="space-y-1">
                        {(ex.strength_workout_sets || [])
                          .sort((a: any, b: any) => a.set_number - b.set_number)
                          .map((s: any) => (
                            <div key={s.id} className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground w-12">Set {s.set_number}</span>
                              <span className="font-medium">{s.reps || 0} reps</span>
                              <span className="text-muted-foreground">×</span>
                              <span className="font-medium">{Number(s.weight || 0)} kg</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Cardio Detail */}
        {isCardio && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Cardio Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {session.cardio_type && (
                  <div><p className="text-sm text-muted-foreground">Type</p><p className="font-semibold">{session.cardio_type}</p></div>
                )}
                {session.duration_seconds && (
                  <div><p className="text-sm text-muted-foreground">Duration</p><p className="font-semibold">{formatDuration(session.duration_seconds)}</p></div>
                )}
                {session.distance_meters && (
                  <div><p className="text-sm text-muted-foreground">Distance</p><p className="font-semibold">{(Number(session.distance_meters) / 1000).toFixed(2)} km</p></div>
                )}
                {session.calories && (
                  <div><p className="text-sm text-muted-foreground">Calories</p><p className="font-semibold">{session.calories} kcal</p></div>
                )}
                {session.avg_pace_seconds_per_km && (
                  <div><p className="text-sm text-muted-foreground">Avg Pace</p><p className="font-semibold">{Math.floor(Number(session.avg_pace_seconds_per_km) / 60)}:{String(Number(session.avg_pace_seconds_per_km) % 60).padStart(2, '0')} /km</p></div>
                )}
                {session.avg_heart_rate && (
                  <div><p className="text-sm text-muted-foreground">Avg HR</p><p className="font-semibold">{session.avg_heart_rate} bpm</p></div>
                )}
                {session.max_heart_rate && (
                  <div><p className="text-sm text-muted-foreground">Max HR</p><p className="font-semibold">{session.max_heart_rate} bpm</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technique Chains - only for martial arts */}
        {isMA && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Technique Chains</h2>
            {!session.technique_chains || session.technique_chains.length === 0 ? (
              <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">No techniques added yet</p></CardContent></Card>
            ) : (
              <div className="space-y-4">
                {session.technique_chains.map((tc: any) => (
                  <Card key={tc.id} className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-1 rounded bg-primary/10 text-primary text-sm font-medium">{tc.discipline}</span>
                          <span className="px-2 py-1 rounded bg-secondary/10 text-secondary text-sm font-medium">{tc.sub_type}</span>
                          <span className="px-2 py-1 rounded bg-accent/10 text-accent text-sm font-medium">{tc.tactical_goal}</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Start:</span> <span className="font-semibold">{tc.starting_action}</span></p>
                          <p><span className="text-muted-foreground">Opponent:</span> <span className="font-semibold">{tc.defender_reaction}</span></p>
                          <p><span className="text-muted-foreground">Finish:</span> <span className="font-semibold">{tc.continuation_finish}</span></p>
                        </div>
                        {tc.custom_notes && <p className="text-sm text-muted-foreground italic">{tc.custom_notes}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
