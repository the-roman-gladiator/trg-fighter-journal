import { PathwayNode } from './FuturisticMap';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Circle } from 'lucide-react';

interface PathwayPanelProps {
  selectedNode: PathwayNode | null;
  parentNode: PathwayNode | null;
  childNodes: PathwayNode[];
  onSelectNode: (id: string) => void;
  reconnectMode: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  root: 'Core',
  discipline: 'Discipline',
  strategy: 'Strategy',
  technique: 'Technique',
  movement: '1st Movement',
  reaction: 'Opponent Reaction',
  followup: 'Follow-up',
};

const TYPE_COLORS: Record<string, string> = {
  root: '#ffffff',
  discipline: '#06b6d4',
  strategy: '#f59e0b',
  technique: '#8b5cf6',
  movement: '#10b981',
  reaction: '#f43f5e',
  followup: '#3b82f6',
};

export function PathwayPanel({
  selectedNode,
  parentNode,
  childNodes,
  onSelectNode,
}: PathwayPanelProps) {
  return (
    <div className="w-80 border-l border-cyan-900/30 bg-[#0d0d18]/95 backdrop-blur-xl overflow-y-auto shrink-0">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-cyan-400/80 uppercase tracking-widest mb-4">
          Pathway Overview
        </h2>

        {!selectedNode ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full border border-cyan-500/20 flex items-center justify-center">
              <Circle className="h-5 w-5 text-cyan-500/30" />
            </div>
            <p className="text-sm text-cyan-500/40">Select a node to view details</p>
            <p className="text-xs text-cyan-500/25 mt-2">The map is auto-generated from your training sessions</p>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* Node title & type */}
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

            {/* Description / session count */}
            {selectedNode.description && (
              <div>
                <p className="text-[11px] text-cyan-500/40 uppercase tracking-wider mb-1">Sessions</p>
                <p className="text-sm text-cyan-100/70 leading-relaxed">{selectedNode.description}</p>
              </div>
            )}

            {/* Parent */}
            {parentNode && (
              <div>
                <p className="text-[11px] text-cyan-500/40 uppercase tracking-wider mb-1.5">Connected From</p>
                <button
                  onClick={() => onSelectNode(parentNode.id)}
                  className="flex items-center gap-2 w-full p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10 hover:bg-cyan-500/10 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: TYPE_COLORS[parentNode.node_type] || TYPE_COLORS.root }}
                  />
                  <span className="text-xs text-cyan-200/70 flex-1 text-left truncate">{parentNode.title}</span>
                  <span className="text-[10px] text-cyan-500/30">{TYPE_LABELS[parentNode.node_type] || parentNode.node_type}</span>
                  <ChevronRight className="h-3 w-3 text-cyan-500/30" />
                </button>
              </div>
            )}

            {/* Children */}
            {childNodes.length > 0 && (
              <div>
                <p className="text-[11px] text-cyan-500/40 uppercase tracking-wider mb-1.5">
                  Connects To ({childNodes.length})
                </p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {childNodes.map(child => (
                    <button
                      key={child.id}
                      onClick={() => onSelectNode(child.id)}
                      className="flex items-center gap-2 w-full p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10 hover:bg-cyan-500/10 transition-colors"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: TYPE_COLORS[child.node_type] || TYPE_COLORS.root }}
                      />
                      <span className="text-xs text-cyan-200/70 flex-1 text-left truncate">{child.title}</span>
                      <span className="text-[10px] text-cyan-500/30">{TYPE_LABELS[child.node_type] || child.node_type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
        )}
      </div>
    </div>
  );
}
