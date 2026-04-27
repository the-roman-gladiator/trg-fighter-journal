import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PathwayNode } from './FuturisticMap';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Circle, X, GitBranch } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
// Drawer no longer used on mobile — replaced with non-modal floating sheet

interface PathwayChain {
  strategy: string;
  technique: string;
  firstMovement: string;
  opponentReaction: string;
  thirdMovement: string;
  count: number;
  sessions: any[];
}

interface PathwayPanelProps {
  selectedNode: PathwayNode | null;
  parentNode: PathwayNode | null;
  childNodes: PathwayNode[];
  onSelectNode: (id: string) => void;
  reconnectMode: boolean;
  onClose?: () => void;
  sessions?: any[];
  embedded?: boolean; // skip mobile drawer wrapping when embedded inside another drawer
  /** All node IDs in the highlighted pathway (ancestors + descendants) */
  pathwayNodeIds?: Set<string>;
  /** All nodes available to look up by id */
  allNodes?: PathwayNode[];
  /** Map of session id → ordered chain of node ids belonging to that session */
  sessionIndex?: Map<string, string[]>;
}

const TYPE_LABELS: Record<string, string> = {
  root: 'Core',
  discipline: 'Discipline',
  strategy: 'Tactic',
  technique: 'Technique',
  movement1: '1st Movement',
  movement2: 'Opponent Reaction',
  movement3: 'Follow-up',
  movement: '1st Movement',
  reaction: 'Opponent Reaction',
  followup: 'Follow-up',
  tactic: 'Tactic',
  action: 'Action',
};

const TYPE_COLORS: Record<string, string> = {
  root: '#ffffff',
  discipline: '#E63946',
  strategy: '#FF7F11',
  technique: '#2A9D8F',
  movement1: '#4CC9F0',
  movement2: '#F72585',
  movement3: '#7FBA00',
  movement: '#4CC9F0',
  reaction: '#F72585',
  followup: '#7FBA00',
  tactic: '#FF7F11',
  action: '#2A9D8F',
};

