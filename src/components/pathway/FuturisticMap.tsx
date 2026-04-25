import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, GitBranch, ZoomIn, ZoomOut, Move, Crosshair } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { MapCanvas, MapCanvasHandle } from './MapCanvas';
import { PathwayPanel } from './PathwayPanel';

export interface PathwayNode {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  node_type: string;
  status: string;
  color_tag: string | null;
  icon: string | null;
  position_x: number;
  position_y: number;
  is_root: boolean;
  created_at: string;
  updated_at: string;
}

export interface PathwayEdge {
  id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  connection_type: string;
  visual_strength: number;
  created_at: string;
}

interface FuturisticMapProps {
  onBack: () => void;
  initialSessionId?: string | null;
}

// Layout helpers
function radialLayout(
  centerX: number,
  centerY: number,
  items: string[],
  radius: number,
  startAngle: number = 0
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const count = items.length;
  if (count === 0) return positions;
  if (count === 1) {
    positions.set(items[0], { x: centerX + radius, y: centerY });
    return positions;
  }
  const angleStep = (Math.PI * 2) / count;
  items.forEach((id, i) => {
    const angle = startAngle + i * angleStep;
    positions.set(id, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  });
  return positions;
}

const ROOT_ID = 'root:training';

export function FuturisticMap({ onBack, initialSessionId }: FuturisticMapProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [chainsOpen, setChainsOpen] = useState(false);
  const isMobile = useIsMobile();
  const mapRef = useRef<MapCanvasHandle>(null);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .order('date', { ascending: false });
    setSessions(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Auto-generate graph from sessions
  const { nodes, edges, sessionIndex } = useMemo(() => {
    const nodeMap = new Map<string, {
      label: string;
      type: string;
      count: number;
      sessionIds: Set<string>;
    }>();

    const edgeMap = new Map<string, {
      source: string;
      target: string;
      weight: number;
      sessionIds: Set<string>;
    }>();

    // sessionId → ordered array of node IDs for that session
    const sessionIndex = new Map<string, string[]>();

    const rootId = ROOT_ID;

    const ensureNode = (id: string, label: string, type: string, sessionId: string) => {
      const existing = nodeMap.get(id);
      if (existing) {
        existing.count++;
        existing.sessionIds.add(sessionId);
      } else {
        nodeMap.set(id, { label, type, count: 1, sessionIds: new Set([sessionId]) });
      }
    };

    const ensureEdge = (sourceId: string, targetId: string, sessionId: string) => {
      if (!sourceId || !targetId) return;
      const key = `${sourceId}→${targetId}`;
      const existing = edgeMap.get(key);
      if (existing) {
        existing.weight++;
        existing.sessionIds.add(sessionId);
      } else {
        edgeMap.set(key, { source: sourceId, target: targetId, weight: 1, sessionIds: new Set([sessionId]) });
      }
    };

    // Root node
    nodeMap.set(rootId, {
      label: 'My Training',
      type: 'root',
      count: sessions.length,
      sessionIds: new Set(),
    });

    for (const s of sessions) {
      const sid = s.id;

      // Multi-discipline support: check disciplines array first, fall back to discipline string
      const disciplineList: string[] = (
        Array.isArray(s.disciplines) && s.disciplines.length > 0
          ? s.disciplines
          : s.discipline
            ? [s.discipline]
            : []
      );

      // Labels from DB columns
      const tacticLabel: string | null = s.strategy || null;       // DB column: strategy (displayed as Tactic)
      const techLabel: string | null   = s.technique || null;
      const m1Label: string | null     = s.first_movement || null; // 1st Movement: How did you start?
      const m2Label: string | null     = s.opponent_action || null;// 2nd Movement: Opponent reaction
      const m3Label: string | null     = s.second_movement || null;// 3rd Movement: What did I capitalize with?

      // Discipline nodes are GLOBAL (shared across sessions — disciplines are categories)
      // Tactic, Technique, and all movements are SESSION-SCOPED to prevent ghost connections
      const tacticId = tacticLabel ? `strat:${sid}:${tacticLabel}` : null;
      const techId   = techLabel   ? `tech:${sid}:${techLabel}`    : null;
      const m1Id     = m1Label     ? `move:${sid}:${m1Label}`      : null;
      const m2Id     = m2Label     ? `react:${sid}:${m2Label}`     : null;
      const m3Id     = m3Label     ? `follow:${sid}:${m3Label}`    : null;

      // Build this session's ordered chain for pathway highlighting
      const sessionChain: string[] = [rootId];

      // Discipline nodes — one per discipline in this session
      const discIds: string[] = [];
      for (const disc of disciplineList) {
        const discId = `disc:${disc}`;
        ensureNode(discId, disc, 'discipline', sid);
        ensureEdge(rootId, discId, sid);
        discIds.push(discId);
        sessionChain.push(discId);
      }

      // Tactic (DB: strategy) — session-scoped
      if (tacticId && tacticLabel) {
        ensureNode(tacticId, tacticLabel, 'tactic', sid);
        if (discIds.length > 0) {
          for (const discId of discIds) ensureEdge(discId, tacticId, sid);
        } else {
          ensureEdge(rootId, tacticId, sid);
        }
        sessionChain.push(tacticId);
      }

      // Technique — session-scoped
      if (techId && techLabel) {
        ensureNode(techId, techLabel, 'technique', sid);
        if (tacticId)            ensureEdge(tacticId, techId, sid);
        else if (discIds[0])     ensureEdge(discIds[0], techId, sid);
        else                     ensureEdge(rootId, techId, sid);
        sessionChain.push(techId);
      }

      // 1st Movement: How did you start? — session-scoped
      if (m1Id && m1Label) {
        ensureNode(m1Id, m1Label, 'movement1', sid);
        if (techId)          ensureEdge(techId, m1Id, sid);
        else if (tacticId)   ensureEdge(tacticId, m1Id, sid);
        else if (discIds[0]) ensureEdge(discIds[0], m1Id, sid);
        sessionChain.push(m1Id);
      }

      // 2nd Movement: Opponent reaction — session-scoped
      if (m2Id && m2Label) {
        ensureNode(m2Id, m2Label, 'movement2', sid);
        if (m1Id) ensureEdge(m1Id, m2Id, sid);
        else if (techId) ensureEdge(techId, m2Id, sid);
        sessionChain.push(m2Id);
      }

      // 3rd Movement: What did I capitalize with? — session-scoped
      if (m3Id && m3Label) {
        ensureNode(m3Id, m3Label, 'movement3', sid);
        if (m2Id) ensureEdge(m2Id, m3Id, sid);
        else if (m1Id) ensureEdge(m1Id, m3Id, sid);
        sessionChain.push(m3Id);
      }

      sessionIndex.set(sid, sessionChain);
    }

    // Layered horizontal layout — same visual structure as before
    const WIDTH = 800;
    const CENTER_X = WIDTH / 2;
    const layerY: Record<string, number> = {
      root:       0,
      discipline: 70,
      tactic:     190,
      technique:  320,
      movement1:  440,
      movement2:  540,
      movement3:  640,
    };

    const positions = new Map<string, { x: number; y: number }>();
    positions.set(rootId, { x: CENTER_X, y: layerY.root });

    const layerGroups: Array<{ prefix: string; type: string }> = [
      { prefix: 'disc:',   type: 'discipline' },
      { prefix: 'strat:',  type: 'tactic'     },
      { prefix: 'tech:',   type: 'technique'  },
      { prefix: 'move:',   type: 'movement1'  },
      { prefix: 'react:',  type: 'movement2'  },
      { prefix: 'follow:', type: 'movement3'  },
    ];

    layerGroups.forEach(({ prefix, type }) => {
      const items = [...nodeMap.keys()].filter(k => k.startsWith(prefix));
      if (items.length === 0) return;
      const spacing = Math.max(WIDTH / (items.length + 1), 90);
      const totalWidth = spacing * (items.length - 1);
      const startX = CENTER_X - totalWidth / 2;
      items.forEach((id, i) => {
        positions.set(id, { x: startX + i * spacing, y: layerY[type] || 400 });
      });
    });

    const now = new Date().toISOString();
    const builtNodes: PathwayNode[] = [];
    nodeMap.forEach((data, id) => {
      const pos = positions.get(id) || { x: CENTER_X, y: 300 };
      builtNodes.push({
        id,
        user_id: user?.id || '',
        title: data.label,
        description: `${data.count} session${data.count !== 1 ? 's' : ''} recorded`,
        node_type: data.type,
        status: 'active',
        color_tag: null,
        icon: null,
        position_x: pos.x,
        position_y: pos.y,
        is_root: id === rootId,
        created_at: now,
        updated_at: now,
      });
    });

    const builtEdges: PathwayEdge[] = [];
    let edgeIdx = 0;
    edgeMap.forEach((data) => {
      builtEdges.push({
        id: `edge-${edgeIdx++}`,
        user_id: user?.id || '',
        source_node_id: data.source,
        target_node_id: data.target,
        connection_type: 'auto',
        visual_strength: data.weight,
        created_at: now,
      });
    });

    return { nodes: builtNodes, edges: builtEdges, sessionIndex };
  }, [sessions, user]);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  // Compute full pathway for highlighting — session-scoped
  const pathwayNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();

    const selNode = nodes.find(n => n.id === selectedNodeId);

    // Root node selected → highlight everything
    if (selNode?.is_root) return new Set(nodes.map(n => n.id));

    // Find all sessions whose chain contains the selected node
    const matchingSessions = new Set<string>();
    sessionIndex.forEach((chain, sid) => {
      if (chain.includes(selectedNodeId)) matchingSessions.add(sid);
    });

    // Collect every node ID from all matching sessions
    const ids = new Set<string>([ROOT_ID, selectedNodeId]);
    matchingSessions.forEach(sid => {
      const chain = sessionIndex.get(sid) || [];
      chain.forEach(nodeId => ids.add(nodeId));
    });

    return ids;
  }, [selectedNodeId, nodes, sessionIndex]);

  const childNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    const childIds = edges.filter(e => e.source_node_id === selectedNodeId).map(e => e.target_node_id);
    return nodes.filter(n => childIds.includes(n.id));
  }, [selectedNodeId, edges, nodes]);

  const parentNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const parentEdge = edges.find(e => e.target_node_id === selectedNodeId);
    if (!parentEdge) return null;
    return nodes.find(n => n.id === parentEdge.source_node_id) || null;
  }, [selectedNodeId, edges, nodes]);

  useEffect(() => {
    if (!initialSessionId || nodes.length === 0) return;
    const session = sessions.find(s => s.id === initialSessionId);
    if (!session) return;
    const sid = session.id;
    const candidateIds = [
      session.second_movement ? `follow:${sid}:${session.second_movement}` : null,
      session.opponent_action ? `react:${sid}:${session.opponent_action}`  : null,
      session.first_movement  ? `move:${sid}:${session.first_movement}`    : null,
      session.technique       ? `tech:${sid}:${session.technique}`         : null,
      session.strategy        ? `strat:${sid}:${session.strategy}`         : null,
      session.discipline      ? `disc:${session.discipline}`               : null,
    ].filter(Boolean) as string[];
    const bestNodeId = candidateIds.find(id => nodes.some(n => n.id === id)) || null;
    if (bestNodeId) setSelectedNodeId(bestNodeId);
  }, [initialSessionId, sessions, nodes]);

  // Highlight node from ?highlight=<title> search param (from session card click on /records)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const highlight = searchParams.get('highlight');
    if (!highlight || nodes.length === 0) return;
    const target = highlight.toLowerCase().trim();
    const match = nodes.find(n => n.title.toLowerCase() === target)
      || nodes.find(n => n.title.toLowerCase().includes(target));
    if (match) setSelectedNodeId(match.id);
  }, [searchParams, nodes]);

  const handleCanvasClick = (nodeId: string | null) => {
    if (!nodeId) { setSelectedNodeId(null); return; }
    // Toggle off if same node clicked again (works for root and others)
    setSelectedNodeId(prev => (prev === nodeId ? null : nodeId));
  };

  // No-op for auto-generated map (positions are computed, not persisted)
  const handleNodeDrag = () => {};

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 animate-spin" style={{ borderTopColor: 'hsl(var(--primary))' }} />
          <div className="absolute inset-2 rounded-full border border-cyan-400/20 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-cyan-900/30 bg-[#0d0d18]/90 backdrop-blur-xl z-20 shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-cyan-300/70 hover:text-cyan-200 hover:bg-cyan-500/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-cyan-50 tracking-wide">Neural Pathway</h1>
              <p className="text-[11px] text-cyan-500/50">
                {nodes.length} node{nodes.length !== 1 ? 's' : ''} · {edges.length} connection{edges.length !== 1 ? 's' : ''} · Auto-generated from your sessions
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map Canvas */}
        <div className="flex-1 relative">
          <MapCanvas
            ref={mapRef}
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            reconnectMode={false}
            onNodeClick={handleCanvasClick}
            onNodeDrag={handleNodeDrag}
          />

          {/* Map Controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
            <button
              onClick={() => mapRef.current?.zoomIn()}
              className="w-9 h-9 rounded-lg bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card transition-colors shadow-lg"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => mapRef.current?.zoomOut()}
              className="w-9 h-9 rounded-lg bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card transition-colors shadow-lg"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => mapRef.current?.recenter()}
              className="w-9 h-9 rounded-lg bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card transition-colors shadow-lg"
              aria-label="Recenter"
            >
              <Crosshair className="h-4 w-4" />
            </button>
          </div>

          {/* Pan Controls */}
          <div className="absolute bottom-4 left-3 z-10 grid grid-cols-3 gap-0.5 w-[4.5rem]">
            <div />
            <button
              onClick={() => mapRef.current?.panBy(0, -120)}
              className="w-6 h-6 rounded bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card transition-colors shadow"
              aria-label="Pan up"
            >
              <Move className="h-3 w-3 rotate-0" style={{ transform: 'rotate(-90deg)' }} />
            </button>
            <div />
            <button
              onClick={() => mapRef.current?.panBy(-120, 0)}
              className="w-6 h-6 rounded bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card transition-colors shadow"
              aria-label="Pan left"
            >
              <Move className="h-3 w-3" style={{ transform: 'rotate(180deg)' }} />
            </button>
            <div className="w-6 h-6" />
            <button
              onClick={() => mapRef.current?.panBy(120, 0)}
              className="w-6 h-6 rounded bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card transition-colors shadow"
              aria-label="Pan right"
            >
              <Move className="h-3 w-3" />
            </button>
            <div />
            <button
              onClick={() => mapRef.current?.panBy(0, 120)}
              className="w-6 h-6 rounded bg-card/80 border border-border/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card transition-colors shadow"
              aria-label="Pan down"
            >
              <Move className="h-3 w-3" style={{ transform: 'rotate(90deg)' }} />
            </button>
            <div />
          </div>

          {/* Empty state */}
          {sessions.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full border-2 border-cyan-500/20 flex items-center justify-center animate-pulse">
                  <Zap className="h-10 w-10 text-cyan-500/40" />
                </div>
                <h2 className="text-xl font-semibold text-cyan-100 mb-2">No Data Yet</h2>
                <p className="text-sm text-cyan-500/50 max-w-xs">Log training sessions with disciplines, strategies, techniques, and movements to see your neural pathway grow automatically.</p>
              </div>
            </div>
          )}

          {/* Mobile: floating chains button */}
          {isMobile && sessions.length > 0 && !selectedNodeId && (
            <button
              onClick={() => setChainsOpen(true)}
              className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 backdrop-blur-md text-cyan-200 text-xs font-medium shadow-lg"
            >
              <GitBranch className="h-4 w-4" />
              Pathways
            </button>
          )}

          {/* Mobile chains drawer */}
          {isMobile && (
            <Drawer open={chainsOpen} onOpenChange={setChainsOpen}>
              <DrawerContent className="bg-[#0d0d18] border-cyan-900/30 max-h-[75vh]">
                <DrawerHeader className="pb-0">
                  <DrawerTitle className="text-cyan-400/80 text-sm uppercase tracking-widest">
                    Movement Chains
                  </DrawerTitle>
                </DrawerHeader>
                <div className="p-4 overflow-y-auto">
                  <PathwayPanel
                    selectedNode={null}
                    parentNode={null}
                    childNodes={[]}
                    onSelectNode={setSelectedNodeId}
                    reconnectMode={false}
                    sessions={sessions}
                    embedded
                  />
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </div>

        {/* Right Panel */}
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
          sessionIndex={sessionIndex}
        />
      </div>
    </div>
  );
}
