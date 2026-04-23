import { useRef, useState, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { PathwayNode, PathwayEdge } from './FuturisticMap';
import nebulaBg from '@/assets/pathway-nebula-bg.png';

export interface MapCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  panBy: (dx: number, dy: number) => void;
  recenter: () => void;
}

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
  discipline:  { core: '#E63946', glow: '#ff5d6c' },
  strategy:    { core: '#FF7F11', glow: '#ffa64d' },
  technique:   { core: '#2A9D8F', glow: '#4fc3b4' },
  movement1:   { core: '#4CC9F0', glow: '#7fdcf5' },
  movement2:   { core: '#F72585', glow: '#ff5cae' },
  movement3:   { core: '#7FBA00', glow: '#a8d639' },
  // Legacy aliases (kept for backwards compatibility with FighterPathway tactic/action)
  movement:    { core: '#4CC9F0', glow: '#7fdcf5' },
  reaction:    { core: '#F72585', glow: '#ff5cae' },
  followup:    { core: '#7FBA00', glow: '#a8d639' },
  tactic:      { core: '#FF7F11', glow: '#ffa64d' },
  action:      { core: '#2A9D8F', glow: '#4fc3b4' },
  default:     { core: '#4CC9F0', glow: '#7fdcf5' },
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

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas({ nodes, edges, selectedNodeId, reconnectMode, onNodeClick, onNodeDrag }, ref) {
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

  // Double-tap detection
  const lastTapTime = useRef<number>(0);
  const lastTapPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const centerOnNodes = useCallback(() => {
    if (nodes.length === 0) return;
    const xs = nodes.map(n => n.position_x);
    const ys = nodes.map(n => n.position_y);
    const minX = Math.min(...xs) - 150;
    const minY = Math.min(...ys) - 150;
    const maxX = Math.max(...xs) + 150;
    const maxY = Math.max(...ys) + 150;
    setViewBox({ x: minX, y: minY, w: Math.max(maxX - minX, 400), h: Math.max(maxY - minY, 300) });
  }, [nodes]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => setViewBox(v => {
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
      const nw = v.w * 0.8, nh = v.h * 0.8;
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    }),
    zoomOut: () => setViewBox(v => {
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
      const nw = v.w * 1.25, nh = v.h * 1.25;
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    }),
    panBy: (dx: number, dy: number) => setViewBox(v => ({
      ...v, x: v.x + dx * (v.w / 800), y: v.y + dy * (v.h / 600)
    })),
    recenter: () => centerOnNodes(),
  }), [centerOnNodes]);

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
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      // Ignore tiny finger distances — fingers just placed
      if (dist < 60) {
        lastPinchDist.current = dist;
        lastPinchCenter.current = { x: cx, y: cy };
        return;
      }

      const distanceDelta = Math.abs(dist - lastPinchDist.current);
      // Ignore jitter below 18px
      if (distanceDelta < 18) {
        return;
      }

      // Ultra-slow zoom: clamp ratio tightly, then dampen further
      const rawFactor = lastPinchDist.current / dist;
      const clampedRawFactor = Math.max(0.985, Math.min(1.015, rawFactor));
      const factor = 1 + (clampedRawFactor - 1) * 0.08;
      const svgPt = getSvgPoint(cx, cy);

      setViewBox(prev => {
        const newW = Math.max(240, Math.min(3000, prev.w * factor));
        const newH = Math.max(180, Math.min(2250, prev.h * factor));
        const newX = svgPt.x - (svgPt.x - prev.x) * (newW / prev.w);
        const newY = svgPt.y - (svgPt.y - prev.y) * (newH / prev.h);
        return { x: newX, y: newY, w: newW, h: newH };
      });

      lastPinchDist.current = dist;
      lastPinchCenter.current = { x: cx, y: cy };
    }
  }, [getSvgPoint]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Double-tap detection (single finger)
    if (e.changedTouches.length === 1 && lastPinchDist.current === null) {
      const now = Date.now();
      const touch = e.changedTouches[0];
      const dx = touch.clientX - lastTapPos.current.x;
      const dy = touch.clientY - lastTapPos.current.y;
      const dist = Math.hypot(dx, dy);
      if (now - lastTapTime.current < 350 && dist < 30) {
        // Double tap detected — recenter
        centerOnNodes();
        onNodeClick(null);
        lastTapTime.current = 0;
      } else {
        lastTapTime.current = now;
        lastTapPos.current = { x: touch.clientX, y: touch.clientY };
      }
    }
    lastPinchDist.current = null;
    lastPinchCenter.current = null;
  }, [centerOnNodes, onNodeClick]);

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
    const factor = e.deltaY > 0 ? 1.05 : 0.95;
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
    centerOnNodes();
  }, [nodes.length === 0]); // eslint-disable-line react-hooks/exhaustive-deps

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

        {/* Aurora blur filters */}
        <filter id="aurora-blur-1" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="40" />
        </filter>
        <filter id="aurora-blur-2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
        <filter id="aurora-blur-3" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="25" />
        </filter>

        {/* Deep space radial gradient */}
        <radialGradient id="bg-deep" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#0a0e2a" stopOpacity="1" />
          <stop offset="100%" stopColor="#00010f" stopOpacity="1" />
        </radialGradient>

        {/* Background grid pattern */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(6,182,212,0.04)" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Deep space base */}
      <rect
        x={viewBox.x - 2000} y={viewBox.y - 2000}
        width={viewBox.w + 4000} height={viewBox.h + 4000}
        fill="url(#bg-deep)"
      />

      {/* Aurora layer 1 — purple top-left */}
      <ellipse
        cx={viewBox.x + viewBox.w * 0.15 + Math.sin(time * 0.08) * viewBox.w * 0.06}
        cy={viewBox.y + viewBox.h * 0.18 + Math.cos(time * 0.06) * viewBox.h * 0.04}
        rx={viewBox.w * 0.45} ry={viewBox.h * 0.22}
        fill="#6B21A8"
        opacity={0.18 + Math.sin(time * 0.15) * 0.06}
        filter="url(#aurora-blur-2)"
      />
      {/* Aurora layer 2 — teal/green top-right */}
      <ellipse
        cx={viewBox.x + viewBox.w * 0.72 + Math.sin(time * 0.07 + 1.2) * viewBox.w * 0.05}
        cy={viewBox.y + viewBox.h * 0.08 + Math.cos(time * 0.09 + 0.8) * viewBox.h * 0.03}
        rx={viewBox.w * 0.38} ry={viewBox.h * 0.16}
        fill="#0d9488"
        opacity={0.22 + Math.sin(time * 0.12 + 1) * 0.07}
        filter="url(#aurora-blur-2)"
      />
      {/* Aurora layer 3 — blue right-center */}
      <ellipse
        cx={viewBox.x + viewBox.w * 0.85 + Math.sin(time * 0.05 + 2.1) * viewBox.w * 0.04}
        cy={viewBox.y + viewBox.h * 0.48 + Math.cos(time * 0.07 + 1.5) * viewBox.h * 0.06}
        rx={viewBox.w * 0.32} ry={viewBox.h * 0.28}
        fill="#1d4ed8"
        opacity={0.2 + Math.sin(time * 0.1 + 2) * 0.06}
        filter="url(#aurora-blur-2)"
      />
      {/* Aurora layer 4 — cyan bottom-left */}
      <ellipse
        cx={viewBox.x + viewBox.w * 0.12 + Math.sin(time * 0.06 + 3.0) * viewBox.w * 0.05}
        cy={viewBox.y + viewBox.h * 0.82 + Math.cos(time * 0.08 + 2.2) * viewBox.h * 0.04}
        rx={viewBox.w * 0.35} ry={viewBox.h * 0.2}
        fill="#0891b2"
        opacity={0.25 + Math.sin(time * 0.13 + 3) * 0.08}
        filter="url(#aurora-blur-2)"
      />
      {/* Aurora layer 5 — blue bottom-right arc */}
      <ellipse
        cx={viewBox.x + viewBox.w * 0.65 + Math.sin(time * 0.09 + 1.8) * viewBox.w * 0.04}
        cy={viewBox.y + viewBox.h * 0.88 + Math.cos(time * 0.06 + 3.5) * viewBox.h * 0.03}
        rx={viewBox.w * 0.4} ry={viewBox.h * 0.18}
        fill="#2563eb"
        opacity={0.18 + Math.sin(time * 0.11 + 1.5) * 0.06}
        filter="url(#aurora-blur-2)"
      />
      {/* Aurora layer 6 — purple mid-left pulse */}
      <ellipse
        cx={viewBox.x + viewBox.w * 0.08 + Math.sin(time * 0.04 + 0.5) * viewBox.w * 0.03}
        cy={viewBox.y + viewBox.h * 0.55 + Math.cos(time * 0.05 + 1.0) * viewBox.h * 0.05}
        rx={viewBox.w * 0.22} ry={viewBox.h * 0.3}
        fill="#7e22ce"
        opacity={0.14 + Math.sin(time * 0.09 + 0.3) * 0.05}
        filter="url(#aurora-blur-1)"
      />

      {/* Subtle aurora streaks */}
      {[
        { y: 0.12, color: '#5eead4', speed: 0.07, phase: 0 },
        { y: 0.78, color: '#67e8f9', speed: 0.05, phase: 2.1 },
        { y: 0.35, color: '#a78bfa', speed: 0.06, phase: 1.3 },
      ].map((streak, i) => {
        const offsetX = Math.sin(time * streak.speed + streak.phase) * viewBox.w * 0.08;
        return (
          <ellipse
            key={`streak${i}`}
            cx={viewBox.x + viewBox.w * 0.5 + offsetX}
            cy={viewBox.y + viewBox.h * streak.y}
            rx={viewBox.w * 0.6} ry={viewBox.h * 0.025}
            fill={streak.color}
            opacity={0.08 + Math.sin(time * 0.2 + i) * 0.04}
            filter="url(#aurora-blur-3)"
          />
        );
      })}

      {/* Deep background stars */}
      {Array.from({ length: 80 }).map((_, i) => {
        const px = viewBox.x + ((Math.sin(i * 127.1 + 0.3) * 0.5 + 0.5) * (viewBox.w + 1000)) - 500;
        const py = viewBox.y + ((Math.cos(i * 311.7 + 0.7) * 0.5 + 0.5) * (viewBox.h + 1000)) - 500;
        const twinkle = 0.15 + Math.abs(Math.sin(time * 0.2 + i * 0.9)) * 0.25;
        return <circle key={`ds${i}`} cx={px} cy={py} r={0.4} fill="white" opacity={twinkle} />;
      })}

      {/* Mid stars */}
      {Array.from({ length: 50 }).map((_, i) => {
        const px = viewBox.x + ((Math.sin(i * 241.3 + 1.2) * 0.5 + 0.5) * (viewBox.w + 800)) - 400;
        const py = viewBox.y + ((Math.cos(i * 173.9 + 2.4) * 0.5 + 0.5) * (viewBox.h + 800)) - 400;
        const twinkle = 0.2 + Math.abs(Math.sin(time * 0.5 + i * 1.3)) * 0.4;
        return <circle key={`ms${i}`} cx={px} cy={py} r={0.8} fill="white" opacity={twinkle} />;
      })}

      {/* Bright close stars */}
      {Array.from({ length: 25 }).map((_, i) => {
        const px = viewBox.x + ((Math.sin(i * 89.7 + 3.1) * 0.5 + 0.5) * viewBox.w);
        const py = viewBox.y + ((Math.cos(i * 197.4 + 1.7) * 0.5 + 0.5) * viewBox.h);
        const twinkle = 0.4 + Math.abs(Math.sin(time * 1.0 + i * 0.7)) * 0.6;
        const color = i % 3 === 0 ? '#a0d8ef' : i % 3 === 1 ? '#c4b5fd' : 'white';
        return <circle key={`cs${i}`} cx={px} cy={py} r={1.2} fill={color} opacity={twinkle} />;
      })}

      {/* Sparkle stars with cross shape */}
      {Array.from({ length: 5 }).map((_, i) => {
        const px = viewBox.x + viewBox.w * [0.2, 0.75, 0.45, 0.85, 0.1][i];
        const py = viewBox.y + viewBox.h * [0.15, 0.42, 0.68, 0.78, 0.88][i];
        const brightness = 0.5 + Math.abs(Math.sin(time * 1.5 + i)) * 0.5;
        return (
          <g key={`spark${i}`} opacity={brightness}>
            <circle cx={px} cy={py} r={2} fill="white" />
            <line x1={px - 5} y1={py} x2={px + 5} y2={py} stroke="white" strokeWidth={0.5} opacity={0.6} />
            <line x1={px} y1={py - 5} x2={px} y2={py + 5} stroke="white" strokeWidth={0.5} opacity={0.6} />
          </g>
        );
      })}

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

            {/* Ambient glow — fuller saturation */}
            <circle
              cx={node.position_x}
              cy={node.position_y + floatOffset}
              r={baseRadius + 6}
              fill={colors.core}
              opacity={isSelected ? 0.4 : isInPathway && selectedNodeId ? 0.3 : 0.2}
              filter="url(#glow-soft)"
            />

            {/* Core sphere — fully colored */}
            <circle
              data-node-id={node.id}
              cx={node.position_x}
              cy={node.position_y + floatOffset}
              r={baseRadius * pulse}
              fill={`url(#grad-${node.id})`}
              stroke={isSelected ? '#ffffff' : colors.glow}
              strokeWidth={isSelected ? 2.5 : 1.5}
              filter={isSelected ? 'url(#glow-strong)' : 'url(#glow-soft)'}
              opacity={1}
            />

            {/* Radial gradient — fully opaque solid color */}
            <defs>
              <radialGradient id={`grad-${node.id}`} cx="35%" cy="35%">
                <stop offset="0%" stopColor={colors.glow} stopOpacity="1" />
                <stop offset="100%" stopColor={colors.core} stopOpacity="1" />
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
});
