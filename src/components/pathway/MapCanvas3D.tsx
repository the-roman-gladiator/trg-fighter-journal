import { useRef, useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { PathwayNode, PathwayEdge } from './FuturisticMap';

interface MapCanvas3DProps {
  nodes: PathwayNode[];
  edges: PathwayEdge[];
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string | null) => void;
  pathwayNodeIdsOverride?: Set<string>;
}

const NODE_COLORS: Record<string, { core: string; glow: string }> = {
  root: { core: '#ffffff', glow: '#e0f2fe' },
  discipline: { core: '#E63946', glow: '#ff5d6c' },
  strategy: { core: '#FF7F11', glow: '#ffa64d' },
  technique: { core: '#2A9D8F', glow: '#4fc3b4' },
  movement1: { core: '#4CC9F0', glow: '#7fdcf5' },
  movement2: { core: '#F72585', glow: '#ff5cae' },
  movement3: { core: '#7FBA00', glow: '#a8d639' },
  movement: { core: '#4CC9F0', glow: '#7fdcf5' },
  reaction: { core: '#F72585', glow: '#ff5cae' },
  followup: { core: '#7FBA00', glow: '#a8d639' },
  tactic: { core: '#FF7F11', glow: '#ffa64d' },
  action: { core: '#2A9D8F', glow: '#4fc3b4' },
  default: { core: '#4CC9F0', glow: '#7fdcf5' },
};

function getNodeColor(type: string, colorTag: string | null) {
  if (colorTag) return { core: colorTag, glow: colorTag };
  return NODE_COLORS[type] || NODE_COLORS.default;
}

const LAYER_Z: Record<string, number> = {
  root: 0,
  discipline: 1.2,
  strategy: 2.4,
  tactic: 2.4,
  technique: 3.6,
  action: 3.6,
  movement1: 4.8,
  movement: 4.8,
  movement2: 6.0,
  reaction: 6.0,
  movement3: 7.2,
  followup: 7.2,
};

const SCALE = 0.012;

function toWorld(node: PathwayNode): [number, number, number] {
  const z = LAYER_Z[node.node_type] ?? 0;
  return [node.position_x * SCALE, -node.position_y * SCALE, z];
}

function nodeBaseRadius(node: PathwayNode): number {
  return node.is_root ? 0.45 : node.node_type === 'discipline' ? 0.35 : 0.22;
}

