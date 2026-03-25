import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Pencil, Trash2, Link2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapCanvas } from './MapCanvas';
import { PathwayPanel } from './PathwayPanel';
import { NodeFormModal } from './NodeFormModal';
import { toast } from 'sonner';

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
}

export function FuturisticMap({ onBack }: FuturisticMapProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<PathwayNode[]>([]);
  const [edges, setEdges] = useState<PathwayEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [reconnectMode, setReconnectMode] = useState(false);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

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

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: n }, { data: e }] = await Promise.all([
      supabase.from('pathway_nodes').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('pathway_edges').select('*').eq('user_id', user.id),
    ]);
    setNodes((n as PathwayNode[]) || []);
    setEdges((e as PathwayEdge[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddNode = async (data: { title: string; description: string; node_type: string; status: string; color_tag: string }) => {
    if (!user) return;

    // Calculate position relative to parent or center
    const parentPos = selectedNode 
      ? { x: selectedNode.position_x, y: selectedNode.position_y }
      : { x: 400, y: 300 };
    
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 60;
    const newX = parentPos.x + Math.cos(angle) * dist;
    const newY = parentPos.y + Math.sin(angle) * dist;

    const isRoot = nodes.length === 0;

    const { data: newNode, error } = await supabase.from('pathway_nodes').insert({
      user_id: user.id,
      title: data.title,
      description: data.description || null,
      node_type: data.node_type,
      status: data.status,
      color_tag: data.color_tag || null,
      position_x: isRoot ? 400 : newX,
      position_y: isRoot ? 300 : newY,
      is_root: isRoot,
    }).select().single();

    if (error) { toast.error('Failed to create node'); return; }

    // Create edge if there's a selected parent
    if (selectedNodeId && !isRoot && newNode) {
      await supabase.from('pathway_edges').insert({
        user_id: user.id,
        source_node_id: selectedNodeId,
        target_node_id: newNode.id,
      });
    }

    await loadData();
    if (newNode) setSelectedNodeId(newNode.id);
    setModalMode(null);
    toast.success('Node created');
  };

  const handleEditNode = async (data: { title: string; description: string; node_type: string; status: string; color_tag: string }) => {
    if (!selectedNodeId) return;
    const { error } = await supabase.from('pathway_nodes').update({
      title: data.title,
      description: data.description || null,
      node_type: data.node_type,
      status: data.status,
      color_tag: data.color_tag || null,
    }).eq('id', selectedNodeId);

    if (error) { toast.error('Failed to update'); return; }
    await loadData();
    setModalMode(null);
    toast.success('Node updated');
  };

  const handleDeleteNode = async () => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (node?.is_root && nodes.length > 1) {
      toast.error('Cannot delete root node while other nodes exist');
      return;
    }
    await supabase.from('pathway_edges').delete().or(`source_node_id.eq.${selectedNodeId},target_node_id.eq.${selectedNodeId}`);
    await supabase.from('pathway_nodes').delete().eq('id', selectedNodeId);
    setSelectedNodeId(null);
    await loadData();
    toast.success('Node deleted');
  };

  const handleReconnect = async (newParentId: string) => {
    if (!selectedNodeId || !user) return;
    // Remove old parent edge
    await supabase.from('pathway_edges').delete().eq('target_node_id', selectedNodeId);
    // Create new edge
    await supabase.from('pathway_edges').insert({
      user_id: user.id,
      source_node_id: newParentId,
      target_node_id: selectedNodeId,
    });
    setReconnectMode(false);
    await loadData();
    toast.success('Node reconnected');
  };

  const handleNodeDrag = async (nodeId: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, position_x: x, position_y: y } : n));
    await supabase.from('pathway_nodes').update({ position_x: x, position_y: y }).eq('id', nodeId);
  };

  const handleCanvasClick = (nodeId: string | null) => {
    if (reconnectMode && nodeId && nodeId !== selectedNodeId) {
      handleReconnect(nodeId);
    } else {
      setSelectedNodeId(nodeId);
      setReconnectMode(false);
    }
  };

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
              <p className="text-[11px] text-cyan-500/50">{nodes.length} node{nodes.length !== 1 ? 's' : ''} · {edges.length} connection{edges.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setModalMode('add')}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30"
          >
            <Plus className="h-4 w-4 mr-1" />
            {nodes.length === 0 ? 'Create Root' : 'Add Node'}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map Canvas */}
        <div className="flex-1 relative">
          <MapCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            reconnectMode={reconnectMode}
            onNodeClick={handleCanvasClick}
            onNodeDrag={handleNodeDrag}
          />

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center pointer-events-auto">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full border-2 border-cyan-500/20 flex items-center justify-center animate-pulse">
                  <Zap className="h-10 w-10 text-cyan-500/40" />
                </div>
                <h2 className="text-xl font-semibold text-cyan-100 mb-2">Start Your Pathway</h2>
                <p className="text-sm text-cyan-500/50 mb-6 max-w-xs">Create your first node to begin building your neural network</p>
                <Button
                  onClick={() => setModalMode('add')}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30"
                >
                  <Plus className="h-4 w-4 mr-2" /> Create First Connection
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <PathwayPanel
          selectedNode={selectedNode}
          parentNode={parentNode}
          childNodes={childNodes}
          onEdit={() => setModalMode('edit')}
          onDelete={handleDeleteNode}
          onAddChild={() => setModalMode('add')}
          onReconnect={() => setReconnectMode(true)}
          onSelectNode={setSelectedNodeId}
          reconnectMode={reconnectMode}
        />
      </div>

      {/* Modal */}
      {modalMode && (
        <NodeFormModal
          mode={modalMode}
          node={modalMode === 'edit' ? selectedNode : null}
          onSave={modalMode === 'add' ? handleAddNode : handleEditNode}
          onClose={() => setModalMode(null)}
        />
      )}
    </div>
  );
}
