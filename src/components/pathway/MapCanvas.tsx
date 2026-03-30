import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { PathwayNode, PathwayEdge } from './FuturisticMap';

interface MapCanvasProps {
  nodes: PathwayNode[];
  edges: PathwayEdge[];
  selectedNodeId: string | null;
  reconnectMode: boolean;
  onNodeClick: (nodeId: string | null) => void;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
}

const NODE_COLORS: Record<string, { core: string; glow: string }> = {
  root:        { core: '#ffffff', glow: '#e0f2fe' },
  discipline:  { core: '#06b6d4', glow: '#22d3ee' },
  strategy:    { core: '#f59e0b', glow: '#fbbf24' },
  technique:   { core: '#8b5cf6', glow: '#a78bfa' },
  movement:    { core: '#10b981', glow: '#34d399' },
  reaction:    { core: '#f43f5e', glow: '#fb7185' },
  followup:    { core: '#3b82f6', glow: '#60a5fa' },
  tactic:      { core: '#06b6d4', glow: '#22d3ee' },
  action:      { core: '#10b981', glow: '#34d399' },
  default:     { core: '#06b6d4', glow: '#22d3ee' },
};

function getNodeColor(type: string, colorTag: string | null) {
  if (colorTag) return { core: colorTag, glow: colorTag };
  return NODE_COLORS[type] || NODE_COLORS.default;
}

/** Walk edges to find all ancestors and descendants of a node */
function getFullPathway(nodeId: string, edges: PathwayEdge[]): Set<string> {
  const ids = new Set<string>([nodeId]);
  // Walk ancestors
  let frontier = [nodeId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const e of edges) {
        if (e.target_node_id === id && !ids.has(e.source_node_id)) {
          ids.add(e.source_node_id);
          next.push(e.source_node_id);
        }
      }
    }
    frontier = next;
  }
  // Walk descendants
  frontier = [nodeId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const e of edges) {
        if (e.source_node_id === id && !ids.has(e.target_node_id)) {
          ids.add(e.target_node_id);
          next.push(e.target_node_id);
        }
      }
    }
    frontier = next;
  }
  return ids;
}

