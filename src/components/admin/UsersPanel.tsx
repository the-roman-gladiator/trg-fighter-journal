import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Shield, ShieldOff, UserCog, Ban, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Row {
  id: string;
  email: string;
  name: string;
  account_type: string;
  coach_level: string | null;
  approval_status: string | null;
  suspended: boolean;
  created_at: string;
  is_admin: boolean;
}

const TIERS = ['free', 'basic', 'pro', 'pro_coach'];

export function UsersPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'coach' | 'suspended'>('all');

  async function load() {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,email,name,account_type,coach_level,approval_status,suspended,created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('user_roles').select('user_id,role').eq('role', 'admin'),
    ]);
    const adminIds = new Set((rolesRes.data ?? []).map((r) => r.user_id));
    setRows(
      ((profilesRes.data ?? []) as any[]).map((p) => ({
        ...p,
        is_admin: adminIds.has(p.id),
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = rows.filter((r) => {
    if (q && !`${r.email} ${r.name}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'admin') return r.is_admin;
    if (filter === 'coach') return !!r.coach_level;
    if (filter === 'suspended') return r.suspended;
    return true;
  });

  async function toggleAdmin(row: Row) {
    const { data, error } = await supabase.rpc('admin_set_user_role', {
      _target: row.id,
      _role: 'admin',
      _grant: !row.is_admin,
    });
    if (error || !(data as any)?.success) {
      toast.error('Failed to update role');
      return;
    }
    toast.success(row.is_admin ? 'Admin removed' : 'Admin granted');
    void load();
  }

  async function toggleSuspend(row: Row) {
    const { data, error } = await supabase.rpc('admin_set_user_suspended', {
      _target: row.id,
      _suspended: !row.suspended,
    });
    if (error || !(data as any)?.success) {
      toast.error('Failed');
      return;
    }
    toast.success(row.suspended ? 'User reactivated' : 'User suspended');
    void load();
  }

  async function setTier(row: Row, tier: string) {
    const { data, error } = await supabase.rpc('admin_set_account_tier', {
      _target: row.id,
      _tier: tier,
    });
    if (error || !(data as any)?.success) {
      toast.error('Failed');
      return;
    }
    toast.success(`Tier set to ${tier}`);
    void load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">All Users ({rows.length})</CardTitle>
        <div className="flex gap-2 flex-wrap pt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search email or name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="coach">Coaches</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={load}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No users.</p>
        ) : (
          <ul className="divide-y divide-border/60 -mx-2">
            {filtered.map((r) => (
              <li key={r.id} className="px-2 py-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{r.name || 'Unnamed'}</span>
                      {r.is_admin && (
                        <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                          ADMIN
                        </Badge>
                      )}
                      {r.coach_level && (
                        <Badge variant="outline" className="text-[10px]">
                          {r.coach_level}
                        </Badge>
                      )}
                      {r.suspended && (
                        <Badge variant="destructive" className="text-[10px]">SUSPENDED</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Joined {format(new Date(r.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={r.account_type} onValueChange={(v) => setTier(r, v)}>
                      <SelectTrigger className="h-8 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIERS.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant={r.is_admin ? 'destructive' : 'outline'}
                      onClick={() => toggleAdmin(r)}
                    >
                      {r.is_admin ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                      <span className="ml-1 text-xs">{r.is_admin ? 'Revoke' : 'Make Admin'}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={r.suspended ? 'outline' : 'ghost'}
                      onClick={() => toggleSuspend(r)}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span className="ml-1 text-xs">{r.suspended ? 'Unsuspend' : 'Suspend'}</span>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
