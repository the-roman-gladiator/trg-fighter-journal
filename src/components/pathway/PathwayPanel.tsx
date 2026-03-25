import { PathwayNode } from './FuturisticMap';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Link2, ChevronRight, Circle } from 'lucide-react';

interface PathwayPanelProps {
  selectedNode: PathwayNode | null;
  parentNode: PathwayNode | null;
  childNodes: PathwayNode[];
  onEdit: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onReconnect: () => void;
  onSelectNode: (id: string) => void;
  reconnectMode: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  completed: '#06b6d4',
  paused: '#f59e0b',
  archived: '#6b7280',
};

export function PathwayPanel({
  selectedNode,
  parentNode,
  childNodes,
  onEdit,
  onDelete,
  onAddChild,
  onReconnect,
  onSelectNode,
  reconnectMode,
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
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* Node title & type */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-cyan-50 leading-tight">{selectedNode.title}</h3>
                <Badge
                  variant="outline"
                  className="text-[10px] shrink-0 border-cyan-500/30 text-cyan-400/70 uppercase tracking-wider"
                >
                  {selectedNode.node_type}
                </Badge>
              </div>
              {selectedNode.is_root && (
                <Badge className="mt-1 bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">Root Node</Badge>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[selectedNode.status] || STATUS_COLORS.active }}
              />
              <span className="text-xs text-cyan-300/60 capitalize">{selectedNode.status}</span>
            </div>

            {/* Description */}
            {selectedNode.description && (
              <div>
                <p className="text-[11px] text-cyan-500/40 uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-cyan-100/70 leading-relaxed">{selectedNode.description}</p>
              </div>
            )}

            {/* Parent */}
            {parentNode && (
              <div>
                <p className="text-[11px] text-cyan-500/40 uppercase tracking-wider mb-1.5">Parent Node</p>
                <button
                  onClick={() => onSelectNode(parentNode.id)}
                  className="flex items-center gap-2 w-full p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10 hover:bg-cyan-500/10 transition-colors"
                >
                  <div className="w-3 h-3 rounded-full bg-cyan-500/30" />
                  <span className="text-xs text-cyan-200/70 flex-1 text-left truncate">{parentNode.title}</span>
                  <ChevronRight className="h-3 w-3 text-cyan-500/30" />
                </button>
              </div>
            )}

            {/* Children */}
            {childNodes.length > 0 && (
              <div>
                <p className="text-[11px] text-cyan-500/40 uppercase tracking-wider mb-1.5">
                  Connected Nodes ({childNodes.length})
                </p>
                <div className="space-y-1">
                  {childNodes.map(child => (
                    <button
                      key={child.id}
                      onClick={() => onSelectNode(child.id)}
                      className="flex items-center gap-2 w-full p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10 hover:bg-cyan-500/10 transition-colors"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-400/40" />
                      <span className="text-xs text-cyan-200/70 flex-1 text-left truncate">{child.title}</span>
                      <span className="text-[10px] text-cyan-500/30 capitalize">{child.node_type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reconnect mode banner */}
            {reconnectMode && (
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                <p className="text-xs text-amber-300">Click another node on the map to reconnect this node to it.</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-cyan-900/30">
              <Button
                size="sm"
                onClick={onAddChild}
                className="w-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/20"
              >
                <Plus className="h-3.5 w-3.5 mr-2" /> Add Connection
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onEdit}
                  className="flex-1 text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/10"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onReconnect}
                  className="flex-1 text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/10"
                >
                  <Link2 className="h-3.5 w-3.5 mr-1" /> Reconnect
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="w-full text-red-400/60 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Node
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
