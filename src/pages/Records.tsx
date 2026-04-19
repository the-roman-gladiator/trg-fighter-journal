import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

export default function Records() {
  const { user } = useAuth();
  const { getDisciplineColor } = useUserSettings();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    (async () => {
      const { data } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(200);
      setSessions(data || []);
      setLoading(false);
    })();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-display font-bold text-primary">Records</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-5 max-w-lg space-y-2">
        {loading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}
        {!loading && sessions.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No sessions logged yet</CardContent></Card>
        )}
        {sessions.map(s => (
          <Card key={s.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate(`/session/${s.id}`)}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{s.title || s.technique || 'Session'}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    <span>{format(new Date(s.date), 'EEE, MMM d yyyy')}</span>
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0"
                      style={{ backgroundColor: getDisciplineColor(s.discipline) + '22', color: getDisciplineColor(s.discipline), borderColor: getDisciplineColor(s.discipline) + '44' }}>
                      {s.discipline}
                    </Badge>
                    {s.class_type && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{s.class_type}</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
