import { LoadingScreen } from '@/components/LoadingScreen';
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
import { logEvent } from '@/hooks/useAnalytics';

export default function SessionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchSession();
  }, [id, user, navigate]);

  const fetchSession = async () => {
    if (!id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to load session', variant: 'destructive' });
      navigate('/');
      return;
    }

    setSession(data);

    // Resolve coach name. Prefer the immutable snapshot stored on the
    // student's training session — this works even after RLS lockdown.
    const snap = (data as any).coach_note_snapshot;
    if (snap?.coach_name) {
      setCoachName(snap.coach_name);
    } else if (data.coach_session_id) {
      // Fallback (only succeeds if the user can view the coach session via RLS).
      const { data: cs } = await supabase
        .from('coach_sessions')
        .select('user_id')
        .eq('id', data.coach_session_id)
        .maybeSingle();
      if (cs?.user_id) {
        const { data: coachProfile } = await supabase
          .from('profiles')
          .select('name, middle_name, surname')
          .eq('id', cs.user_id)
          .maybeSingle();
        if (coachProfile) {
          setCoachName([coachProfile.name, coachProfile.middle_name, coachProfile.surname].filter(Boolean).join(' '));
        }
      }
    }

    const { data: sessionTagsData } = await supabase
      .from('session_tags')
      .select('tag_id, tags(name)')
      .eq('session_id', id);
    if (sessionTagsData) {
      setTags(sessionTagsData.map((st: any) => st.tags?.name).filter(Boolean));
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    await supabase.from('session_tags').delete().eq('session_id', id);
    const { error } = await supabase.from('training_sessions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete session', variant: 'destructive' });
      return;
    }
    logEvent('session_deleted', { session_id: id }, 'session');
    toast({ title: 'Deleted', description: 'Session deleted.' });
    navigate('/');
  };

  if (loading) return <LoadingScreen />;
  if (!session) return null;

  const hasMovementChain = session.first_movement || session.opponent_action || session.second_movement;
  const technique = (session as any).technique || '';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-primary">
                {session.title || technique || `${session.discipline} Training`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(session.date), 'MMMM d, yyyy')}
                {session.time && ` – ${session.time}`}
              </p>
              {session.coach_session_id && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] border-primary/40 bg-primary/10 text-primary">
                    🎓 Coach Class
                  </Badge>
                  {coachName && (
                    <span className="text-xs text-muted-foreground">Coach: {coachName}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/session/${id}/edit`)}>
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
              {session.strategy && (
                <div>
                  <p className="text-xs text-muted-foreground">Tactic</p>
                  <p className="font-semibold text-sm">{session.strategy}</p>
                </div>
              )}
              {technique && (
                <div>
                  <p className="text-xs text-muted-foreground">Technique</p>
                  <p className="font-semibold text-sm">{technique}</p>
                </div>
              )}
              {session.intensity && (
                <div>
                  <p className="text-xs text-muted-foreground">Intensity</p>
                  <p className="font-semibold text-sm">{session.intensity}/10</p>
                </div>
              )}
              {session.feeling && (
                <div>
                  <p className="text-xs text-muted-foreground">Feeling</p>
                  <p className="font-semibold text-sm">{session.feeling}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Movement Chain */}
        {hasMovementChain && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">Movement Chain</p>
              <div className="space-y-2">
                {session.first_movement && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded px-2 py-0.5 shrink-0">1st</span>
                    <p className="text-sm">{session.first_movement}</p>
                  </div>
                )}
                {session.opponent_action && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-muted-foreground bg-muted rounded px-2 py-0.5 shrink-0">2nd</span>
                    <p className="text-sm">{session.opponent_action}</p>
                  </div>
                )}
                {session.second_movement && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded px-2 py-0.5 shrink-0">3rd</span>
                    <p className="text-sm">{session.second_movement}</p>
                  </div>
                )}
              </div>
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

        {/* Video URL */}
        {(session as any).video_url && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Video</p>
              <a
                href={(session as any).video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline break-all"
              >
                {(session as any).video_url}
              </a>
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
