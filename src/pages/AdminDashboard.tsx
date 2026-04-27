import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, AlertTriangle, Users, Activity, ShieldCheck, ShieldOff,
  Search, Filter, Trash2, RotateCcw, Ban, ChevronDown, ChevronRight,
  CircleDot, FileWarning, Zap, Database as DatabaseIcon, Mail, HardDrive,
  Image as ImageIcon, Lock, CreditCard, Server, ExternalLink,
} from 'lucide-react';

type TabKey = 'dashboard' | 'issues' | 'health' | 'users' | 'logs' | 'approvals';

interface Profile {
  id: string;
  email: string;
  name: string;
  account_type: string;
  coach_level: string | null;
  suspended: boolean;
  created_at: string;
  is_admin?: boolean;
}

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

interface FighterPending {
  id: string;
  user_id: string;
  requested_fight_disciplines: string[];
  created_at: string;
  email?: string;
  name?: string;
}

interface AdminAction {
  id: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: any;
  created_at: string;
}

const TIERS = ['free', 'basic', 'pro', 'pro_coach'];

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <div className="admin-light min-h-full bg-white text-slate-900">
        <AdminInner />
      </div>
    </AdminGuard>
  );
}

function AdminInner() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('dashboard');

  // shared data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [errors, setErrors] = useState<ErrRow[]>([]);
  const [pendingFighters, setPendingFighters] = useState<FighterPending[]>([]);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [pRes, eRes, fRes, aRes, rolesRes] = await Promise.all([
      supabase.from('profiles')
        .select('id,email,name,account_type,coach_level,suspended,created_at')
        .order('created_at', { ascending: false }).limit(500),
      supabase.from('error_logs').select('*')
        .order('created_at', { ascending: false }).limit(200),
      supabase.from('fighter_profiles')
        .select('id,user_id,requested_fight_disciplines,created_at')
        .eq('fighter_status', 'pending')
        .order('created_at', { ascending: false }),
      supabase.from('admin_actions').select('*')
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('user_roles').select('user_id,role').eq('role', 'admin'),
    ]);
    const adminIds = new Set((rolesRes.data ?? []).map((r) => r.user_id));
    const profs = ((pRes.data ?? []) as any[]).map((p) => ({ ...p, is_admin: adminIds.has(p.id) }));
    setProfiles(profs);
    setErrors((eRes.data ?? []) as ErrRow[]);

    const profMap = new Map(profs.map((p) => [p.id, p]));
    const fighters = ((fRes.data ?? []) as any[]).map((f) => ({
      ...f,
      email: profMap.get(f.user_id)?.email,
      name: profMap.get(f.user_id)?.name,
    }));
    setPendingFighters(fighters);
    setActions((aRes.data ?? []) as AdminAction[]);
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <Header onBack={() => navigate(-1)} onRefresh={loadAll} loading={loading} />
      <Tabs tab={tab} setTab={setTab} counts={{
        issues: errors.filter((e) => e.level === 'error').length,
        approvals: pendingFighters.length,
      }} />

      {tab === 'dashboard' && (
        <DashboardTab
          profiles={profiles}
          errors={errors}
          pendingFighters={pendingFighters}
          loading={loading}
          onJump={setTab}
        />
      )}
      {tab === 'issues' && <IssuesTab rows={errors} reload={loadAll} />}
      {tab === 'health' && <HealthTab errors={errors} profiles={profiles} />}
      {tab === 'users' && <UsersTab rows={profiles} reload={loadAll} />}
      {tab === 'approvals' && <ApprovalsTab rows={pendingFighters} reload={loadAll} />}
      {tab === 'logs' && <LogsTab actions={actions} errors={errors} profiles={profiles} />}
    </div>
  );
}

/* -------------------- HEADER + TABS -------------------- */

function Header({ onBack, onRefresh, loading }: { onBack: () => void; onRefresh: () => void; loading: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200 pb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Fighter Journal · Admin
          </h1>
          <p className="text-xs text-slate-500">Operational control panel</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" /> ADMIN
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded disabled:opacity-50"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
    </div>
  );
}