function PathwayChainsList({
  sessions,
  onSelectNode,
}: {
  sessions: any[];
  onSelectNode?: (id: string) => void;
}) {
  const navigate = useNavigate();

  const chains = useMemo(() => {
    const map = new Map<string, PathwayChain>();
    for (const s of sessions) {
      if (!s.first_movement && !s.opponent_action && !s.second_movement) continue;
      const key = [s.strategy || '', s.technique || '', s.first_movement || '', s.opponent_action || '', s.second_movement || ''].join('|||');
      if (map.has(key)) {
        const ex = map.get(key)!;
        ex.count++;
        ex.sessions.push(s);
      } else {
        map.set(key, {
          strategy: s.strategy || '',
          technique: s.technique || '',
          firstMovement: s.first_movement || '',
          opponentReaction: s.opponent_action || '',
          thirdMovement: s.second_movement || '',
          count: 1,
          sessions: [s],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [sessions]);

  // Pick the deepest available node id for a chain so highlighting walks
  // back through the full ancestry.
  const chainNodeId = (chain: PathwayChain): string | null => {
    if (chain.thirdMovement)    return `move3:${chain.thirdMovement}`;
    if (chain.opponentReaction) return `move2:${chain.opponentReaction}`;
    if (chain.firstMovement)    return `move1:${chain.firstMovement}`;
    if (chain.technique)        return `tech:${chain.technique}`;
    if (chain.strategy)         return `tactic:${chain.strategy}`;
    return null;
  };

  if (chains.length === 0) {
    return (
      <div className="text-center py-6">
        <GitBranch className="h-8 w-8 text-cyan-500/30 mx-auto mb-2" />
        <p className="text-xs text-cyan-500/40">No movement chains yet</p>
        <p className="text-[10px] text-cyan-500/25 mt-1">Log sessions with movements to build chains</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-cyan-500/40 uppercase tracking-wider">
        Movement Chains ({chains.length})
      </p>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {chains.map((chain, i) => {
          const nodeId = chainNodeId(chain);
          const clickable = !!(nodeId && onSelectNode);
          return (
            <div
              key={i}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onSelectNode!(nodeId!) : undefined}
              onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectNode!(nodeId!); } } : undefined}
              className={`p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10 transition-colors ${clickable ? 'cursor-pointer hover:bg-cyan-500/10 hover:border-cyan-500/30' : ''}`}
              title={clickable ? 'Highlight this pathway on the map' : undefined}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex gap-1 flex-wrap">
                  {chain.strategy && <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400/80">{chain.strategy}</Badge>}
                  {chain.technique && <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400/80">{chain.technique}</Badge>}
                </div>
                <Badge className="text-[9px] bg-cyan-500/20 text-cyan-300 border-none">{chain.count}×</Badge>
              </div>
              <div className="space-y-0.5">
                {chain.firstMovement && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 rounded px-1 py-0.5">1st</span>
                    <span className="text-[10px] text-cyan-100/70">{chain.firstMovement}</span>
                  </div>
                )}
                {chain.opponentReaction && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-rose-400 bg-rose-500/15 rounded px-1 py-0.5">2nd</span>
                    <span className="text-[10px] text-cyan-100/70">{chain.opponentReaction}</span>
                  </div>
                )}
                {chain.thirdMovement && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-blue-400 bg-blue-500/15 rounded px-1 py-0.5">3rd</span>
                    <span className="text-[10px] text-cyan-100/70">{chain.thirdMovement}</span>
                  </div>
                )}
              </div>
              {/* Session date links — open the full session record */}
              <div className="mt-1.5 pt-1.5 border-t border-cyan-900/20 flex gap-1 flex-wrap">
                {chain.sessions.slice(0, 3).map(s => (
                  <button
                    key={s.id}
                    onClick={(e) => { e.stopPropagation(); navigate(`/session/${s.id}`); }}
                    className="text-[9px] text-cyan-500/50 hover:text-cyan-300 transition-colors"
                  >
                    {format(new Date(s.date), 'MMM d')}
                  </button>
                ))}
                {chain.sessions.length > 3 && (
                  <span className="text-[9px] text-cyan-500/30">+{chain.sessions.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodeDetails({
  selectedNode,
  parentNode,
  childNodes,
  onSelectNode,
  pathwayNodeIds,
  allNodes,
}: { selectedNode: PathwayNode; parentNode: PathwayNode | null; childNodes: PathwayNode[]; onSelectNode: (id: string) => void; pathwayNodeIds?: Set<string>; allNodes?: PathwayNode[] }) {
  // Build full pathway list (all highlighted nodes except selected)
  const fullPathwayNodes = useMemo(() => {
    if (!pathwayNodeIds || !allNodes) return [];
    return allNodes.filter(n => n.id !== selectedNode.id && pathwayNodeIds.has(n.id));
  }, [pathwayNodeIds, allNodes, selectedNode.id]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-cyan-50 leading-tight">{selectedNode.title}</h3>
          <Badge
            variant="outline"
            className="text-[10px] shrink-0 border-cyan-500/30 uppercase tracking-wider"
            style={{ color: TYPE_COLORS[selectedNode.node_type] || TYPE_COLORS.root }}
          >
            {TYPE_LABELS[selectedNode.node_type] || selectedNode.node_type}
          </Badge>
        </div>
        {selectedNode.is_root && (
          <Badge className="mt-1 bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">Root Node</Badge>
        )}
      </div>

      {selectedNode.description && (
        <div>
          <p className="text-[11px] text-cyan-500/40 uppercase tracking-wider mb-1">Sessions</p>
          <p className="text-sm text-cyan-100/70 leading-relaxed">{selectedNode.description}</p>
        </div>
      )}

      {/* Full highlighted pathway */}
      {fullPathwayNodes.length > 0 && (
        <div>
          <p className="text-[11px] text-cyan-500/40 uppercase tracking-wider mb-1.5">
            Full Pathway ({fullPathwayNodes.length})
          </p>
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {fullPathwayNodes.map(node => (
              <button
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                className="flex items-center gap-2 w-full p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10 hover:bg-cyan-500/10 transition-colors"
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[node.node_type] || TYPE_COLORS.root }} />
                <span className="text-xs text-cyan-200/70 flex-1 text-left truncate">{node.title}</span>
                <span className="text-[10px] text-cyan-500/30">{TYPE_LABELS[node.node_type] || node.node_type}</span>
                <ChevronRight className="h-3 w-3 text-cyan-500/30" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PanelContent({
  selectedNode,
  parentNode,
  childNodes,
  onSelectNode,
  sessions,
  pathwayNodeIds,
  allNodes,
}: Omit<PathwayPanelProps, 'reconnectMode' | 'onClose' | 'embedded'>) {
  if (!selectedNode) {
    return (
      <div className="space-y-4">
        {/* Legend */}
        <div>
          <p className="text-[10px] text-cyan-500/30 uppercase tracking-wider mb-2">Node Types</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[key] }} />
                <span className="text-[10px] text-cyan-500/40">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pathway Chains */}
        <div className="pt-3 border-t border-cyan-900/30">
          <PathwayChainsList sessions={sessions || []} />
        </div>

        <p className="text-[10px] text-cyan-500/25 text-center">Tap a node on the map to view details</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <NodeDetails
        selectedNode={selectedNode}
        parentNode={parentNode}
        childNodes={childNodes}
        onSelectNode={onSelectNode}
        pathwayNodeIds={pathwayNodeIds}
        allNodes={allNodes}
      />
      {/* Legend */}
      <div className="pt-3 border-t border-cyan-900/30">
        <p className="text-[10px] text-cyan-500/30 uppercase tracking-wider mb-2">Node Types</p>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[key] }} />
              <span className="text-[10px] text-cyan-500/40">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PathwayPanel({
  selectedNode,
  parentNode,
  childNodes,
  onSelectNode,
  onClose,
  sessions,
  embedded,
  pathwayNodeIds,
  allNodes,
}: PathwayPanelProps) {
  const isMobile = useIsMobile();

  // When embedded inside another container (e.g. a drawer), render content directly
  if (embedded) {
    return (
      <PanelContent
        selectedNode={selectedNode}
        parentNode={parentNode}
        childNodes={childNodes}
        onSelectNode={onSelectNode}
        sessions={sessions}
        pathwayNodeIds={pathwayNodeIds}
        allNodes={allNodes}
      />
    );
  }

  if (isMobile) {
    // On mobile: render a non-modal bottom sheet that floats above the map.
    // No overlay, no body scaling, no blur — map stays fully visible & interactive.
    if (!selectedNode) return null;
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-40 h-[50vh] bg-[#0d0d18] border-t border-cyan-900/30 rounded-t-2xl shadow-2xl flex flex-col animate-fade-in"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-cyan-900/40 shrink-0" />
        <div className="flex items-center justify-between px-4 pt-2 pb-1 shrink-0">
          <h3 className="text-cyan-400/80 text-sm uppercase tracking-widest">Node Details</h3>
          <button
            onClick={() => onClose?.()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-cyan-300/70 hover:bg-cyan-500/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 pb-6 overflow-y-auto flex-1">
          <NodeDetails
            selectedNode={selectedNode}
            parentNode={parentNode}
            childNodes={childNodes}
            onSelectNode={onSelectNode}
            pathwayNodeIds={pathwayNodeIds}
            allNodes={allNodes}
          />
        </div>
      </div>
    );
  }

  // Desktop: sidebar with both chains and node details
  return (
    <div className="w-80 border-l border-cyan-900/30 bg-[#0d0d18]/95 backdrop-blur-xl overflow-y-auto shrink-0">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-cyan-400/80 uppercase tracking-widest mb-4">
          {selectedNode ? 'Node Details' : 'Pathway Overview'}
        </h2>
        <PanelContent
          selectedNode={selectedNode}
          parentNode={parentNode}
          childNodes={childNodes}
          onSelectNode={onSelectNode}
          sessions={sessions}
          pathwayNodeIds={pathwayNodeIds}
          allNodes={allNodes}
        />
      </div>
    </div>
  );
}
