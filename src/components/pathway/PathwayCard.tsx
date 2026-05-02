import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/* ====================================================================== */
/* Public types — data-driven by an array of these                         */
/* ====================================================================== */
export type AccentTheme = 'tech' | 'sparring' | 'strength' | 'cardio' | 'recovery' | 'mindset';
export type TextureType = 'grid' | 'lines' | 'wave' | 'pulse' | 'dots' | 'streaks';

export interface PathwayCardData {
  id: string;
  title: string;
  subtitle: string;
  /** Imported PNG / SVG path */
  icon: string;
  sessionCount: number;
  avg: number | null;        // 0–5
  lastDate: string | null;   // ISO date
  accentTheme: AccentTheme;
  textureType: TextureType;
}

interface Props {
  data: PathwayCardData;
  index: number;
  /** A = cinematic dark-glass, B = tactical engineered */
  variant?: 'A' | 'B';
  onClick?: () => void;
}

/* ====================================================================== */
/* Accent theme → secondary HSL accent (red is always the global primary) */
/* ====================================================================== */
const ACCENT_HSL: Record<AccentTheme, string> = {
  tech:     '210 100% 60%', // electric blue
  sparring: '358 90% 55%',  // deep crimson
  strength: '20 95% 55%',   // ember orange
  cardio:   '340 95% 60%',  // pulse pink
  recovery: '180 70% 55%',  // soft cyan
  mindset:  '270 70% 65%',  // subtle violet
};

/* ====================================================================== */
/* Reusable PathwayCard — built from layered pseudo-elements & wrappers    */
/* ====================================================================== */
export function PathwayCard({ data, index, variant = 'A', onClick }: Props) {
  const accent = ACCENT_HSL[data.accentTheme];
  const idLabel = `FJ·${String(index + 1).padStart(2, '0')}`;
  const isTactical = variant === 'B';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'pathway-card group focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fj-blue)]/50',
      )}
      aria-label={`${data.title} — ${data.sessionCount} sessions`}
    >
      {/* Layer 1 — angled top accent panel */}
      <span className="pathway-card-angle" style={{
        background: `linear-gradient(135deg, transparent 55%, hsl(${accent} / 0.18) 55%, rgba(255,43,43,0.18))`
      }} />

      {/* Layer 2 — top accent slash */}
      <span className="pathway-card-slash" style={{
        background: `linear-gradient(90deg, var(--fj-red), hsl(${accent}))`,
      }} />

      {/* Layer 3 — side blue edge highlight */}
      <span className="pathway-card-edge" style={{
        background: `linear-gradient(180deg, transparent, hsl(${accent}), var(--fj-red), transparent)`,
      }} />

      {/* Layer 4 — subtle texture overlay (0.06) */}
      <TextureLayer type={data.textureType} accent={accent} />

      {/* Layer 5 — index marker */}
      <span
        className="absolute top-2 right-3 font-mono font-bold tracking-[0.15em]"
        style={{ fontSize: 9, color: 'var(--fj-text-soft)', zIndex: 3 }}
      >
        {idLabel}
      </span>

      {/* Layer 6 — content body */}
      <div className="pathway-card-body">
        {/* Icon row */}
        <div className="flex items-start justify-between">
          <div className="relative">
            <span className="pathway-icon-badge-glow" />
            <span
              className={cn(
                'pathway-icon-badge',
                isTactical ? 'pathway-icon-badge--hex' : 'pathway-icon-badge--bevel',
              )}
              style={{
                boxShadow: `0 8px 20px rgba(0,0,0,0.35), 0 0 18px rgba(255,43,43,0.14), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px hsl(${accent} / 0.25)`,
              }}
            >
              <img
                src={data.icon}
                alt=""
                loading="lazy"
                width={42}
                height={42}
                className="h-[42px] w-[42px] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
              />
            </span>
          </div>
          {isTactical && (
            <span
              className="font-display tabular-nums leading-none mt-1"
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: 'var(--fj-text)',
                textShadow: `0 0 14px hsl(${accent} / 0.45), 0 2px 4px rgba(0,0,0,0.6)`,
              }}
            >
              {data.sessionCount}
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className="pathway-title">{data.title}</h3>
          <p className="pathway-subtitle truncate">{data.subtitle}</p>
        </div>

        {/* Stats */}
        {!isTactical ? (
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="pathway-metric-pill">
              {data.sessionCount}
              <span className="label">SES</span>
            </span>
            {data.avg !== null && (
              <span
                className="font-mono tabular-nums"
                style={{ fontSize: 11, color: 'var(--fj-text-soft)' }}
              >
                {data.avg.toFixed(1)}
                <span style={{ color: 'var(--fj-text-muted)' }}>/5</span>
              </span>
            )}
          </div>
        ) : (
          <IntensityBar avg={data.avg} accent={accent} />
        )}

        {data.lastDate && (
          <p
            className="truncate font-mono uppercase tracking-[0.15em]"
            style={{ color: 'var(--fj-text-muted)', fontSize: 9.5 }}
          >
            {isTactical ? '▸' : '◢'} Last: {format(new Date(data.lastDate), 'MMM d')}
          </p>
        )}
      </div>
    </button>
  );
}

