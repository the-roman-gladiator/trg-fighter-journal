import { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
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

// Z-depth per layer so the graph reads as a 3D structure
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

// Convert 2D map coordinates → 3D world space (centered, scaled)
const SCALE = 0.012;

function toWorld(node: PathwayNode): [number, number, number] {
  const z = LAYER_Z[node.node_type] ?? 0;
  return [node.position_x * SCALE, -node.position_y * SCALE, z];
}

function Node3D({
  node,
  position,
  isSelected,
  isHighlighted,
  isDimmed,
  onClick,
}: {
  node: PathwayNode;
  position: [number, number, number];
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const colors = getNodeColor(node.node_type, node.color_tag);
  const baseRadius = node.is_root ? 0.45 : node.node_type === 'discipline' ? 0.35 : 0.22;

  useFrame(({ clock }) => {
    if (!haloRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 2 + position[0]) * 0.08;
    haloRef.current.scale.setScalar(pulse);
  });

  const opacity = isDimmed ? 0.18 : 1;
  const emissiveIntensity = isSelected || isHighlighted ? 1.6 : hovered ? 1.1 : 0.55;

  return (
    <group
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Glow halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[baseRadius * 1.8, 16, 16]} />
        <meshBasicMaterial color={colors.glow} transparent opacity={opacity * 0.18} depthWrite={false} />
      </mesh>
      {/* Core sphere */}
      <mesh ref={meshRef}>
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
      {(isSelected || hovered || node.is_root || node.node_type === 'discipline') && (
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

function Edge3D({
  start,
  end,
  isHighlighted,
  isDimmed,
}: {
  start: [number, number, number];
  end: [number, number, number];
  isHighlighted: boolean;
  isDimmed: boolean;
}) {
  const opacity = isDimmed ? 0.05 : isHighlighted ? 0.85 : 0.3;
  const color = isHighlighted ? '#67e8f9' : '#0ea5e9';
  return (
    <Line
      points={[start, end]}
      color={color}
      lineWidth={isHighlighted ? 2 : 1}
      transparent
      opacity={opacity}
    />
  );
}

function Scene({ nodes, edges, selectedNodeId, onNodeClick, pathwayNodeIdsOverride }: MapCanvas3DProps) {
  const positions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const n of nodes) map.set(n.id, toWorld(n));
    return map;
  }, [nodes]);

  // Center the graph at origin
  const center = useMemo(() => {
    if (nodes.length === 0) return [0, 0, 0] as [number, number, number];
    let sx = 0, sy = 0, sz = 0;
    for (const n of nodes) {
      const [x, y, z] = toWorld(n);
      sx += x; sy += y; sz += z;
    }
    return [sx / nodes.length, sy / nodes.length, sz / nodes.length] as [number, number, number];
  }, [nodes]);

  const highlightSet = pathwayNodeIdsOverride;
  const hasHighlight = !!(highlightSet && highlightSet.size > 0);

  return (
    <group position={[-center[0], -center[1], -center[2]]}>
      {/* Ambient + key light */}
      <ambientLight intensity={0.35} />
      <pointLight position={[10, 10, 10]} intensity={0.9} color="#60a5fa" />
      <pointLight position={[-10, -8, 6]} intensity={0.5} color="#f472b6" />

      {/* Edges */}
      {edges.map((edge) => {
        const s = positions.get(edge.source_node_id);
        const t = positions.get(edge.target_node_id);
        if (!s || !t) return null;
        const isHighlighted = hasHighlight
          ? highlightSet!.has(edge.source_node_id) && highlightSet!.has(edge.target_node_id)
          : false;
        const isDimmed = hasHighlight && !isHighlighted;
        return (
          <Edge3D
            key={edge.id}
            start={s}
            end={t}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        const isSelected = node.id === selectedNodeId;
        const isHighlighted = hasHighlight ? highlightSet!.has(node.id) : false;
        const isDimmed = hasHighlight && !isHighlighted && !isSelected;
        return (
          <Node3D
            key={node.id}
            node={node}
            position={pos}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
            onClick={() => onNodeClick(node.id === selectedNodeId ? null : node.id)}
          />
        );
      })}
    </group>
  );
}

export function MapCanvas3D(props: MapCanvas3DProps) {
  return (
    <div
      className="absolute inset-0"
      onClick={(e) => {
        // Click on empty canvas background deselects
        if (e.target === e.currentTarget) props.onNodeClick(null);
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 12], fov: 55, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#0a0a12']} />
        <fog attach="fog" args={['#0a0a12', 14, 30]} />
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={4}
          maxDistance={28}
          autoRotate={false}
          dampingFactor={0.1}
        />
      </Canvas>
    </div>
  );
}