/* ---------- Containing wireframe sphere wrapping the whole structure ---------- */
function StructureSphere({ radius }: { radius: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04;
  });
  return (
    <group ref={ref}>
      {/* Wireframe outer shell */}
      <mesh>
        <sphereGeometry args={[radius, 32, 24]} />
        <meshBasicMaterial color="#0ea5e9" wireframe transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {/* Soft inner glow shell */}
      <mesh>
        <sphereGeometry args={[radius * 0.995, 32, 24]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.04} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------- Node ---------- */
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
  const colors = getNodeColor(node.node_type, node.color_tag);
  const baseRadius = nodeBaseRadius(node);

  // Generous invisible hit-sphere — much larger than visual radius for reliable mobile taps
  const hitRadius = Math.max(baseRadius * 3.2, 0.55);

  useFrame(({ clock }) => {
    if (!haloRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 2 + position[0]) * 0.08;
    haloRef.current.scale.setScalar(pulse);
  });

  const opacity = isDimmed ? 0.18 : 1;
  const emissiveIntensity =
    isSelected || isHighlighted || isHovered ? 1.6 : 0.55;

  return (
    <group position={position}>
      {/* Invisible large hit mesh for reliable tapping — sits in front so it always wins picking */}
      <mesh
        renderOrder={999}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          // Stops OrbitControls from grabbing the gesture as a rotation
          e.stopPropagation();
        }}
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

      {/* Glow halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[baseRadius * 1.8, 16, 16]} />
        <meshBasicMaterial
          color={colors.glow}
          transparent
          opacity={opacity * (isHovered || isSelected ? 0.32 : 0.18)}
          depthWrite={false}
        />
      </mesh>

      {/* Core sphere */}
      <mesh>
        <sphereGeometry args={[baseRadius, 24, 24]} />
        <meshStandardMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={opacity}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Label */}
      {(isSelected || isHovered || node.is_root || node.node_type === 'discipline') && (
        <Html
          center
          distanceFactor={10}
          position={[0, baseRadius + 0.35, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="px-2 py-0.5 rounded-md bg-black/70 border border-cyan-400/30 backdrop-blur-sm whitespace-nowrap text-[10px] text-cyan-100 font-medium">
            {node.title}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ---------- Edge ---------- */
function Edge3D({
  start,
  end,
  state,
}: {
  start: [number, number, number];
  end: [number, number, number];
  state: 'highlighted' | 'dimmed' | 'normal';
}) {
  const opacity = state === 'dimmed' ? 0.05 : state === 'highlighted' ? 0.95 : 0.3;
  const color = state === 'highlighted' ? '#67e8f9' : '#0ea5e9';
  const lineWidth = state === 'highlighted' ? 2.4 : 1;
  return (
    <Line points={[start, end]} color={color} lineWidth={lineWidth} transparent opacity={opacity} />
  );
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
}: MapCanvas3DProps & {
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const positions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const n of nodes) map.set(n.id, toWorld(n));
    return map;
  }, [nodes]);

  // Center + bounding radius for the containing sphere
  const { center, radius } = useMemo(() => {
    if (nodes.length === 0) {
      return { center: [0, 0, 0] as [number, number, number], radius: 4 };
    }
    let sx = 0, sy = 0, sz = 0;
    for (const n of nodes) {
      const [x, y, z] = toWorld(n);
      sx += x; sy += y; sz += z;
    }
    const cx = sx / nodes.length;
    const cy = sy / nodes.length;
    const cz = sz / nodes.length;
    let max = 0;
    for (const n of nodes) {
      const [x, y, z] = toWorld(n);
      const dx = x - cx, dy = y - cy, dz = z - cz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + nodeBaseRadius(n);
      if (d > max) max = d;
    }
    return { center: [cx, cy, cz] as [number, number, number], radius: Math.max(max * 1.25, 3) };
  }, [nodes]);

  const highlightSet = pathwayNodeIdsOverride;
  const hasOverride = !!(highlightSet && highlightSet.size > 0);

  // Build adjacency for hover/selection edge-glow
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

  // Active node = hovered (priority) OR selected — drives edge glow
  const activeNodeId = hoveredId ?? selectedNodeId;
  const activeEdgeIds = useMemo(() => {
    if (!activeNodeId) return null;
    return neighborEdges.get(activeNodeId) ?? new Set<string>();
  }, [activeNodeId, neighborEdges]);

  // Disable OrbitControls drag while pointer is over a node — guarantees a tap is a tap
  const handleNodeHover = useCallback(
    (id: string, hovered: boolean) => {
      setHoveredId(hovered ? id : null);
      if (controlsRef.current) {
        controlsRef.current.enabled = !hovered;
      }
    },
    [setHoveredId, controlsRef],
  );

  return (
    <group position={[-center[0], -center[1], -center[2]]}>
      <ambientLight intensity={0.35} />
      <pointLight position={[10, 10, 10]} intensity={0.9} color="#60a5fa" />
      <pointLight position={[-10, -8, 6]} intensity={0.5} color="#f472b6" />

      {/* Containing wireframe sphere wrapping the entire neural structure */}
      <group position={center}>
        <StructureSphere radius={radius} />
      </group>

      {/* Edges */}
      {edges.map((edge) => {
        const s = positions.get(edge.source_node_id);
        const t = positions.get(edge.target_node_id);
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

        return <Edge3D key={edge.id} start={s} end={t} state={state} />;
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        const isSelected = node.id === selectedNodeId;
        const isHovered = node.id === hoveredId;
        const isHighlighted = hasOverride ? highlightSet!.has(node.id) : false;
        const isDimmed =
          (hasOverride && !isHighlighted && !isSelected && !isHovered) ||
          (!!activeNodeId && node.id !== activeNodeId && !isSelected);

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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Safety: re-enable controls if hover state is lost (e.g. node unmount)
  useEffect(() => {
    if (!hoveredId && controlsRef.current) {
      controlsRef.current.enabled = true;
    }
  }, [hoveredId]);

  return (
    <div className="absolute inset-0" style={{ touchAction: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 55, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        onPointerMissed={() => {
          // Tap on empty space deselects + clears hover
          setHoveredId(null);
          props.onNodeClick(null);
        }}
      >
        <color attach="background" args={['#0a0a12']} />
        <fog attach="fog" args={['#0a0a12', 18, 38]} />
        <Suspense fallback={null}>
          <Scene
            {...props}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            controlsRef={controlsRef}
          />
        </Suspense>
        <OrbitControls
          ref={controlsRef as any}
          enablePan
          enableZoom
          enableRotate
          minDistance={4}
          maxDistance={28}
          autoRotate={false}
          dampingFactor={0.1}
          // Tighter touch handling so a tap is never interpreted as a rotate
          rotateSpeed={0.7}
        />
      </Canvas>
    </div>
  );
}