export function MapCanvas({ nodes, edges, selectedNodeId, reconnectMode, onNodeClick, onNodeDrag }: MapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState(0);
  
  // Pinch-to-zoom state
  const lastPinchDist = useRef<number | null>(null);
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null);

  // Full pathway highlighting
  const pathwayNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    return getFullPathway(selectedNodeId, edges);
  }, [selectedNodeId, edges]);

  const pathwayEdgeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>();
    for (const e of edges) {
      if (pathwayNodeIds.has(e.source_node_id) && pathwayNodeIds.has(e.target_node_id)) {
        ids.add(e.id);
      }
    }
    return ids;
  }, [selectedNodeId, edges, pathwayNodeIds]);

  // Animation loop for pulse effects
  useEffect(() => {
    let raf: number;
    const tick = () => {
      setTime(Date.now() * 0.001);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    return {
      x: viewBox.x + (clientX - rect.left) * scaleX,
      y: viewBox.y + (clientY - rect.top) * scaleY,
    };
  }, [viewBox]);

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
      lastPinchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null && lastPinchCenter.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = lastPinchDist.current / dist;

      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const svgPt = getSvgPoint(cx, cy);

      setViewBox(prev => {
        const newW = Math.max(200, Math.min(3000, prev.w * factor));
        const newH = Math.max(150, Math.min(2250, prev.h * factor));
        const newX = svgPt.x - (svgPt.x - prev.x) * (newW / prev.w);
        const newY = svgPt.y - (svgPt.y - prev.y) * (newH / prev.h);
        return { x: newX, y: newY, w: newW, h: newH };
      });

      lastPinchDist.current = dist;
      lastPinchCenter.current = { x: cx, y: cy };
    }
  }, [getSvgPoint]);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
    lastPinchCenter.current = null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as SVGElement;
    const nodeId = target.closest('[data-node-id]')?.getAttribute('data-node-id');
    
    if (nodeId) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const svgPt = getSvgPoint(e.clientX, e.clientY);
        setDragNode(nodeId);
        setDragOffset({ x: svgPt.x - node.position_x, y: svgPt.y - node.position_y });
        (e.target as SVGElement).setPointerCapture?.(e.pointerId);
      }
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [nodes, getSvgPoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragNode) {
      const svgPt = getSvgPoint(e.clientX, e.clientY);
      const newX = svgPt.x - dragOffset.x;
      const newY = svgPt.y - dragOffset.y;
      onNodeDrag(dragNode, newX, newY);
    } else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      const scale = viewBox.w / (svgRef.current?.getBoundingClientRect().width || 800);
      setViewBox(prev => ({ ...prev, x: prev.x - dx * scale, y: prev.y - dy * scale }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [dragNode, isPanning, panStart, viewBox, dragOffset, getSvgPoint, onNodeDrag]);

  const handlePointerUp = useCallback(() => {
    if (dragNode) {
      onNodeClick(dragNode);
    } else if (!isPanning) {
      onNodeClick(null);
    }
    setDragNode(null);
    setIsPanning(false);
  }, [dragNode, isPanning, onNodeClick]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const svgPt = getSvgPoint(e.clientX, e.clientY);
    setViewBox(prev => {
      const newW = Math.max(200, Math.min(3000, prev.w * factor));
      const newH = Math.max(150, Math.min(2250, prev.h * factor));
      const newX = svgPt.x - (svgPt.x - prev.x) * (newW / prev.w);
      const newY = svgPt.y - (svgPt.y - prev.y) * (newH / prev.h);
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }, [getSvgPoint]);

  // Center view on nodes on load
  useEffect(() => {
    if (nodes.length === 0) return;
    const xs = nodes.map(n => n.position_x);
    const ys = nodes.map(n => n.position_y);
    const minX = Math.min(...xs) - 150;
    const minY = Math.min(...ys) - 150;
    const maxX = Math.max(...xs) + 150;
    const maxY = Math.max(...ys) + 150;
    setViewBox({ x: minX, y: minY, w: Math.max(maxX - minX, 400), h: Math.max(maxY - minY, 300) });
  }, [nodes.length === 0]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    >
      <defs>
        {/* Glow filters */}
        <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-edge" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        {/* Background grid pattern */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(6,182,212,0.04)" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Background */}
      <rect x={viewBox.x - 1000} y={viewBox.y - 1000} width={viewBox.w + 2000} height={viewBox.h + 2000} fill="#0a0a12" />
      <rect x={viewBox.x - 1000} y={viewBox.y - 1000} width={viewBox.w + 2000} height={viewBox.h + 2000} fill="url(#grid)" />

      {/* Ambient particles */}
      {Array.from({ length: 20 }).map((_, i) => {
        const px = viewBox.x + (Math.sin(time * 0.3 + i * 1.7) * 0.5 + 0.5) * viewBox.w;
        const py = viewBox.y + (Math.cos(time * 0.2 + i * 2.3) * 0.5 + 0.5) * viewBox.h;
        return (
          <circle
            key={`p${i}`}
            cx={px}
            cy={py}
            r={0.8 + Math.sin(time + i) * 0.3}
            fill="rgba(6,182,212,0.15)"
          />
        );
      })}

      {/* Edges */}
      {edges.map(edge => {
        const src = nodeMap.get(edge.source_node_id);
        const tgt = nodeMap.get(edge.target_node_id);
        if (!src || !tgt) return null;

        const isInPathway = pathwayEdgeIds.has(edge.id);
        const dimmed = selectedNodeId && !isInPathway;
        const srcColor = getNodeColor(src.node_type, src.color_tag);

        // Pulse position along the edge
        const pulseT = ((time * 0.5 + parseInt(edge.id.slice(0, 8).replace(/\D/g, '0'), 16) * 0.01) % 1);
        const pulseX = src.position_x + (tgt.position_x - src.position_x) * pulseT;
        const pulseY = src.position_y + (tgt.position_y - src.position_y) * pulseT;

        // Curved path via midpoint offset
        const mx = (src.position_x + tgt.position_x) / 2;
        const my = (src.position_y + tgt.position_y) / 2;
        const dx = tgt.position_x - src.position_x;
        const dy = tgt.position_y - src.position_y;
        const perpX = -dy * 0.1;
        const perpY = dx * 0.1;
        const ctrlX = mx + perpX;
        const ctrlY = my + perpY;

        return (
          <g key={edge.id}>
            <path
              d={`M ${src.position_x} ${src.position_y} Q ${ctrlX} ${ctrlY} ${tgt.position_x} ${tgt.position_y}`}
              fill="none"
              stroke={isInPathway ? srcColor.glow : 'rgba(6,182,212,0.15)'}
              strokeWidth={isInPathway ? 2.5 : 1}
              opacity={dimmed ? 0.06 : isInPathway ? 0.9 : 0.3}
              filter={isInPathway ? 'url(#glow-edge)' : undefined}
            />
            {/* Pulse dot traveling along edge */}
            {!dimmed && (
              <circle
                cx={pulseX}
                cy={pulseY}
                r={isInPathway ? 2.5 : 1.5}
                fill={srcColor.glow}
                opacity={isInPathway ? 0.8 : 0.3}
              />
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map(node => {
        const isSelected = selectedNodeId === node.id;
        const isInPathway = pathwayNodeIds.has(node.id);
        const dimmed = selectedNodeId && !isInPathway;
        const colors = getNodeColor(node.node_type, node.color_tag);
        const baseRadius = node.is_root ? 18 : 12;
        const floatOffset = Math.sin(time * 0.8 + node.position_x * 0.01) * 2;
        const pulse = isSelected ? 1 + Math.sin(time * 3) * 0.15 : 1;

        return (
          <g
            key={node.id}
            data-node-id={node.id}
            className="cursor-pointer"
            opacity={dimmed ? 0.1 : 1}
            style={{ transition: 'opacity 0.4s ease' }}
          >
            {/* Outer glow ring for selected */}
            {isSelected && (
              <>
                <circle
                  cx={node.position_x}
                  cy={node.position_y + floatOffset}
                  r={baseRadius * pulse + 16}
                  fill="none"
                  stroke={colors.glow}
                  strokeWidth={1}
                  opacity={0.2 + Math.sin(time * 2) * 0.1}
                  filter="url(#glow-strong)"
                />
                <circle
                  cx={node.position_x}
                  cy={node.position_y + floatOffset}
                  r={baseRadius * pulse + 10}
                  fill="none"
                  stroke={colors.glow}
                  strokeWidth={1.5}
                  opacity={0.35}
                />
              </>
            )}

            {/* Pathway highlight ring (non-selected nodes in the path) */}
            {!isSelected && isInPathway && selectedNodeId && (
              <circle
                cx={node.position_x}
                cy={node.position_y + floatOffset}
                r={baseRadius + 8}
                fill="none"
                stroke={colors.glow}
                strokeWidth={1}
                opacity={0.4 + Math.sin(time * 1.5) * 0.1}
                filter="url(#glow-soft)"
              />
            )}

            {/* Ambient glow */}
            <circle
              cx={node.position_x}
              cy={node.position_y + floatOffset}
              r={baseRadius + 6}
              fill={colors.core}
              opacity={isSelected ? 0.15 : isInPathway && selectedNodeId ? 0.12 : 0.06}
              filter="url(#glow-soft)"
            />

            {/* Core sphere */}
            <circle
              data-node-id={node.id}
              cx={node.position_x}
              cy={node.position_y + floatOffset}
              r={baseRadius * pulse}
              fill={`url(#grad-${node.id})`}
              stroke={isSelected ? colors.glow : isInPathway && selectedNodeId ? colors.glow : 'rgba(255,255,255,0.1)'}
              strokeWidth={isSelected ? 2 : isInPathway && selectedNodeId ? 1.5 : 0.5}
              filter={isSelected ? 'url(#glow-strong)' : 'url(#glow-soft)'}
            />

            {/* Radial gradient for sphere look */}
            <defs>
              <radialGradient id={`grad-${node.id}`} cx="35%" cy="35%">
                <stop offset="0%" stopColor={colors.glow} stopOpacity="0.9" />
                <stop offset="60%" stopColor={colors.core} stopOpacity="0.8" />
                <stop offset="100%" stopColor={colors.core} stopOpacity="0.4" />
              </radialGradient>
            </defs>

            {/* Inner highlight */}
            <circle
              cx={node.position_x - baseRadius * 0.25}
              cy={node.position_y + floatOffset - baseRadius * 0.25}
              r={baseRadius * 0.3}
              fill="rgba(255,255,255,0.2)"
            />

            {/* Label */}
            <text
              x={node.position_x}
              y={node.position_y + floatOffset + baseRadius + 16}
              textAnchor="middle"
              fontSize={isSelected ? '11' : '10'}
              fontWeight={isSelected ? '600' : isInPathway && selectedNodeId ? '500' : '400'}
              fill={isSelected ? colors.glow : isInPathway && selectedNodeId ? colors.glow : 'rgba(255,255,255,0.6)'}
              className="pointer-events-none select-none"
              style={{ textShadow: `0 0 8px ${colors.core}40` }}
            >
              {node.title.length > 18 ? node.title.slice(0, 16) + '…' : node.title}
            </text>

            {/* Type badge */}
            {isSelected && (
              <text
                x={node.position_x}
                y={node.position_y + floatOffset + baseRadius + 28}
                textAnchor="middle"
                fontSize="8"
                fill="rgba(255,255,255,0.3)"
                className="pointer-events-none select-none uppercase"
                letterSpacing="1"
              >
                {node.node_type}
              </text>
            )}

            {/* Reconnect mode indicator */}
            {reconnectMode && node.id !== selectedNodeId && (
              <circle
                cx={node.position_x}
                cy={node.position_y + floatOffset}
                r={baseRadius + 4}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                opacity={0.6}
              >
                <animate attributeName="stroke-dashoffset" from="0" to="8" dur="0.6s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
