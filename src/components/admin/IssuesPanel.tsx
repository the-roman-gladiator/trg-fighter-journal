import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Trash2, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ErrRow {
  id: string;
  message: string;
  stack: string | null;
  route: string | null;
  level: string;
  source: string;
  user_id: string | null;
  user_agent: string | null;
  context: any;
  created_at: string;
}

export function IssuesPanel() {
  const [rows, setRows] = useState<ErrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    let q = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (level !== 'all') q = q.eq('level', level);
    const { data } = await q;
    setRows((data ?? []) as ErrRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  async function remove(id: string) {
    const { error } = await supabase.from('error_logs').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
      return;
    }
    toast.success('Resolved');
    setRows((r) => r.filter((x) => x.id !== id));
  }

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Issues ({rows.length})
          </CardTitle>
          <div className="flex gap-2">
            <Select value={level} onValueChange={(v) => setLevel(v as any)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={load}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No issues. 🎉</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((r) => {
              const open = expanded.has(r.id);
              return (
                <li key={r.id} className="py-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggle(r.id)}
                      className="mt-0.5 text-muted-foreground hover:text-foreground"
                    >
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-medium truncate">{r.message}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={r.level === 'error' ? 'destructive' : 'outline'}
                            className="text-[10px]"
                          >
                            {r.level}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {r.source}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => remove(r.id)}
                            title="Mark resolved (delete)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {r.route ?? '—'} · {format(new Date(r.created_at), 'MMM d, HH:mm')}
                      </p>
                      {open && (
                        <div className="mt-2 space-y-2 text-[11px]">
                          {r.stack && (
                            <pre className="bg-muted/50 p-2 rounded overflow-auto max-h-64 whitespace-pre-wrap break-all">
                              {r.stack}
                            </pre>
                          )}
                          {r.context && Object.keys(r.context).length > 0 && (
                            <pre className="bg-muted/50 p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(r.context, null, 2)}
                            </pre>
                          )}
                          {r.user_agent && (
                            <p className="text-muted-foreground break-all">UA: {r.user_agent}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
