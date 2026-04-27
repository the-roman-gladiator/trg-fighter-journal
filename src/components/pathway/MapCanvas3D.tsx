import { useRef, useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Line, Html, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls';
import * as THREE from 'three';
import { PathwayNode, PathwayEdge } from './FuturisticMap';

interface MapCanvas3DProps {
  nodes: PathwayNode[];
  edges: PathwayEdge[];
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string | null) => void;
  pathwayNodeIdsOverride?: Set<string>;
}

// Solid metallic colors for the sphere body, with a matching outer glow halo
const NODE_COLORS: Record<string, { core: string; glow: string }> = {
  root:       { core: '#f5d061', glow: '#fbbf24' },
  discipline: { core: '#E63946', glow: '#ff5d6c' },
  strategy:   { core: '#FF7F11', glow: '#ffa64d' },
  tactic:     { core: '#FF7F11', glow: '#ffa64d' },
  technique:  { core: '#2A9D8F', glow: '#4fc3b4' },
  action:     { core: '#2A9D8F', glow: '#4fc3b4' },
  movement1:  { core: '#4CC9F0', glow: '#7fdcf5' },
  movement:   { core: '#4CC9F0', glow: '#7fdcf5' },
  movement2:  { core: '#F72585', glow: '#ff5cae' },
  reaction:   { core: '#F72585', glow: '#ff5cae' },
  movement3:  { core: '#7FBA00', glow: '#a8d639' },
  followup:   { core: '#7FBA00', glow: '#a8d639' },
  default:    { core: '#4CC9F0', glow: '#7fdcf5' },
};

function getNodeColor(type: string, colorTag: string | null) {
  if (colorTag) return { core: colorTag, glow: colorTag };
  return NODE_COLORS[type] || NODE_COLORS.default;
}

// Orbit ring per layer (distance from the central "My Training" star)
const LAYER_RING: Record<string, number> = {
  root: 0,
  discipline: 2.4,
  strategy: 4.2,
  tactic: 4.2,
  technique: 6.0,
  action: 6.0,
  movement1: 7.6,
  movement: 7.6,
  movement2: 9.0,
  reaction: 9.0,
  movement3: 10.2,
  followup: 10.2,
};

// Per-layer orbit speed (rad/s) — outer rings drift slower for cosmic feel
const LAYER_SPEED: Record<string, number> = {
  root: 0,
  discipline: 0.08,
  strategy: 0.06,
  tactic: 0.06,
  technique: 0.045,
  action: 0.045,
  movement1: 0.035,
  movement: 0.035,
  movement2: 0.028,
  reaction: 0.028,
  movement3: 0.022,
  followup: 0.022,
};

// Slight tilt per layer to avoid a flat-disc look
const LAYER_TILT: Record<string, number> = {
  root: 0,
  discipline: 0.08,
  strategy: -0.12,
  tactic: -0.12,
  technique: 0.18,
  action: 0.18,
  movement1: -0.22,
  movement: -0.22,
  movement2: 0.26,
  reaction: 0.26,
  movement3: -0.3,
  followup: -0.3,
};

function nodeBaseRadius(node: PathwayNode): number {
  if (node.is_root) return 0.55;
  if (node.node_type === 'discipline') return 0.32;
  if (node.node_type === 'strategy' || node.node_type === 'tactic') return 0.26;
  return 0.2;
}

/* ---------- Faint orbit ring (visual guide for each layer) ---------- */
function OrbitRing({ radius, tilt }: { radius: number; tilt: number }) {
  const points = useMemo(() => {
    const segs = 96;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius]);
    }
    return pts;
  }, [radius]);
  return (
    <group rotation={[tilt, 0, 0]}>
      <Line points={points} color="#1e3a8a" lineWidth={1} transparent opacity={0.25} />
    </group>
  );
}

