import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// Seamless loop helper: use sin/cos with period = durationInFrames
// so frame 0 and frame durationInFrames produce identical values.

const seededRand = (seed: number) => {
  const x = Math.sin(seed * 9301.123 + 49297.7) * 43758.5453;
  return x - Math.floor(x);
};

export const NeuralBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = (frame / durationInFrames) * Math.PI * 2; // full loop

  // Edge-pushed cloud blobs (kept away from center)
  const clouds = [
    { baseX: 0.1, baseY: 0.12, color: "#6B21A8", rx: 0.55, ry: 0.28, op: 0.22, phase: 0 },
    { baseX: 0.92, baseY: 0.08, color: "#0d9488", rx: 0.48, ry: 0.22, op: 0.24, phase: 1.2 },
    { baseX: 0.95, baseY: 0.5, color: "#1d4ed8", rx: 0.4, ry: 0.32, op: 0.22, phase: 2.1 },
    { baseX: 0.08, baseY: 0.88, color: "#0891b2", rx: 0.45, ry: 0.24, op: 0.26, phase: 3.0 },
    { baseX: 0.7, baseY: 0.95, color: "#2563eb", rx: 0.5, ry: 0.22, op: 0.2, phase: 1.8 },
    { baseX: 0.05, baseY: 0.55, color: "#7e22ce", rx: 0.28, ry: 0.36, op: 0.18, phase: 0.5 },
  ];

  // Particles (low count, drifting)
  const particleCount = 28;
  const particles = Array.from({ length: particleCount }).map((_, i) => {
    const seedX = seededRand(i + 1);
    const seedY = seededRand(i + 100);
    const driftX = Math.sin(t + i * 0.7) * 0.04;
    const driftY = Math.cos(t * 0.8 + i * 0.5) * 0.03;
    const x = (seedX + driftX + 1) % 1;
    const y = (seedY + driftY + 1) % 1;
    // push toward edges: weight by distance from center
    const dx = x - 0.5;
    const dy = y - 0.5;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);
    const opacity = 0.15 + Math.min(distFromCenter * 1.4, 0.6) * (0.4 + Math.abs(Math.sin(t * 2 + i)) * 0.5);
    const r = 1 + seededRand(i + 50) * 2;
    const tint = i % 3 === 0 ? "#a0d8ef" : i % 3 === 1 ? "#c4b5fd" : "#ffffff";
    return { x: x * width, y: y * height, r, opacity, tint };
  });

  // Distant stars (fixed positions, gentle twinkle)
  const starCount = 60;
  const stars = Array.from({ length: starCount }).map((_, i) => {
    const x = seededRand(i + 200) * width;
    const y = seededRand(i + 300) * height;
    const twinkle = 0.15 + Math.abs(Math.sin(t * 1.5 + i * 0.9)) * 0.25;
    return { x, y, r: 0.6 + seededRand(i + 400) * 0.6, opacity: twinkle };
  });

  return (
    <AbsoluteFill style={{ background: "#00010f" }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="bg-deep" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#0a0e2a" stopOpacity="1" />
            <stop offset="100%" stopColor="#00010f" stopOpacity="1" />
          </radialGradient>
          <filter id="cloud-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="80" />
          </filter>
          <filter id="particle-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          {/* Center mask: keep middle clean */}
          <radialGradient id="center-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000010" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#000010" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000010" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Deep space base */}
        <rect x={0} y={0} width={width} height={height} fill="url(#bg-deep)" />

        {/* Drifting cloud layers — edge-positioned, slow seamless drift */}
        {clouds.map((c, i) => {
          const driftX = Math.sin(t + c.phase) * width * 0.04;
          const driftY = Math.cos(t * 0.85 + c.phase) * height * 0.03;
          const opPulse = c.op + Math.sin(t * 1.2 + c.phase) * 0.04;
          return (
            <ellipse
              key={`cloud${i}`}
              cx={c.baseX * width + driftX}
              cy={c.baseY * height + driftY}
              rx={width * c.rx}
              ry={height * c.ry}
              fill={c.color}
              opacity={opPulse}
              filter="url(#cloud-blur)"
            />
          );
        })}

        {/* Center clean overlay — preserves UI legibility */}
        <rect x={0} y={0} width={width} height={height} fill="url(#center-fade)" />

        {/* Distant stars */}
        {stars.map((s, i) => (
          <circle key={`s${i}`} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.opacity} />
        ))}

        {/* Drifting particles (edges) */}
        {particles.map((p, i) => (
          <circle
            key={`p${i}`}
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill={p.tint}
            opacity={p.opacity}
            filter="url(#particle-glow)"
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
