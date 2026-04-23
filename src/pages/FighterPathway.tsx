import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFighterProfile } from '@/hooks/useFighterProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Zap, ZoomIn, ZoomOut, Crosshair, Move } from 'lucide-react';
import { MapCanvas, MapCanvasHandle } from '@/components/pathway/MapCanvas';
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
  const mapRef = useRef<MapCanvasHandle>(null);

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

    // --- Layered horizontal layout (top → bottom) ---
    const WIDTH = 800;
    const CENTER_X = WIDTH / 2;
    const layerY: Record<string, number> = {
      root: 0,
      strategy: 70,
      tactic: 220,
      action: 380,
    };

    const positions = new Map<string, { x: number; y: number }>();
    positions.set(rootId, { x: CENTER_X, y: layerY.root });

    const layerGroups: Array<{ prefix: string; type: keyof typeof layerY }> = [
      { prefix: 'strat:', type: 'strategy' },
      { prefix: 'tactic:', type: 'tactic' },
      { prefix: 'action:', type: 'action' },
    ];

    layerGroups.forEach(({ prefix, type }) => {
      const items = [...nodeMap.keys()].filter(k => k.startsWith(prefix));
      if (items.length === 0) return;
      const spacing = Math.max(WIDTH / (items.length + 1), 110);
      const totalWidth = spacing * (items.length - 1);
      const startX = CENTER_X - totalWidth / 2;
      items.forEach((id, i) => {
        positions.set(id, { x: startX + i * spacing, y: layerY[type] });
      });
    });

    const now = new Date().toISOString();
    const builtNodes: PathwayNode[] = [];
    nodeMap.forEach((data, id) => {
      const pos = positions.get(id) || { x: 400, y: 200 };
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
            ref={mapRef}
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            reconnectMode={false}
            onNodeClick={setSelectedNodeId}
            onNodeDrag={() => {}}
          />

          {/* Map Controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
            <button onClick={() => mapRef.current?.zoomIn()} className="w-9 h-9 rounded-lg bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card transition-colors shadow-lg" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
            <button onClick={() => mapRef.current?.zoomOut()} className="w-9 h-9 rounded-lg bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card transition-colors shadow-lg" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
            <button onClick={() => mapRef.current?.recenter()} className="w-9 h-9 rounded-lg bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card transition-colors shadow-lg" aria-label="Recenter"><Crosshair className="h-4 w-4" /></button>
          </div>

          {/* Pan Controls */}
          <div className="absolute bottom-4 left-3 z-10 grid grid-cols-3 gap-0.5 w-[4.5rem]">
            <div />
            <button onClick={() => mapRef.current?.panBy(0, -120)} className="w-6 h-6 rounded bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card shadow" aria-label="Pan up"><Move className="h-3 w-3" style={{ transform: 'rotate(-90deg)' }} /></button>
            <div />
            <button onClick={() => mapRef.current?.panBy(-120, 0)} className="w-6 h-6 rounded bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card shadow" aria-label="Pan left"><Move className="h-3 w-3" style={{ transform: 'rotate(180deg)' }} /></button>
            <div className="w-6 h-6" />
            <button onClick={() => mapRef.current?.panBy(120, 0)} className="w-6 h-6 rounded bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card shadow" aria-label="Pan right"><Move className="h-3 w-3" /></button>
            <div />
            <button onClick={() => mapRef.current?.panBy(0, 120)} className="w-6 h-6 rounded bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card shadow" aria-label="Pan down"><Move className="h-3 w-3" style={{ transform: 'rotate(90deg)' }} /></button>
            <div />
          </div>
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