/* ---------- Node (orbiting body) ---------- */
function Node3D({
  node,
  position,
  isSelected,
  isHighlighted,
  isHovered,
  isDimmed,
  onSelect,
  onHover,
}: {
  node: PathwayNode;
  position: [number, number, number];
  isSelected: boolean;
  isHighlighted: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}) {
  const haloRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const colors = getNodeColor(node.node_type, node.color_tag);
  const baseRadius = nodeBaseRadius(node);
  const hitRadius = Math.max(baseRadius * 3.2, 0.55);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (haloRef.current) {
      const pulse = 1 + Math.sin(t * 2 + position[0]) * 0.08;
      haloRef.current.scale.setScalar(pulse);
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.01;
    }
  });

  const opacity = isDimmed ? 0.22 : 1;
  const active = isSelected || isHighlighted || isHovered;
  // Brighter emissive so spheres read clearly on dark bg, still not neon
  const emissiveIntensity = active ? 0.7 : node.is_root ? 0.55 : 0.4;

  return (
    <group position={position}>
      {/* Invisible large hit mesh */}
      <mesh
        renderOrder={999}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => e.stopPropagation()}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(true);
          if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(false);
          if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[hitRadius, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>

      {/* Soft halo — wider and brighter for visibility on dark bg */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[baseRadius * 1.9, 24, 24]} />
        <meshBasicMaterial
          color={colors.glow}
          transparent
          opacity={opacity * (active ? 0.3 : 0.18)}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Solid lighter metallic sphere — bright body, soft metal finish */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[baseRadius, 48, 48]} />
        <meshStandardMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={opacity}
          roughness={0.5}
          metalness={0.55}
        />
      </mesh>

      {/* Always-visible label (interstellar nameplate) */}
      <Html
        center
        distanceFactor={9}
        position={[0, baseRadius + 0.4, 0]}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[10, 0]}
      >
        <div
          className={`px-2 py-0.5 rounded-md whitespace-nowrap font-medium border backdrop-blur-sm transition-all
            ${
              isSelected || isHovered
                ? 'bg-cyan-500/30 border-cyan-300/60 text-white text-[11px] shadow-[0_0_12px_rgba(103,232,249,0.6)]'
                : node.is_root
                ? 'bg-amber-500/20 border-amber-300/50 text-amber-50 text-[11px]'
                : 'bg-black/55 border-cyan-400/20 text-cyan-100/90 text-[10px]'
            }
            ${isDimmed ? 'opacity-40' : 'opacity-100'}
          `}
        >
          {node.title}
        </div>
      </Html>
    </group>
  );
}

/* ---------- Edge ----------
   Highlighted edges pulse via material.opacity in useFrame (no React re-render). */
function Edge3D({
  start,
  end,
  state,
  pulsePhase,
}: {
  start: [number, number, number];
  end: [number, number, number];
  state: 'highlighted' | 'dimmed' | 'normal';
  pulsePhase: number;
}) {
  const lineRef = useRef<any>(null);

  const baseOpacity = state === 'dimmed' ? 0.05 : state === 'highlighted' ? 0.85 : 0.28;
  const color = state === 'highlighted' ? '#67e8f9' : '#0ea5e9';
  const lineWidth = state === 'highlighted' ? 2.6 : 1;

  useFrame(({ clock }) => {
    if (!lineRef.current) return;
    const mat = lineRef.current.material;
    if (!mat) return;
    if (state === 'highlighted') {
      const t = clock.getElapsedTime();
      // Strong, smooth pulse — single sin call per edge per frame
      mat.opacity = 0.55 + (Math.sin(t * 4 + pulsePhase) * 0.5 + 0.5) * 0.45;
    } else if (mat.opacity !== baseOpacity) {
      mat.opacity = baseOpacity;
    }
  });

  return (
    <Line
      ref={lineRef}
      points={[start, end]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={baseOpacity}
    />
  );
}

/* ---------- Orbit positions (recomputed each frame) ---------- */
function useOrbitPositions(nodes: PathwayNode[]) {
  // Stable per-node orbit parameters: ring index, base angle, tilt, speed
  const params = useMemo(() => {
    const layerCounts: Record<string, number> = {};
    const layerIndex = new Map<string, number>();
    for (const n of nodes) {
      const layer = n.node_type;
      const idx = layerCounts[layer] ?? 0;
      layerIndex.set(n.id, idx);
      layerCounts[layer] = idx + 1;
    }
    return nodes.map((n) => {
      const layer = n.node_type;
      const total = layerCounts[layer] || 1;
      const idx = layerIndex.get(n.id) ?? 0;
      const radius = LAYER_RING[layer] ?? 5;
      const speed = LAYER_SPEED[layer] ?? 0.04;
      const tilt = LAYER_TILT[layer] ?? 0;
      const baseAngle = (idx / total) * Math.PI * 2;
      return { id: n.id, radius, speed, tilt, baseAngle, isRoot: n.is_root };
    });
  }, [nodes]);

  const positions = useRef(new Map<string, [number, number, number]>());

  // Initialize once so first render has values
  if (positions.current.size === 0) {
    for (const p of params) {
      if (p.isRoot || p.radius === 0) {
        positions.current.set(p.id, [0, 0, 0]);
      } else {
        const x = Math.cos(p.baseAngle) * p.radius;
        const z = Math.sin(p.baseAngle) * p.radius;
        const y = Math.sin(p.baseAngle) * Math.sin(p.tilt) * p.radius;
        positions.current.set(p.id, [x, y, z]);
      }
    }
  }

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (const p of params) {
      if (p.isRoot || p.radius === 0) {
        positions.current.set(p.id, [0, 0, 0]);
        continue;
      }
      const a = p.baseAngle + t * p.speed;
      const x = Math.cos(a) * p.radius;
      const zFlat = Math.sin(a) * p.radius;
      // Tilt the orbital plane around the X axis
      const y = zFlat * Math.sin(p.tilt);
      const z = zFlat * Math.cos(p.tilt);
      positions.current.set(p.id, [x, y, z]);
    }
  });

  return positions;
}

