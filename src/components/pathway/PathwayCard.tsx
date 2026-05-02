import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/* ====================================================================== */
/* Public types — data-driven                                             */
/* ====================================================================== */
export type AccentTheme = 'tech' | 'sparring' | 'strength' | 'cardio' | 'recovery' | 'mindset';
export type TextureType = 'grid' | 'lines' | 'wave' | 'pulse' | 'dots' | 'streaks';

export interface PathwayCardData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  sessionCount: number;
  avg: number | null;        // 0–5
  lastDate: string | null;   // ISO date
  accentTheme: AccentTheme;
  textureType: TextureType;  // kept for API compatibility (unused now for cleanliness)
}

interface Props {
  data: PathwayCardData;
  index: number;
  variant?: 'A' | 'B';
  onClick?: () => void;
}

/* Secondary accent per theme. Red is reserved for hero/danger only. */
const ACCENT_HSL: Record<AccentTheme, string> = {
  tech:     '210 100% 60%',
  sparring: '358 90% 55%',
  strength: '20 95% 55%',
  cardio:   '340 95% 60%',
  recovery: '180 70% 55%',
  mindset:  '270 70% 65%',
};

/* ====================================================================== */
/* Premium tactical card — clean, deep, minimal noise                     */
/* ====================================================================== */
export function PathwayCard({ data, index, variant = 'A', onClick }: Props) {
  const accent = ACCENT_HSL[data.accentTheme];
  const isTactical = variant === 'B';
  const isSparring = data.accentTheme === 'sparring';
  // Red glow ONLY where it matters (sparring / fight context)
  const useRedGlow = isSparring;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${data.title} — ${data.sessionCount} sessions`}
      className="group relative text-left w-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fj-blue)]/50"
      style={{
        borderRadius: 'var(--fj-radius-card)',
        background: 'linear-gradient(180deg, rgba(18,24,32,0.96) 0%, rgba(9,12,17,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: useRedGlow
          ? '0 18px 40px rgba(0,0,0,0.45), 0 6px 18px rgba(0,0,0,0.35), 0 0 22px rgba(255,43,43,0.12), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(255,255,255,0.02)'
          : 'var(--fj-shadow-card), var(--fj-shadow-inset)',
      }}
    >
      {/* Top accent hairline — single, refined */}
      <span
        className="absolute top-0 left-4 right-4 h-px pointer-events-none"
        style={{
          background: useRedGlow
            ? 'linear-gradient(90deg, transparent, var(--fj-red), transparent)'
            : `linear-gradient(90deg, transparent, hsl(${accent} / 0.7), transparent)`,
          opacity: 0.85,
        }}
      />

      {/* Soft accent vignette in corner — depth without noise */}
      <span
        className="absolute -top-10 -right-10 w-32 h-32 pointer-events-none"
        style={{
          background: `radial-gradient(circle, hsl(${accent} / 0.18), transparent 70%)`,
          filter: 'blur(2px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-[18px] flex flex-col gap-3 min-h-[168px]">
        {/* Top row: icon + count */}
        <div className="flex items-start justify-between">
          <span
            className="relative flex items-center justify-center shrink-0"
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: `linear-gradient(160deg, hsl(${accent} / 0.22), rgba(8,11,16,0.95))`,
              border: `1px solid hsl(${accent} / 0.35)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.45)`,
            }}
          >
            <img
              src={data.icon}
              alt=""
              loading="lazy"
              width={36}
              height={36}
              className="h-9 w-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
            />
          </span>

          <span
            className="font-display tabular-nums leading-none"
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: 'var(--fj-text)',
              textShadow: '0 2px 6px rgba(0,0,0,0.6)',
            }}
          >
            {data.sessionCount}
          </span>
        </div>

        {/* Title block */}
        <div className="min-w-0">
          <h3
            className="uppercase font-display leading-[1.05] truncate"
            style={{ fontWeight: 800, fontSize: 15, color: 'var(--fj-text)', letterSpacing: '0.01em' }}
          >
            {data.title}
          </h3>
          <p
            className="truncate mt-0.5"
            style={{ fontSize: 11, color: 'var(--fj-text-muted)', letterSpacing: '0.02em' }}
          >
            {data.subtitle}
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats footer */}
        <div className="space-y-2">
          {isTactical ? (
            <IntensityBar avg={data.avg} accent={accent} />
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full uppercase font-bold"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'var(--fj-text-soft)',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
                }}
              >
                <span style={{ color: `hsl(${accent})` }}>●</span> Sessions
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
          )}

          {data.lastDate ? (
            <p
              className="truncate font-mono uppercase"
              style={{ color: 'var(--fj-text-muted)', fontSize: 9.5, letterSpacing: '0.16em' }}
            >
              Last · {format(new Date(data.lastDate), 'MMM d')}
            </p>
          ) : (
            <p
              className="truncate font-mono uppercase"
              style={{ color: 'var(--fj-text-muted)', fontSize: 9.5, letterSpacing: '0.16em' }}
            >
              No sessions yet
            </p>
          )}
        </div>
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
          height: 5,
          borderRadius: 999,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, hsl(${accent}), hsl(${accent} / 0.7))`,
            boxShadow: `0 0 8px hsl(${accent} / 0.5)`,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}
