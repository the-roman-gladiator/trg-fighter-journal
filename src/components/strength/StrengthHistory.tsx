import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { History, Play } from 'lucide-react';

export default function StrengthHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('workout_logs' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setLogs((data || []) as any[]);
    setLoading(false);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'incomplete': return 'secondary';
      case 'in_progress': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Loading history...</p>;
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-3">
          <History className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No workout history yet.</p>
          <p className="text-sm text-muted-foreground">Complete a workout to see it here.</p>
        </CardContent>
      </Card>
    );
  }

  // Stats
  const completed = logs.filter(l => l.status === 'completed').length;
  const incomplete = logs.filter(l => l.status === 'incomplete').length;
  const avgCompletion = logs.length > 0
    ? Math.round(logs.reduce((acc, l) => acc + (l.completion_percentage || 0), 0) / logs.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-primary">{completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-foreground">{incomplete}</p>
            <p className="text-xs text-muted-foreground">Incomplete</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-primary">{avgCompletion}%</p>
            <p className="text-xs text-muted-foreground">Avg Completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Log List */}
      <div className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id} className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy – HH:mm') : 'Unknown date'}
                  </p>
                  <p className="font-medium text-sm">
                    {log.discipline} – {log.level}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColor(log.status) as any} className="text-xs">
                      {log.status}
                    </Badge>
                    {log.week_number && (
                      <span className="text-xs text-muted-foreground">Week {log.week_number}</span>
                    )}
                    {log.completion_percentage > 0 && (
                      <span className="text-xs text-muted-foreground">{log.completion_percentage}%</span>
                    )}
                  </div>
                </div>
                {log.status === 'in_progress' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/strength/workout/${log.id}/resume`)}
                  >
                    <Play className="mr-1 h-3 w-3" /> Resume
                  </Button>
                )}
              </div>
              {log.overall_notes && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{log.overall_notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