/* ---------- Camera fly-to rig ---------- */
function CameraRig({
  targetRef,
  controlsRef,
}: {
  targetRef: React.MutableRefObject<THREE.Vector3 | null>;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const animTarget = useRef<THREE.Vector3 | null>(null);
  const animCamPos = useRef<THREE.Vector3 | null>(null);
  const startTarget = useRef(new THREE.Vector3());
  const startCamPos = useRef(new THREE.Vector3());
  const startTime = useRef(0);
  const DURATION = 0.8;

  useFrame((state) => {
    const desired = targetRef.current;
    const controls = controlsRef.current;
    const cam = state.camera;
    if (!controls) return;

    // Detect a new fly-to request
    if (desired && (!animTarget.current || !animTarget.current.equals(desired))) {
      animTarget.current = desired.clone();
      // Keep current viewing direction & distance, just shift focus
      const offset = cam.position.clone().sub(controls.target);
      const distance = Math.min(Math.max(offset.length() * 0.55, 6), 14);
      offset.setLength(distance);
      animCamPos.current = desired.clone().add(offset);
      startTarget.current.copy(controls.target);
      startCamPos.current.copy(cam.position);
      startTime.current = state.clock.getElapsedTime();
    }

    if (animTarget.current && animCamPos.current) {
      const t = Math.min((state.clock.getElapsedTime() - startTime.current) / DURATION, 1);
      // easeInOutCubic
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      controls.target.lerpVectors(startTarget.current, animTarget.current, e);
      cam.position.lerpVectors(startCamPos.current, animCamPos.current, e);
      controls.update();
      if (t >= 1) {
        animTarget.current = null;
        animCamPos.current = null;
        targetRef.current = null;
      }
    }
  });

  return null;
}

/* ---------- Scene ---------- */
function Scene({
  nodes,
  edges,
  selectedNodeId,
  onNodeClick,
  pathwayNodeIdsOverride,
  hoveredId,
  setHoveredId,
  controlsRef,
  flyToTargetRef,
}: MapCanvas3DProps & {
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  flyToTargetRef: React.MutableRefObject<THREE.Vector3 | null>;
}) {
  const positionsRef = useOrbitPositions(nodes);
  const [, force] = useState(0);

  // Re-render every frame so React-rendered nodes/edges follow orbiting positions
  useFrame(() => {
    force((n) => (n + 1) % 1000000);
  });

  // Stable pulse phase per edge id — keeps glow pulse smooth without re-renders
  const edgePhase = useMemo(() => {
    const m = new Map<string, number>();
    let i = 0;
    for (const e of edges) {
      m.set(e.id, (i++ * 0.7) % (Math.PI * 2));
    }
    return m;
  }, [edges]);

  // Continuously update fly-to target so the camera tracks an orbiting selected node
  useFrame(() => {
    if (!selectedNodeId) return;
    const pos = positionsRef.current.get(selectedNodeId);
    if (!pos) return;
    if (!flyToTargetRef.current) {
      flyToTargetRef.current = new THREE.Vector3(pos[0], pos[1], pos[2]);
    } else {
      flyToTargetRef.current.set(pos[0], pos[1], pos[2]);
    }
  });

  const highlightSet = pathwayNodeIdsOverride;
  const hasOverride = !!(highlightSet && highlightSet.size > 0);

  const neighborEdges = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!m.has(e.source_node_id)) m.set(e.source_node_id, new Set());
      if (!m.has(e.target_node_id)) m.set(e.target_node_id, new Set());
      m.get(e.source_node_id)!.add(e.id);
      m.get(e.target_node_id)!.add(e.id);
    }
    return m;
  }, [edges]);

  const activeNodeId = hoveredId ?? selectedNodeId;
  const activeEdgeIds = useMemo(() => {
    if (!activeNodeId) return null;
    return neighborEdges.get(activeNodeId) ?? new Set<string>();
  }, [activeNodeId, neighborEdges]);

  const handleNodeHover = useCallback(
    (id: string, hovered: boolean) => {
      setHoveredId(hovered ? id : null);
      if (controlsRef.current) {
        controlsRef.current.enabled = !hovered;
      }
    },
    [setHoveredId, controlsRef],
  );

  // Unique layer rings to draw
  const rings = useMemo(() => {
    const seen = new Set<string>();
    const out: { radius: number; tilt: number }[] = [];
    for (const n of nodes) {
      if (n.is_root) continue;
      const layer = n.node_type;
      if (seen.has(layer)) continue;
      seen.add(layer);
      const r = LAYER_RING[layer];
      if (!r) continue;
      out.push({ radius: r, tilt: LAYER_TILT[layer] ?? 0 });
    }
    return out;
  }, [nodes]);

  return (
    <group>
      <ambientLight intensity={0.7} />
      {/* Central "star" light at the My Training root */}
      <pointLight position={[0, 0, 0]} intensity={2.2} color="#fde68a" distance={20} decay={1.5} />
      <pointLight position={[10, 8, 10]} intensity={0.5} color="#60a5fa" />
      <pointLight position={[-10, -6, -8]} intensity={0.35} color="#f472b6" />

      {/* Faint orbit guides */}
      {rings.map((r, i) => (
        <OrbitRing key={i} radius={r.radius} tilt={r.tilt} />
      ))}

      {/* Edges (recomputed each frame from live positions) */}
      {edges.map((edge) => {
        const s = positionsRef.current.get(edge.source_node_id);
        const t = positionsRef.current.get(edge.target_node_id);
        if (!s || !t) return null;

        let state: 'highlighted' | 'dimmed' | 'normal' = 'normal';
        if (activeEdgeIds && activeEdgeIds.has(edge.id)) {
          state = 'highlighted';
        } else if (activeEdgeIds) {
          state = 'dimmed';
        } else if (hasOverride) {
          const inPath =
            highlightSet!.has(edge.source_node_id) && highlightSet!.has(edge.target_node_id);
          state = inPath ? 'highlighted' : 'dimmed';
        }
        return (
          <Edge3D
            key={edge.id}
            start={s}
            end={t}
            state={state}
            pulsePhase={edgePhase.get(edge.id) ?? 0}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const pos = positionsRef.current.get(node.id);
        if (!pos) return null;
        const isSelected = node.id === selectedNodeId;
        const isHovered = node.id === hoveredId;
        const isHighlighted = hasOverride ? highlightSet!.has(node.id) : false;
        const isDimmed =
          (hasOverride && !isHighlighted && !isSelected && !isHovered) ||
          (!!activeNodeId && node.id !== activeNodeId && !isSelected && !node.is_root);

        return (
          <Node3D
            key={node.id}
            node={node}
            position={pos}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            isHovered={isHovered}
            isDimmed={isDimmed}
            onSelect={() => onNodeClick(node.id === selectedNodeId ? null : node.id)}
            onHover={(h) => handleNodeHover(node.id, h)}
          />
        );
      })}
    </group>
  );
}

