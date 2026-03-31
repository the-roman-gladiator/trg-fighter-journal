import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFighterProfile } from '@/hooks/useFighterProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Zap } from 'lucide-react';
import { MapCanvas } from '@/components/pathway/MapCanvas';
import { PathwayPanel } from '@/components/pathway/PathwayPanel';
import { PathwayNode, PathwayEdge } from '@/components/pathway/FuturisticMap';

function radialLayout(cx: number, cy: number, items: string[], radius: number, start = 0) {
  const pos = new Map<string, { x: number; y: number }>();
  const n = items.length;
  if (n === 0) return pos;
  if (n === 1) { pos.set(items[0], { x: cx + radius, y: cy }); return pos; }
  items.forEach((id, i) => {
    const a = start + (i * Math.PI * 2) / n;
    pos.set(id, { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
  });
  return pos;
}

export default function FighterPathway() {
  const { user } = useAuth();
  const { isFighterApproved, loading: fpLoading } = useFighterProfile();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('fighter_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSessions(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isFighterApproved) loadSessions();
  }, [isFighterApproved, loadSessions]);

  // Build graph: Strategy → Tactics → Action
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, { label: string; type: string; count: number; sessions: any[] }>();
    const edgeMap = new Map<string, { source: string; target: string; weight: number }>();

    const ensureNode = (id: string, label: string, type: string, s: any) => {
      const existing = nodeMap.get(id);
      if (existing) { existing.count++; existing.sessions.push(s); }
      else nodeMap.set(id, { label, type, count: 1, sessions: [s] });
    };
    const ensureEdge = (src: string, tgt: string) => {
      if (!src || !tgt) return;
      const k = `${src}→${tgt}`;
      const ex = edgeMap.get(k);
      if (ex) ex.weight++; else edgeMap.set(k, { source: src, target: tgt, weight: 1 });
    };

    const rootId = 'root:fighter';
    nodeMap.set(rootId, { label: 'Fighter Core', type: 'root', count: sessions.length, sessions: [] });

    for (const s of sessions) {
      // Strategy nodes (truncated label)
      const stratLabel = s.strategy ? (s.strategy.length > 40 ? s.strategy.slice(0, 40) + '…' : s.strategy) : null;
      const stratId = s.strategy ? `strat:${s.strategy.slice(0, 60)}` : null;
      const tacticId = s.tactic ? `tactic:${s.tactic}` : null;
      const actionId = s.action ? `action:${s.id}` : null;

      if (stratId) { ensureNode(stratId, stratLabel!, 'strategy', s); ensureEdge(rootId, stratId); }
      if (tacticId) { ensureNode(tacticId, s.tactic, 'tactic', s); if (stratId) ensureEdge(stratId, tacticId); else ensureEdge(rootId, tacticId); }
      if (actionId) {
        const actionLabel = s.action.length > 50 ? s.action.slice(0, 50) + '…' : s.action;
        ensureNode(actionId, actionLabel, 'action', s);
        if (tacticId) ensureEdge(tacticId, actionId);
        else if (stratId) ensureEdge(stratId, actionId);
        else ensureEdge(rootId, actionId);
      }
    }

    // Layout
    const CX = 400, CY = 300;
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(rootId, { x: CX, y: CY });

    const stratIds = [...nodeMap.keys()].filter(k => k.startsWith('strat:'));
    radialLayout(CX, CY, stratIds, 160).forEach((p, id) => positions.set(id, p));

    const tacticIds = [...nodeMap.keys()].filter(k => k.startsWith('tactic:'));
    tacticIds.forEach(tid => {
      const parentEdge = [...edgeMap.values()].find(e => e.target === tid);
      const pp = parentEdge ? positions.get(parentEdge.source) || { x: CX, y: CY } : { x: CX, y: CY };
      const angle = Math.atan2(pp.y - CY, pp.x - CX) + (Math.random() - 0.5) * 0.8;
      positions.set(tid, { x: pp.x + Math.cos(angle) * 100, y: pp.y + Math.sin(angle) * 100 });
    });

    const actionIds = [...nodeMap.keys()].filter(k => k.startsWith('action:'));
    actionIds.forEach(aid => {
      const parentEdge = [...edgeMap.values()].find(e => e.target === aid);
      const pp = parentEdge ? positions.get(parentEdge.source) || { x: CX, y: CY } : { x: CX, y: CY };
      const angle = Math.atan2(pp.y - CY, pp.x - CX) + (Math.random() - 0.5) * 1.2;
      positions.set(aid, { x: pp.x + Math.cos(angle) * 80, y: pp.y + Math.sin(angle) * 80 });
    });

    const now = new Date().toISOString();
    const builtNodes: PathwayNode[] = [];
    nodeMap.forEach((data, id) => {
      const pos = positions.get(id) || { x: CX, y: CY };
      builtNodes.push({
        id, user_id: user?.id || '', title: data.label,
        description: `${data.count} session${data.count !== 1 ? 's' : ''}`,
        node_type: data.type, status: 'active', color_tag: null, icon: null,
        position_x: pos.x, position_y: pos.y, is_root: id === rootId,
        created_at: now, updated_at: now,
      });
    });

    let ei = 0;
    const builtEdges: PathwayEdge[] = [];
    edgeMap.forEach(d => {
      builtEdges.push({
        id: `edge-${ei++}`, user_id: user?.id || '',
        source_node_id: d.source, target_node_id: d.target,
        connection_type: 'auto', visual_strength: d.weight, created_at: now,
      });
    });

    return { nodes: builtNodes, edges: builtEdges };
  }, [sessions, user]);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  // Full pathway highlighting
  const pathwayNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>([selectedNodeId]);
    let frontier = [selectedNodeId];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const e of edges) {
          if (e.target_node_id === id && !ids.has(e.source_node_id)) { ids.add(e.source_node_id); next.push(e.source_node_id); }
          if (e.source_node_id === id && !ids.has(e.target_node_id)) { ids.add(e.target_node_id); next.push(e.target_node_id); }
        }
      }
      frontier = next;
    }
    return ids;
  }, [selectedNodeId, edges]);

  const childNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    const ids = edges.filter(e => e.source_node_id === selectedNodeId).map(e => e.target_node_id);
    return nodes.filter(n => ids.includes(n.id));
  }, [selectedNodeId, edges, nodes]);
  const parentNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const pe = edges.find(e => e.target_node_id === selectedNodeId);
    return pe ? nodes.find(n => n.id === pe.source_node_id) || null : null;
  }, [selectedNodeId, edges, nodes]);

  if (fpLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 animate-spin" style={{ borderTopColor: 'hsl(var(--primary))' }} />
      </div>
    );
  }

  if (!isFighterApproved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-destructive/50 mx-auto mb-4" />
          <p className="text-muted-foreground">This section is available for approved fighters only.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col overflow-hidden">
      <header className="border-b border-cyan-900/30 bg-[#0d0d18]/90 backdrop-blur-xl z-20 shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/fighter')} className="text-cyan-300/70 hover:text-cyan-200 hover:bg-cyan-500/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-cyan-50 tracking-wide">Fighter Pathway</h1>
              <p className="text-[11px] text-cyan-500/50">
                {nodes.length} nodes · {edges.length} connections · Strategy → Tactics → Action
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative">
          <MapCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            reconnectMode={false}
            onNodeClick={setSelectedNodeId}
            onNodeDrag={() => {}}
          />
          {sessions.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full border-2 border-cyan-500/20 flex items-center justify-center animate-pulse">
                  <Zap className="h-10 w-10 text-cyan-500/40" />
                </div>
                <h2 className="text-xl font-semibold text-cyan-100 mb-2">No Fighter Sessions Yet</h2>
                <p className="text-sm text-cyan-500/50 max-w-xs">Create fighter sessions with Strategy, Tactics, and Action to build your pathway.</p>
              </div>
            </div>
          )}
        </div>
        <PathwayPanel
          selectedNode={selectedNode}
          parentNode={parentNode}
          childNodes={childNodes}
          onSelectNode={setSelectedNodeId}
          reconnectMode={false}
          onClose={() => setSelectedNodeId(null)}
          sessions={sessions}
          pathwayNodeIds={pathwayNodeIds}
          allNodes={nodes}
        />
      </div>
    </div>
  );
}
