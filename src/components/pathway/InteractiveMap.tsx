import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, X, Network } from 'lucide-react';
import { format } from 'date-fns';

interface MapNode {
  id: string;
  label: string;
  type: 'discipline' | 'strategy' | 'technique' | 'movement';
  x: number;
  y: number;
  count: number;
}

interface MapEdge {
  from: string;
  to: string;
  weight: number;
}

interface InteractiveMapProps {
  sessions: any[];
  onBack: () => void;
}

export function InteractiveMap({ sessions, onBack }: InteractiveMapProps) {
  const navigate = useNavigate();

  const [filterDiscipline, setFilterDiscipline] = useState('all');
  const [filterStrategy, setFilterStrategy] = useState('all');
  const [filterTechnique, setFilterTechnique] = useState('all');
  const [filterMovement, setFilterMovement] = useState('all');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Extract unique values for dropdowns
  const disciplines = useMemo(() => [...new Set(sessions.map(s => s.discipline).filter(Boolean))], [sessions]);
  const strategies = useMemo(() => [...new Set(sessions.map(s => s.strategy).filter(Boolean))], [sessions]);
  const techniques = useMemo(() => [...new Set(sessions.map(s => s.technique).filter(Boolean))], [sessions]);
  const movements = useMemo(() => {
    const all = new Set<string>();
    sessions.forEach(s => {
      if (s.first_movement) all.add(s.first_movement);
      if (s.opponent_action) all.add(s.opponent_action);
      if (s.second_movement) all.add(s.second_movement);
    });
    return [...all];
  }, [sessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (filterDiscipline !== 'all' && s.discipline !== filterDiscipline) return false;
      if (filterStrategy !== 'all' && s.strategy !== filterStrategy) return false;
      if (filterTechnique !== 'all' && s.technique !== filterTechnique) return false;
      if (filterMovement !== 'all') {
        const hasMovement = s.first_movement === filterMovement || s.opponent_action === filterMovement || s.second_movement === filterMovement;
        if (!hasMovement) return false;
      }
      return true;
    });
  }, [sessions, filterDiscipline, filterStrategy, filterTechnique, filterMovement]);

  // Build node graph from filtered sessions
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, { label: string; type: MapNode['type']; count: number }>();
    const edgeMap = new Map<string, number>();

    const addNode = (id: string, label: string, type: MapNode['type']) => {
      const existing = nodeMap.get(id);
      if (existing) existing.count++;
      else nodeMap.set(id, { label, type, count: 1 });
    };

    const addEdge = (from: string, to: string) => {
      if (!from || !to) return;
      const key = `${from}::${to}`;
      edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    };

    for (const s of filteredSessions) {
      const discId = s.discipline ? `d:${s.discipline}` : null;
      const stratId = s.strategy ? `s:${s.strategy}` : null;
      const techId = s.technique ? `t:${s.technique}` : null;
      const m1Id = s.first_movement ? `m:${s.first_movement}` : null;
      const m2Id = s.opponent_action ? `m:${s.opponent_action}` : null;
      const m3Id = s.second_movement ? `m:${s.second_movement}` : null;

      if (discId) addNode(discId, s.discipline, 'discipline');
      if (stratId) addNode(stratId, s.strategy, 'strategy');
      if (techId) addNode(techId, s.technique, 'technique');
      if (m1Id) addNode(m1Id, s.first_movement, 'movement');
      if (m2Id) addNode(m2Id, s.opponent_action, 'movement');
      if (m3Id) addNode(m3Id, s.second_movement, 'movement');

      // Connect: discipline → strategy → technique → movements
      if (discId && stratId) addEdge(discId, stratId);
      if (stratId && techId) addEdge(stratId, techId);
      if (techId && m1Id) addEdge(techId, m1Id);
      if (m1Id && m2Id) addEdge(m1Id, m2Id);
      if (m2Id && m3Id) addEdge(m2Id, m3Id);
    }

    // Layout nodes in layers
    const nodesByType: Record<string, string[]> = {
      discipline: [],
      strategy: [],
      technique: [],
      movement: [],
    };
    nodeMap.forEach((v, k) => nodesByType[v.type].push(k));

    const WIDTH = 800;
    const HEIGHT = 500;
    const layers = ['discipline', 'strategy', 'technique', 'movement'];
    const layerY = { discipline: 60, strategy: 170, technique: 280, movement: 400 };

    const builtNodes: MapNode[] = [];
    layers.forEach(layer => {
      const items = nodesByType[layer];
      const spacing = WIDTH / (items.length + 1);
      items.forEach((id, i) => {
        const n = nodeMap.get(id)!;
        builtNodes.push({
          id,
          label: n.label,
          type: n.type as MapNode['type'],
          x: spacing * (i + 1),
          y: layerY[layer as keyof typeof layerY],
          count: n.count,
        });
      });
    });

    const builtEdges: MapEdge[] = [];
    edgeMap.forEach((weight, key) => {
      const [from, to] = key.split('::');
      if (builtNodes.find(n => n.id === from) && builtNodes.find(n => n.id === to)) {
        builtEdges.push({ from, to, weight });
      }
    });

    return { nodes: builtNodes, edges: builtEdges };
  }, [filteredSessions]);

  const nodeColors: Record<string, string> = {
    discipline: 'hsl(var(--primary))',
    strategy: '#FF7F11',
    technique: '#2A9D8F',
    movement: '#6A4C93',
  };

  const nodeById = useMemo(() => {
    const map = new Map<string, MapNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Get connected sessions for selected node
  const connectedSessions = useMemo(() => {
    if (!selectedNode) return [];
    const [type, ...rest] = selectedNode.split(':');
    const value = rest.join(':');
    return filteredSessions.filter(s => {
      if (type === 'd') return s.discipline === value;
      if (type === 's') return s.strategy === value;
      if (type === 't') return s.technique === value;
      if (type === 'm') return s.first_movement === value || s.opponent_action === value || s.second_movement === value;
      return false;
    }).slice(0, 10);
  }, [selectedNode, filteredSessions]);

  const activeFilters = [filterDiscipline, filterStrategy, filterTechnique, filterMovement].filter(f => f !== 'all').length;

  const clearFilters = () => {
    setFilterDiscipline('all');
    setFilterStrategy('all');
    setFilterTechnique('all');
    setFilterMovement('all');
    setSelectedNode(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <h1 className="text-xl font-bold mt-2">Interactive Map</h1>
          <p className="text-sm text-muted-foreground">Explore connections in your training</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-4xl space-y-4">
        {/* Dropdown Filters */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-4 w-4" /> Filters
              </CardTitle>
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                  <X className="h-3 w-3 mr-1" /> Clear ({activeFilters})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Discipline</label>
                <Select value={filterDiscipline} onValueChange={v => { setFilterDiscipline(v); setSelectedNode(null); }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Disciplines</SelectItem>
                    {disciplines.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Strategy</label>
                <Select value={filterStrategy} onValueChange={v => { setFilterStrategy(v); setSelectedNode(null); }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Strategies</SelectItem>
                    {strategies.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Technique</label>
                <Select value={filterTechnique} onValueChange={v => { setFilterTechnique(v); setSelectedNode(null); }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Techniques</SelectItem>
                    {techniques.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Movement</label>
                <Select value={filterMovement} onValueChange={v => { setFilterMovement(v); setSelectedNode(null); }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Movements</SelectItem>
                    {movements.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} matching</p>
          </CardContent>
        </Card>

        {/* Visual Node Graph */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connection Map</CardTitle>
            <div className="flex gap-3 mt-1">
              {(['discipline', 'strategy', 'technique', 'movement'] as const).map(type => (
                <div key={type} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: nodeColors[type] }} />
                  <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {nodes.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">No data to visualize. Add sessions with strategies and movements.</p>
            ) : (
              <div className="overflow-x-auto">
                <svg
                  viewBox="0 0 800 480"
                  className="w-full min-w-[600px]"
                  style={{ minHeight: '360px' }}
                >
                  {/* Layer labels */}
                  {[
                    { y: 45, label: 'DISCIPLINE' },
                    { y: 155, label: 'STRATEGY' },
                    { y: 265, label: 'TECHNIQUE' },
                    { y: 385, label: 'MOVEMENT' },
                  ].map(l => (
                    <text
                      key={l.label}
                      x={16}
                      y={l.y}
                      className="fill-muted-foreground"
                      fontSize="9"
                      fontWeight="600"
                      opacity={0.5}
                    >
                      {l.label}
                    </text>
                  ))}

                  {/* Edges */}
                  {edges.map((e, i) => {
                    const from = nodeById.get(e.from);
                    const to = nodeById.get(e.to);
                    if (!from || !to) return null;

                    const isHighlighted = selectedNode === e.from || selectedNode === e.to;
                    const opacity = selectedNode ? (isHighlighted ? 0.7 : 0.08) : 0.25;
                    const strokeWidth = Math.min(1 + e.weight * 0.5, 4);

                    return (
                      <line
                        key={i}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                        strokeWidth={isHighlighted ? strokeWidth + 0.5 : strokeWidth}
                        opacity={opacity}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {/* Nodes */}
                  {nodes.map(node => {
                    const isSelected = selectedNode === node.id;
                    const isConnected = selectedNode
                      ? edges.some(e => (e.from === selectedNode && e.to === node.id) || (e.to === selectedNode && e.from === node.id))
                      : false;
                    const dimmed = selectedNode && !isSelected && !isConnected;
                    const radius = Math.min(6 + node.count * 2, 18);

                    return (
                      <g
                        key={node.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedNode(isSelected ? null : node.id)}
                        opacity={dimmed ? 0.2 : 1}
                      >
                        {/* Glow ring on selected */}
                        {isSelected && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={radius + 5}
                            fill="none"
                            stroke={nodeColors[node.type]}
                            strokeWidth={2}
                            opacity={0.4}
                          />
                        )}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={radius}
                          fill={nodeColors[node.type]}
                          opacity={isSelected ? 1 : 0.85}
                          stroke={isSelected ? '#fff' : 'transparent'}
                          strokeWidth={isSelected ? 2 : 0}
                        />
                        {/* Label */}
                        <text
                          x={node.x}
                          y={node.y + radius + 12}
                          textAnchor="middle"
                          fontSize={node.count > 2 ? '10' : '9'}
                          className="fill-foreground"
                          fontWeight={isSelected ? '700' : '400'}
                        >
                          {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
                        </text>
                        {/* Count badge */}
                        {node.count > 1 && (
                          <text
                            x={node.x}
                            y={node.y + 3.5}
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="700"
                            fill="#fff"
                          >
                            {node.count}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Node Sessions */}
        {selectedNode && connectedSessions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Sessions: {selectedNode.split(':').slice(1).join(':')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {connectedSessions.map(s => {
                const chain = [s.first_movement, s.opponent_action, s.second_movement].filter(Boolean).join(' → ');
                return (
                  <Card key={s.id} className="cursor-pointer hover:border-primary/20" onClick={() => navigate(`/session/${s.id}`)}>
                    <CardContent className="py-3">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{s.title || s.technique || `${s.discipline} Training`}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(s.date), 'MMM d, yyyy')}</p>
                          {chain && <p className="text-xs text-primary/70 mt-1 font-mono">{chain}</p>}
                        </div>
                        <Badge variant="outline" className="text-[10px] ml-2">{s.discipline}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        )}

        {filteredSessions.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No sessions match your filters.</p>
        )}
      </main>
    </div>
  );
}