/* ---------- Canvas wrapper ---------- */
export function MapCanvas3D(props: MapCanvas3DProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const flyToTargetRef = useRef<THREE.Vector3 | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!hoveredId && controlsRef.current) {
      controlsRef.current.enabled = true;
    }
  }, [hoveredId]);

  // When selection clears, return camera focus to the center (root star)
  useEffect(() => {
    if (!props.selectedNodeId) {
      flyToTargetRef.current = new THREE.Vector3(0, 0, 0);
    }
  }, [props.selectedNodeId]);

  return (
    <div className="absolute inset-0" style={{ touchAction: 'none' }}>
      <Canvas
        camera={{ position: [0, 6, 18], fov: 55, near: 0.1, far: 400 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        onPointerMissed={() => {
          setHoveredId(null);
          props.onNodeClick(null);
        }}
      >
        <color attach="background" args={['#05060f']} />
        <fog attach="fog" args={['#05060f', 28, 60]} />
        {/* Deep-space starfield backdrop */}
        <Stars radius={120} depth={60} count={3500} factor={3.5} saturation={0} fade speed={0.6} />
        <Suspense fallback={null}>
          <Scene
            {...props}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            controlsRef={controlsRef}
            flyToTargetRef={flyToTargetRef}
          />
          <CameraRig targetRef={flyToTargetRef} controlsRef={controlsRef} />
        </Suspense>
        <OrbitControls
          ref={controlsRef as any}
          enablePan
          enableZoom
          enableRotate
          minDistance={5}
          maxDistance={40}
          autoRotate={false}
          dampingFactor={0.12}
          rotateSpeed={0.7}
          panSpeed={0.9}
          screenSpacePanning
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
        />
      </Canvas>

      {/* Controls hint overlay */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-center">
        <div className="px-3 py-1.5 rounded-full bg-black/55 border border-cyan-400/25 backdrop-blur-md text-[10px] text-cyan-100/80 font-medium tracking-wide">
          <span className="hidden sm:inline">Drag = rotate · Right-drag = pan · Scroll = zoom · Tap node = focus</span>
          <span className="sm:hidden">1 finger = rotate · 2 fingers = pan / zoom · Tap = focus</span>
        </div>
      </div>
    </div>
  );
}