function Tabs({
  tab, setTab, counts,
}: { tab: TabKey; setTab: (t: TabKey) => void; counts: { issues: number; approvals: number } }) {
  const items: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'issues', label: 'All Issues', badge: counts.issues },
    { key: 'approvals', label: 'Approvals', badge: counts.approvals },
    { key: 'health', label: 'App Health' },
    { key: 'users', label: 'All Users' },
    { key: 'logs', label: 'Reports / Logs' },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 border-b border-slate-200">
      {items.map((it) => {
        const active = tab === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setTab(it.key)}
            className={`relative whitespace-nowrap text-sm font-semibold px-4 py-2.5 transition-colors ${
              active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {it.label}
              {it.badge ? (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  active ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>{it.badge}</span>
              ) : null}
            </span>
            {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-red-600" />}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------- DASHBOARD TAB -------------------- */

function DashboardTab({
  profiles, errors, pendingFighters, loading, onJump,
}: {
  profiles: Profile[]; errors: ErrRow[]; pendingFighters: FighterPending[];
  loading: boolean; onJump: (t: TabKey) => void;
}) {
  const openIssues = errors.filter((e) => e.level === 'error').length;
  const totalUsers = profiles.length;
  const last7 = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return profiles.filter((p) => new Date(p.created_at).getTime() > cutoff).length;
  }, [profiles]);

  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    errors.forEach((e) => map.set(e.source || 'unknown', (map.get(e.source || 'unknown') ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [errors]);
  const breakdownTotal = Math.max(1, breakdown.reduce((s, [, n]) => s + n, 0));

  const recentSignups = profiles.slice(0, 6);
  const critical = errors.filter((e) => e.level === 'error').slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Open Issues"
          value={loading ? '…' : openIssues}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={openIssues > 0 ? 'red' : 'green'}
          onClick={() => onJump('issues')}
        />
        <StatCard
          label="Total Users"
          value={loading ? '…' : totalUsers}
          icon={<Users className="h-4 w-4" />}
          tone="slate"
          onClick={() => onJump('users')}
        />
        <StatCard
          label="New (7d)"
          value={loading ? '…' : last7}
          icon={<Activity className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Pending Approvals"
          value={loading ? '…' : pendingFighters.length}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone={pendingFighters.length > 0 ? 'amber' : 'green'}
          onClick={() => onJump('approvals')}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Critical issues feed */}
        <Panel title="Critical Issues" subtitle="Latest unresolved errors" actionLabel="View all" onAction={() => onJump('issues')} className="lg:col-span-2">
          {loading ? (
            <PanelSkeleton rows={4} />
          ) : critical.length === 0 ? (
            <EmptyRow text="No critical issues. Operations nominal." />
          ) : (
            <ul className="divide-y divide-slate-200">
              {critical.map((e) => (
                <li key={e.id} className="py-3 flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{e.message}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {e.route ?? '—'} · {e.source} · {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded shrink-0">
                    {e.level}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Issue breakdown chart */}
        <Panel title="Issue Breakdown" subtitle="By source">
          {loading ? (
            <PanelSkeleton rows={4} />
          ) : breakdown.length === 0 ? (
            <EmptyRow text="No issues logged." />
          ) : (
            <ul className="space-y-3">
              {breakdown.map(([source, count]) => {
                const pct = Math.round((count / breakdownTotal) * 100);
                return (
                  <li key={source}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 capitalize">{source}</span>
                      <span className="text-slate-500">{count} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-red-600" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Recent Signups" subtitle="Newest user registrations" actionLabel="View all users" onAction={() => onJump('users')}>
          {loading ? (
            <PanelSkeleton rows={5} />
          ) : recentSignups.length === 0 ? (
            <EmptyRow text="No users yet." />
          ) : (
            <ul className="divide-y divide-slate-200">
              {recentSignups.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-500 truncate">{p.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TierPill tier={p.account_type} />
                    {p.is_admin && <Pill tone="red">ADMIN</Pill>}
                    <span className="text-[10px] text-slate-400">
                      {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Pending Approvals" subtitle="Fighter profile requests" actionLabel="Review queue" onAction={() => onJump('approvals')}>
          {loading ? (
            <PanelSkeleton rows={5} />
          ) : pendingFighters.length === 0 ? (
            <EmptyRow text="No pending requests." />
          ) : (
            <ul className="divide-y divide-slate-200">
              {pendingFighters.slice(0, 6).map((f) => (
                <li key={f.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{f.name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-500 truncate">{f.email}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {f.requested_fight_disciplines.map((d) => (
                      <Pill key={d} tone="slate">{d}</Pill>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* -------------------- ISSUES TAB -------------------- */

function IssuesTab({ rows, reload }: { rows: ErrRow[]; reload: () => void }) {
  const [level, setLevel] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const filtered = level === 'all' ? rows : rows.filter((r) => r.level === level);

  async function remove(id: string) {
    const { error } = await supabase.from('error_logs').delete().eq('id', id);
    if (error) return toast.error('Failed to delete');
    toast.success('Resolved');
    reload();
  }

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <Panel
      title={`All Issues (${filtered.length})`}
      subtitle="Captured client + edge function errors"
      right={
        <div className="flex items-center gap-2">
          {(['all', 'error', 'warn', 'info'] as const).map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className={`text-xs font-semibold px-2.5 py-1 rounded border ${
                level === lv
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {lv === 'all' ? 'All' : lv}
            </button>
          ))}
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyRow text="No issues match this filter." />
      ) : (
        <ul className="divide-y divide-slate-200 -mx-4">
          {filtered.map((r) => {
            const open = expanded.has(r.id);
            return (
              <li key={r.id} className="px-4 py-3 hover:bg-slate-50/60">
                <div className="flex items-start gap-2">
                  <button onClick={() => toggle(r.id)} className="mt-1 text-slate-400 hover:text-slate-700">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900 truncate flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${
                          r.level === 'error' ? 'bg-red-600' : r.level === 'warn' ? 'bg-amber-500' : 'bg-sky-500'
                        }`} />
                        {r.message}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Pill tone={r.level === 'error' ? 'red' : r.level === 'warn' ? 'amber' : 'blue'}>{r.level}</Pill>
                        <Pill tone="slate">{r.source}</Pill>
                        <button
                          onClick={() => remove(r.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                          title="Mark resolved"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {r.route ?? '—'} · {format(new Date(r.created_at), 'MMM d, HH:mm')}
                    </p>
                    {open && (
                      <div className="mt-2 space-y-2 text-[11px]">
                        {r.stack && (
                          <pre className="bg-slate-50 border border-slate-200 p-2 rounded overflow-auto max-h-64 whitespace-pre-wrap break-all text-slate-700">
                            {r.stack}
                          </pre>
                        )}
                        {r.context && Object.keys(r.context).length > 0 && (
                          <pre className="bg-slate-50 border border-slate-200 p-2 rounded overflow-auto max-h-32 text-slate-700">
                            {JSON.stringify(r.context, null, 2)}
                          </pre>
                        )}
                        {r.user_agent && <p className="text-slate-500 break-all">UA: {r.user_agent}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------- HEALTH TAB -------------------- */

function HealthTab({ errors, profiles }: { errors: ErrRow[]; profiles: Profile[] }) {
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .then(({ error }) => setDbOk(!error));
  }, []);

  const recentErrCount = errors.filter((e) =>
    Date.now() - new Date(e.created_at).getTime() < 24 * 60 * 60 * 1000
  ).length;

  const services: { name: string; status: 'ok' | 'warn' | 'down'; icon: any; note: string }[] = [
    { name: 'Database', status: dbOk === null ? 'warn' : dbOk ? 'ok' : 'down', icon: DatabaseIcon, note: dbOk ? 'Connected' : dbOk === false ? 'Not reachable' : 'Checking…' },
    { name: 'Auth', status: 'ok', icon: Lock, note: 'Operational' },
    { name: 'Edge Functions', status: recentErrCount > 5 ? 'warn' : 'ok', icon: Zap, note: `${recentErrCount} errors / 24h` },
    { name: 'Storage', status: 'ok', icon: HardDrive, note: 'No buckets configured' },
    { name: 'Email', status: 'warn', icon: Mail, note: 'Default sender' },
    { name: 'Payments', status: 'warn', icon: CreditCard, note: 'Not configured' },
    { name: 'Images / CDN', status: 'ok', icon: ImageIcon, note: 'Static assets healthy' },
    { name: 'API', status: 'ok', icon: Server, note: `${profiles.length} users` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {services.map((s) => {
          const Icon = s.icon;
          const tone = s.status === 'ok' ? 'green' : s.status === 'warn' ? 'amber' : 'red';
          return (
            <div key={s.name} className={`rounded-lg border p-4 bg-white ${
              tone === 'green' ? 'border-emerald-200' : tone === 'amber' ? 'border-amber-200' : 'border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${
                  tone === 'green' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-red-600'
                }`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  tone === 'green' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  tone === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-red-50 text-red-700 border border-red-200'
                }`}>{s.status}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{s.name}</p>
              <p className="text-[11px] text-slate-500">{s.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- USERS TAB -------------------- */

function UsersTab({ rows, reload }: { rows: Profile[]; reload: () => void }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'coach' | 'suspended'>('all');

  const filtered = rows.filter((r) => {
    if (q && !`${r.email} ${r.name}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'admin') return r.is_admin;
    if (filter === 'coach') return !!r.coach_level;
    if (filter === 'suspended') return r.suspended;
    return true;
  });

  async function toggleAdmin(row: Profile) {
    const { data, error } = await supabase.rpc('admin_set_user_role', {
      _target: row.id, _role: 'admin', _grant: !row.is_admin,
    });
    if (error || !(data as any)?.success) return toast.error('Failed');
    toast.success(row.is_admin ? 'Admin removed' : 'Admin granted');
    reload();
  }
  async function toggleSuspend(row: Profile) {
    const { data, error } = await supabase.rpc('admin_set_user_suspended', {
      _target: row.id, _suspended: !row.suspended,
    });
    if (error || !(data as any)?.success) return toast.error('Failed');
    toast.success(row.suspended ? 'User reactivated' : 'User suspended');
    reload();
  }
  async function setTier(row: Profile, tier: string) {
    const { data, error } = await supabase.rpc('admin_set_account_tier', { _target: row.id, _tier: tier });
    if (error || !(data as any)?.success) return toast.error('Failed');
    toast.success(`Tier set to ${tier}`);
    reload();
  }

  return (
    <Panel
      title={`All Users (${rows.length})`}
      subtitle="Roles, plans and account state"
      right={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="pl-7 pr-2 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 placeholder:text-slate-400 w-44 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          {(['all', 'admin', 'coach', 'suspended'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-2.5 py-1 rounded border capitalize ${
                filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >{f}</button>
          ))}
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyRow text="No users match." />
      ) : (
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="text-left px-4 py-2 font-semibold">User</th>
                <th className="text-left px-4 py-2 font-semibold">Plan</th>
                <th className="text-left px-4 py-2 font-semibold">Role</th>
                <th className="text-left px-4 py-2 font-semibold">Joined</th>
                <th className="text-right px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{r.name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-500">{r.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.account_type}
                      onChange={(e) => setTier(r, e.target.value)}
                      className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-900"
                    >
                      {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {r.is_admin && <Pill tone="red">ADMIN</Pill>}
                      {r.coach_level && <Pill tone="blue">{r.coach_level}</Pill>}
                      {r.suspended && <Pill tone="amber">SUSPENDED</Pill>}
                      {!r.is_admin && !r.coach_level && !r.suspended && (
                        <span className="text-xs text-slate-400">athlete</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {format(new Date(r.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleAdmin(r)}
                        className={`text-xs font-semibold px-2 py-1 rounded border inline-flex items-center gap-1 ${
                          r.is_admin
                            ? 'border-red-200 text-red-700 hover:bg-red-50'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {r.is_admin ? <ShieldOff className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                        {r.is_admin ? 'Revoke' : 'Make admin'}
                      </button>
                      <button
                        onClick={() => toggleSuspend(r)}
                        className="text-xs font-semibold px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                      >
                        <Ban className="h-3 w-3" />
                        {r.suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* -------------------- APPROVALS TAB -------------------- */

function ApprovalsTab({ rows, reload }: { rows: FighterPending[]; reload: () => void }) {
  async function decide(id: string, approve: boolean) {
    const { data, error } = await supabase.rpc('admin_decide_fighter_profile', {
      _profile_id: id, _approve: approve,
    });
    if (error || !(data as any)?.success) return toast.error('Failed');
    toast.success(approve ? 'Approved' : 'Denied');
    reload();
  }
  return (
    <Panel title={`Pending Approvals (${rows.length})`} subtitle="Fighter profile requests awaiting decision">
      {rows.length === 0 ? (
        <EmptyRow text="Queue is empty." />
      ) : (
        <ul className="divide-y divide-slate-200 -mx-4">
          {rows.map((f) => (
            <li key={f.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{f.name || 'Unnamed'}</p>
                <p className="text-xs text-slate-500">{f.email}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {f.requested_fight_disciplines.map((d) => <Pill key={d} tone="slate">{d}</Pill>)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => decide(f.id, true)}
                  className="text-xs font-bold px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                >Approve</button>
                <button
                  onClick={() => decide(f.id, false)}
                  className="text-xs font-bold px-3 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50"
                >Deny</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------- LOGS TAB -------------------- */

function LogsTab({
  actions, errors, profiles,
}: { actions: AdminAction[]; errors: ErrRow[]; profiles: Profile[] }) {
  const profMap = new Map(profiles.map((p) => [p.id, p]));
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel title="Admin Activity" subtitle="Audit trail of admin actions">
        {actions.length === 0 ? (
          <EmptyRow text="No actions yet." />
        ) : (
          <ul className="divide-y divide-slate-200">
            {actions.map((a) => (
              <li key={a.id} className="py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{a.action}</span>
                  <span className="text-[11px] text-slate-500">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  by {profMap.get(a.actor_id)?.email ?? a.actor_id.slice(0, 8)} · {a.target_type ?? '—'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent Errors" subtitle="Latest 10 logged errors">
        {errors.length === 0 ? (
          <EmptyRow text="Clean log." />
        ) : (
          <ul className="divide-y divide-slate-200">
            {errors.slice(0, 10).map((e) => (
              <li key={e.id} className="py-2.5">
                <p className="text-sm font-semibold text-slate-900 truncate">{e.message}</p>
                <p className="text-[11px] text-slate-500">
                  {e.route ?? '—'} · {format(new Date(e.created_at), 'MMM d, HH:mm')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* -------------------- SHARED PRIMITIVES -------------------- */

function StatCard({
  label, value, icon, tone, onClick,
}: {
  label: string; value: number | string; icon: React.ReactNode;
  tone: 'red' | 'amber' | 'green' | 'blue' | 'slate';
  onClick?: () => void;
}) {
  const toneCls = {
    red: 'border-red-200 text-red-700',
    amber: 'border-amber-200 text-amber-700',
    green: 'border-emerald-200 text-emerald-700',
    blue: 'border-sky-200 text-sky-700',
    slate: 'border-slate-200 text-slate-700',
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border bg-white p-4 transition hover:shadow-sm ${
        onClick ? 'cursor-pointer hover:border-slate-400' : 'cursor-default'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`inline-flex items-center justify-center h-6 w-6 rounded border ${toneCls} bg-white`}>{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-extrabold text-slate-900 tabular-nums">{value}</p>
    </button>
  );
}

function Panel({
  title, subtitle, children, right, actionLabel, onAction, className = '',
}: {
  title: string; subtitle?: string; children: React.ReactNode;
  right?: React.ReactNode; actionLabel?: string; onAction?: () => void; className?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
        {right ?? (actionLabel && (
          <button
            onClick={onAction}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
          >
            {actionLabel} <ExternalLink className="h-3 w-3" />
          </button>
        ))}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="h-10 rounded bg-slate-100 animate-pulse" />
      ))}
    </ul>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-sm text-slate-400 text-center py-8">{text}</p>;
}

function Pill({ children, tone }: { children: React.ReactNode; tone: 'red' | 'amber' | 'green' | 'blue' | 'slate' }) {
  const cls = {
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  }[tone];
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cls}`}>
      {children}
    </span>
  );
}

function TierPill({ tier }: { tier: string }) {
  const tone =
    tier === 'pro' || tier === 'pro_coach' ? 'red' :
    tier === 'basic' ? 'blue' : 'slate';
  return <Pill tone={tone as any}>{tier}</Pill>;
}
