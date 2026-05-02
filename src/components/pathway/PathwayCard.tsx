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
      className="group relative text-left w-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fj-blue)]/50"
      style={{
        borderRadius: 'var(--fj-radius-card)',
        background: 'linear-gradient(180deg, rgba(18,24,32,0.96) 0%, rgba(9,12,17,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: useRedGlow
          ? '0 12px 28px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.4), 0 0 18px rgba(255,43,43,0.10), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.4)'
          : '0 12px 28px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.4)',
      }}
    >
      {/* Subtle hover sheen — button-like */}
      <span
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-[18px] flex flex-col gap-3 min-h-[168px] border border-[#2541f4] border-solid">
        {/* Top row: icon + count */}
        <div className="flex items-start justify-between">
          <span
            className="relative flex items-center justify-center shrink-0"
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(8,11,16,0.95))',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.4)',
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

          <div className="flex flex-col items-end leading-none">
            <span
              className="font-display tabular-nums leading-none"
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: 'var(--fj-text)',
                textShadow: '0 2px 6px rgba(0,0,0,0.6)',
              }}
            >
              {data.sessionCount}
            </span>
            <span
              className="mt-1 uppercase font-bold"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                color: `hsl(${accent} / 0.95)`,
              }}
            >
              {data.sessionCount === 1 ? 'Session' : 'Sessions'}
            </span>
          </div>
        </div>

        {/* Title block */}
        <div className="min-w-0">
          <h3
            className="uppercase leading-[1.05] truncate font-sans font-bold"
            style={{ fontWeight: 800, fontSize: 16, color: 'var(--fj-text)', letterSpacing: '0.015em' }}
          >
            {data.title}
          </h3>
          <p
            className="truncate mt-1"
            style={{ fontSize: 12, color: 'var(--fj-text-soft)', letterSpacing: '0.01em' }}
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
            data.avg !== null && (
              <div className="flex items-center justify-between gap-2">
                <span
                  className="uppercase font-bold"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: '0.16em',
                    color: 'var(--fj-text-muted)',
                  }}
                >
                  Avg Intensity
                </span>
                <span
                  className="font-display tabular-nums font-bold"
                  style={{ fontSize: 13, color: 'var(--fj-text)' }}
                >
                  {data.avg.toFixed(1)}
                  <span style={{ color: 'var(--fj-text-muted)', fontWeight: 500 }}>/5</span>
                </span>
              </div>
            )
          )}

          <p
            className="truncate uppercase font-semibold"
            style={{
              color: data.lastDate ? 'var(--fj-text-soft)' : 'var(--fj-text-muted)',
              fontSize: 10.5,
              letterSpacing: '0.14em',
            }}
          >
            {data.lastDate
              ? `Last · ${format(new Date(data.lastDate), 'MMM d')}`
              : 'No sessions yet'}
          </p>
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
      <div className="flex items-center justify-between">
        <span
          className="uppercase font-bold"
          style={{ fontSize: 10.5, letterSpacing: '0.16em', color: 'var(--fj-text-muted)' }}
        >
          Intensity
        </span>
        <span
          className="font-display tabular-nums font-bold"
          style={{ fontSize: 12, color: 'var(--fj-text)' }}
        >
          {avg !== null ? (
            <>
              {avg.toFixed(1)}
              <span style={{ color: 'var(--fj-text-muted)', fontWeight: 500 }}>/5</span>
            </>
          ) : '—'}
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