/* ---------------------------------------------------------------------- */
/* Tactical intensity bar (variant B)                                     */
/* ---------------------------------------------------------------------- */
function IntensityBar({ avg, accent }: { avg: number | null; accent: string }) {
  const pct = avg !== null ? (avg / 5) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div
        className="flex items-center justify-between font-mono uppercase"
        style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--fj-text-muted)' }}
      >
        <span>Intensity</span>
        <span style={{ color: 'var(--fj-text-soft)' }}>
          {avg !== null ? `${avg.toFixed(1)}/5` : '—'}
        </span>
      </div>
      <div
        className="overflow-hidden"
        style={{
          height: 6,
          borderRadius: 999,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, hsl(${accent}), var(--fj-red))`,
            boxShadow: `0 0 8px hsl(${accent} / 0.6)`,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Subtle SVG texture layer                                               */
/* ---------------------------------------------------------------------- */
function TextureLayer({ type, accent }: { type: TextureType; accent: string }) {
  const stroke = `hsl(${accent} / 0.45)`;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.07, zIndex: 0 }}
      viewBox="0 0 200 200"
      preserveAspectRatio="none"
      aria-hidden
    >
      {type === 'grid' && (
        <g stroke={stroke} strokeWidth="0.4" fill="none">
          {Array.from({ length: 10 }).map((_, i) => (
            <g key={i}>
              <line x1={i * 20} y1="0" x2={i * 20} y2="200" />
              <line x1="0" y1={i * 20} x2="200" y2={i * 20} />
            </g>
          ))}
        </g>
      )}
      {type === 'lines' && (
        <g stroke={stroke} strokeWidth="0.6" fill="none">
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1={-50 + i * 25} y1="0" x2={i * 25} y2="200" />
          ))}
        </g>
      )}
      {type === 'wave' && (
        <g stroke={stroke} strokeWidth="0.8" fill="none">
          {[40, 80, 120, 160].map((y) => (
            <path key={y} d={`M0 ${y} Q 25 ${y - 14} 50 ${y} T 100 ${y} T 150 ${y} T 200 ${y}`} />
          ))}
        </g>
      )}
      {type === 'pulse' && (
        <path
          d="M0 100 L40 100 L50 70 L60 130 L70 50 L80 150 L90 100 L200 100"
          stroke={stroke}
          strokeWidth="0.9"
          fill="none"
        />
      )}
      {type === 'dots' && (
        <g fill={stroke}>
          {Array.from({ length: 10 }).flatMap((_, x) =>
            Array.from({ length: 10 }).map((_, y) => (
              <circle key={`${x}-${y}`} cx={x * 20 + 10} cy={y * 20 + 10} r="0.8" />
            ))
          )}
        </g>
      )}
      {type === 'streaks' && (
        <g stroke={stroke} strokeWidth="0.6" fill="none">
          {[20, 60, 100, 140, 180].map((y) => (
            <line key={y} x1="0" y1={y} x2="200" y2={y - 8} strokeDasharray="2 6" />
          ))}
        </g>
      )}
    </svg>
  );
}
