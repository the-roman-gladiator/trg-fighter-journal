import { useRef, useState, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { PathwayNode, PathwayEdge } from './FuturisticMap';
import { useIsMobile } from '@/hooks/use-mobile';

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
  /** Optional: precomputed set of node IDs to highlight. When provided,
   *  overrides the default ancestor/descendant walker (which is wrong for
   *  graphs with global nodes shared across disciplines). */
  pathwayNodeIdsOverride?: Set<string>;
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

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas({ nodes, edges, selectedNodeId, reconnectMode, onNodeClick, onNodeDrag, pathwayNodeIdsOverride }, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });

  // Compute world bounds + min/max viewBox sizes from nodes
  const worldBounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: -400, minY: -300, maxX: 400, maxY: 300 };
    }
    const xs = nodes.map(n => n.position_x);
    const ys = nodes.map(n => n.position_y);
    const PAD = 200;
    return {
      minX: Math.min(...xs) - PAD,
      minY: Math.min(...ys) - PAD,
      maxX: Math.max(...xs) + PAD,
      maxY: Math.max(...ys) + PAD,
    };
  }, [nodes]);

  // Clamp a viewBox so it stays within world bounds and within sane scale.
  // MIN_W/MAX_W act as zoom limits (smaller viewBox = more zoomed-in).
  const clampViewBox = useCallback((v: { x: number; y: number; w: number; h: number }) => {
    const worldW = worldBounds.maxX - worldBounds.minX;
    const worldH = worldBounds.maxY - worldBounds.minY;
    // Zoom limits: don't allow viewing more than 2x world (zoom-out)
    // or less than 30% of world (zoom-in)
    const MIN_W = Math.max(200, worldW * 0.3);
    const MAX_W = Math.max(400, worldW * 2);
    const ratio = v.h / v.w || 0.75;
    let w = Math.max(MIN_W, Math.min(MAX_W, v.w));
    let h = w * ratio;
    // Clamp translation so viewBox center stays inside world bounds
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const minCx = worldBounds.minX;
    const maxCx = worldBounds.maxX;
    const minCy = worldBounds.minY;
    const maxCy = worldBounds.maxY;
    const clampedCx = Math.max(minCx, Math.min(maxCx, cx));
    const clampedCy = Math.max(minCy, Math.min(maxCy, cy));
    return { x: clampedCx - w / 2, y: clampedCy - h / 2, w, h };
  }, [worldBounds]);
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
    setViewBox(clampViewBox({ x: minX, y: minY, w: Math.max(maxX - minX, 400), h: Math.max(maxY - minY, 300) }));
  }, [nodes, clampViewBox]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => setViewBox(v => {
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
      const nw = v.w * 0.8, nh = v.h * 0.8;
      return clampViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
    }),
    zoomOut: () => setViewBox(v => {
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
      const nw = v.w * 1.25, nh = v.h * 1.25;
      return clampViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
    }),
    panBy: (dx: number, dy: number) => setViewBox(v =>
      clampViewBox({ ...v, x: v.x + dx * (v.w / 800), y: v.y + dy * (v.h / 600) })
    ),
    recenter: () => centerOnNodes(),
  }), [centerOnNodes, clampViewBox]);

  // Full pathway highlighting — prefer the explicit override (which is
  // discipline-aware in FuturisticMap) over the naive edge walker.
  const pathwayNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    if (pathwayNodeIdsOverride) return pathwayNodeIdsOverride;
    return getFullPathway(selectedNodeId, edges);
  }, [selectedNodeId, edges, pathwayNodeIdsOverride]);

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
      // Cancel any single-touch pan that may have started before the second finger landed
      setIsPanning(false);
      setDragNode(null);

      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      // Skip first frames while fingers settle
      if (dist < 30) {
        lastPinchDist.current = dist;
        lastPinchCenter.current = { x: cx, y: cy };
        return;
      }

      // Direct ratio — clamp per-frame so a jittery delta can't blow up the view
      const rawFactor = lastPinchDist.current / dist;
      const factor = Math.max(0.85, Math.min(1.18, rawFactor));

      // Zoom toward the midpoint of the two fingers (in SVG coords)
      const svgPt = getSvgPoint(cx, cy);

      setViewBox(prev => {
        const nextW = prev.w * factor;
        const nextH = prev.h * factor;
        const newX = svgPt.x - (svgPt.x - prev.x) * (nextW / prev.w);
        const newY = svgPt.y - (svgPt.y - prev.y) * (nextH / prev.h);
        return clampViewBox({ x: newX, y: newY, w: nextW, h: nextH });
      });

      lastPinchDist.current = dist;
      lastPinchCenter.current = { x: cx, y: cy };
    }
  }, [getSvgPoint, clampViewBox]);

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
    // If a pinch is currently active, ignore additional pointer-downs (avoid pan during pinch)
    if (lastPinchDist.current !== null) return;
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
    // If a pinch is in progress, ignore single-pointer pan
    if (lastPinchDist.current !== null) return;
    if (dragNode) {
      const svgPt = getSvgPoint(e.clientX, e.clientY);
      const newX = svgPt.x - dragOffset.x;
      const newY = svgPt.y - dragOffset.y;
      onNodeDrag(dragNode, newX, newY);
    } else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      const scale = viewBox.w / (svgRef.current?.getBoundingClientRect().width || 800);
      setViewBox(prev => clampViewBox({ ...prev, x: prev.x - dx * scale, y: prev.y - dy * scale }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [dragNode, isPanning, panStart, viewBox, dragOffset, getSvgPoint, onNodeDrag, clampViewBox]);

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
      const nextW = prev.w * factor;
      const nextH = prev.h * factor;
      const newX = svgPt.x - (svgPt.x - prev.x) * (nextW / prev.w);
      const newY = svgPt.y - (svgPt.y - prev.y) * (nextH / prev.h);
      return clampViewBox({ x: newX, y: newY, w: nextW, h: nextH });
    });
  }, [getSvgPoint, clampViewBox]);

  // Center view on nodes on load
  useEffect(() => {
    if (nodes.length === 0) return;
    centerOnNodes();
  }, [nodes.length === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // Native non-passive touchmove listener — React's synthetic touchmove is passive
  // in many browsers, so calling e.preventDefault() there has no effect. Without it
  // the browser starts native pinch/scroll gestures and the map appears to "fly away".
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    el.addEventListener('touchmove', block, { passive: false });
    el.addEventListener('touchstart', block, { passive: false });
    return () => {
      el.removeEventListener('touchmove', block);
      el.removeEventListener('touchstart', block);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full h-full overflow-hidden" style={{ touchAction: 'none' }}>
      {/* Static neural background — fast, no video decode */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, hsla(190, 80%, 45%, 0.18) 0%, transparent 55%),' +
            'radial-gradient(ellipse at 70% 80%, hsla(265, 70%, 50%, 0.16) 0%, transparent 55%),' +
            'radial-gradient(ellipse at 50% 50%, hsla(220, 60%, 20%, 0.4) 0%, #0a0a12 80%)',
        }}
      />
      <svg
        ref={svgRef}
        className="relative w-full h-full cursor-grab active:cursor-grabbing"
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
          <filter id="synapse-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {/* Synaptic particle field — edge-weighted, slow drift */}
        {Array.from({ length: 90 }).map((_, i) => {
          const seedX = (Math.sin(i * 91.7) * 0.5 + 0.5);
          const seedY = (Math.cos(i * 53.3) * 0.5 + 0.5);
          // Push toward edges: bias away from 0.5
          const ex = seedX < 0.5 ? seedX * 0.85 : 0.15 + seedX * 0.85;
          const ey = seedY < 0.5 ? seedY * 0.85 : 0.15 + seedY * 0.85;
          const driftX = Math.sin(time * 0.25 + i * 0.7) * viewBox.w * 0.012;
          const driftY = Math.cos(time * 0.22 + i * 0.5) * viewBox.h * 0.012;
          const px = viewBox.x + ex * viewBox.w + driftX;
          const py = viewBox.y + ey * viewBox.h + driftY;
          const twinkle = 0.25 + Math.abs(Math.sin(time * 1.1 + i * 0.9)) * 0.55;
          const r = 0.8 + (i % 5) * 0.35;
          const tint = i % 4 === 0 ? '#a0d8ef' : i % 4 === 1 ? '#c4b5fd' : i % 4 === 2 ? '#7dd3fc' : '#ffffff';
          return (
            <circle
              key={`syn${i}`}
              cx={px}
              cy={py}
              r={r}
              fill={tint}
              opacity={twinkle}
              filter="url(#synapse-blur)"
            />
          );
        })}

        {/* Faint synaptic threads — short, drifting */}
        {Array.from({ length: 14 }).map((_, i) => {
          const baseX = (Math.sin(i * 31.7) * 0.5 + 0.5);
          const baseY = (Math.cos(i * 17.9) * 0.5 + 0.5);
          // Edge bias
          const ex = baseX < 0.5 ? baseX * 0.7 : 0.3 + baseX * 0.7;
          const ey = baseY < 0.5 ? baseY * 0.7 : 0.3 + baseY * 0.7;
          const cx = viewBox.x + ex * viewBox.w;
          const cy = viewBox.y + ey * viewBox.h;
          const angle = i * 0.7 + time * 0.08;
          const len = viewBox.w * (0.04 + (i % 3) * 0.015);
          const x1 = cx + Math.cos(angle) * len;
          const y1 = cy + Math.sin(angle) * len;
          const x2 = cx - Math.cos(angle) * len;
          const y2 = cy - Math.sin(angle) * len;
          const op = 0.08 + Math.abs(Math.sin(time * 0.6 + i)) * 0.12;
          return (
            <line
              key={`thread${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#a5f3fc"
              strokeWidth={0.5}
              opacity={op}
              filter="url(#synapse-blur)"
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
              opacity={dimmed ? 0.2 : isInPathway ? 0.9 : 0.3}
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
            opacity={dimmed ? 0.35 : 1}
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
              fill={isSelected ? colors.glow : isInPathway && selectedNodeId ? colors.glow : 'rgba(255,255,255,0.45)'}
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
    </div>
  );
});
