import { useState } from 'react';
import { format } from 'date-fns';
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import iconTechnical from '@/assets/pathway-technical.png';
import iconSparring from '@/assets/pathway-sparring.png';
import iconStrength from '@/assets/pathway-strength.png';
import iconCardio from '@/assets/pathway-cardio.png';
import iconRecovery from '@/assets/pathway-recovery.png';
import iconMindset from '@/assets/pathway-mindset.png';

export type PathwayCategoryKey = 'technical' | 'sparring' | 'strength' | 'cardio' | 'stretching' | 'fight_review';

interface CardMeta {
  key: PathwayCategoryKey;
  title: string;
  subtitle: string;
  iconImg: string;
  /** Secondary accent in HSL (red is always primary) */
  accent: string;
  /** Soft texture pattern token */
  pattern: 'grid' | 'lines' | 'wave' | 'pulse' | 'dots' | 'streaks';
}

const CARDS: CardMeta[] = [
  { key: 'technical',    title: 'Technical Skills', subtitle: 'Neural Map · chains',  iconImg: iconTechnical, accent: '210 100% 60%', pattern: 'grid' },
  { key: 'sparring',     title: 'Sparring & Rolling', subtitle: 'Live rounds & rolls', iconImg: iconSparring,  accent: '358 90% 55%',  pattern: 'streaks' },
  { key: 'strength',     title: 'Strength Training',  subtitle: 'Lifts, sets & load',  iconImg: iconStrength,  accent: '20 95% 55%',   pattern: 'lines' },
  { key: 'cardio',       title: 'Cardio & Conditioning', subtitle: 'Endurance & HR work', iconImg: iconCardio, accent: '340 95% 60%', pattern: 'pulse' },
  { key: 'stretching',   title: 'Mobility & Recovery', subtitle: 'Stretching · rehab',  iconImg: iconRecovery,  accent: '180 70% 55%',  pattern: 'wave' },
  { key: 'fight_review', title: 'Mindset & Reflection', subtitle: 'Fight review',       iconImg: iconMindset,   accent: '270 70% 65%',  pattern: 'dots' },
];

interface Props {
  variant: 'A' | 'B';
  archivedCount: number;
  categoryStats: (k: PathwayCategoryKey) => { count: number; latest: any; avgIntensity: number | null };
  onOpenCategory: (k: PathwayCategoryKey) => void;
  onOpenAllNotes: () => void;
}

export function PathwayHome({ variant: initialVariant, archivedCount, categoryStats, onOpenCategory, onOpenAllNotes }: Props) {
  const [variant, setVariant] = useState<'A' | 'B'>(initialVariant);

  const switchVariant = (v: 'A' | 'B') => {
    setVariant(v);
    try { localStorage.setItem('pathway-variant', v); } catch {}
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[hsl(0_0%_3%)]">
      {/* ===== Layered atmospheric background ===== */}
      <BackgroundLayers variant={variant} />

      {/* ===== Header ===== */}
      <header className="relative z-10 px-5 pt-7 pb-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <span className="h-[2px] w-8 bg-gradient-to-r from-primary to-transparent shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-primary/80 uppercase">Fighter Journal</span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="font-display uppercase text-4xl leading-[0.95] tracking-tight font-black text-foreground drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                My<br/>Pathway
              </h1>
              <p className="text-xs text-muted-foreground mt-2 tracking-wide">Your training knowledge base</p>
            </div>
            {/* Variant switcher */}
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/60 backdrop-blur-md p-1 shadow-lg">
              {(['A', 'B'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => switchVariant(v)}
                  className={cn(
                    'h-7 w-7 rounded-full text-[11px] font-bold transition-all',
                    variant === v
                      ? 'bg-gradient-to-b from-primary to-[hsl(358_84%_38%)] text-white shadow-[0_0_12px_hsl(var(--primary)/0.6)]'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-label={`Variant ${v}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ===== Cards grid ===== */}
      <main className="relative z-10 px-4 pb-28 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {CARDS.map((meta, idx) => {
            const { count, latest, avgIntensity } = categoryStats(meta.key);
            return variant === 'A' ? (
              <CinematicCard
                key={meta.key}
                meta={meta}
                count={count}
                avgIntensity={avgIntensity}
                latest={latest}
                onClick={() => onOpenCategory(meta.key)}
                index={idx}
              />
            ) : (
              <TacticalCard
                key={meta.key}
                meta={meta}
                count={count}
                avgIntensity={avgIntensity}
                latest={latest}
                onClick={() => onOpenCategory(meta.key)}
                index={idx}
              />
            );
          })}
        </div>

        {/* All Notes */}
        <Card
          className="mt-4 cursor-pointer group relative overflow-hidden border-white/10 bg-gradient-to-br from-[hsl(0_0%_8%)] to-[hsl(0_0%_4%)] hover:border-primary/40 transition-all"
          onClick={onOpenAllNotes}
        >
          <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-transparent via-primary to-transparent" />
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl group-hover:bg-primary/25 transition-colors" />
          <CardContent className="py-4 flex items-center gap-4 relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[hsl(0_0%_14%)] to-[hsl(0_0%_6%)] border border-white/10 flex items-center justify-center shadow-inner">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display uppercase tracking-wide font-bold text-sm">All Notes</h3>
              <p className="text-[11px] text-muted-foreground">{archivedCount} archived sessions</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </CardContent>
        </Card>

        {/* Quote */}
        <div className="mt-4 relative rounded-xl border border-primary/25 bg-gradient-to-br from-[hsl(358_50%_8%)] to-[hsl(0_0%_4%)] p-4 overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.25), transparent 60%)'
          }} />
          <div className="relative flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0 drop-shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
            <p className="text-sm font-semibold text-foreground/90 italic leading-snug">
              "Progress is not given. It is earned session by session."
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ====================================================================== */
/* Background atmosphere                                                   */
/* ====================================================================== */
function BackgroundLayers({ variant }: { variant: 'A' | 'B' }) {
  return (
    <>
      {/* Base gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: variant === 'A'
          ? 'radial-gradient(ellipse 90% 60% at 50% -10%, hsl(358 60% 14% / 0.7), transparent 60%), radial-gradient(ellipse 70% 50% at 100% 30%, hsl(220 60% 12% / 0.5), transparent 65%), linear-gradient(180deg, hsl(0 0% 4%) 0%, hsl(0 0% 2.5%) 100%)'
          : 'radial-gradient(ellipse 80% 50% at 50% 0%, hsl(358 70% 12% / 0.55), transparent 55%), linear-gradient(180deg, hsl(220 15% 5%) 0%, hsl(0 0% 3%) 100%)'
      }} />

      {/* Tactical grid (variant B is more visible) */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:
          'linear-gradient(hsl(0 0% 100% / 0.025) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.025) 1px, transparent 1px)',
        backgroundSize: variant === 'B' ? '32px 32px' : '48px 48px',
        opacity: variant === 'B' ? 0.5 : 0.25,
        maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 80%)',
      }} />

      {/* Diagonal accent lines */}
      {variant === 'A' && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{
          backgroundImage: 'repeating-linear-gradient(135deg, hsl(var(--primary)) 0 1px, transparent 1px 80px)'
        }} />
      )}

      {/* Fighter silhouette top-right */}
      <div
        className="absolute -top-6 -right-10 w-72 h-80 pointer-events-none opacity-[0.13]"
        style={{
          maskImage: 'radial-gradient(ellipse at 60% 30%, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 60% 30%, black 30%, transparent 70%)',
        }}
      >
        <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="fighterGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(0 0% 95%)" />
              <stop offset="100%" stopColor="hsl(358 80% 45%)" />
            </linearGradient>
          </defs>
          {/* Hooded fighter silhouette */}
          <path
            d="M100 18c-22 0-38 16-40 38-1 14 4 24 10 32-4 6-6 14-6 22 0 4 1 8 3 12l-18 14c-8 6-12 14-12 24v40c0 6 4 10 10 10h106c6 0 10-4 10-10v-40c0-10-4-18-12-24l-18-14c2-4 3-8 3-12 0-8-2-16-6-22 6-8 11-18 10-32-2-22-18-38-40-38z"
            fill="url(#fighterGrad)"
          />
          {/* Glove */}
          <ellipse cx="48" cy="158" rx="18" ry="22" fill="hsl(358 85% 45%)" opacity="0.9" />
        </svg>
      </div>

      {/* Soft red glow focal point */}
      <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[120%] h-64 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.18), transparent 60%)' }} />

      {/* Noise texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay" style={{
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")"
      }} />
    </>
  );
}

/* ====================================================================== */
/* VARIANT A — Cinematic dark-glass cards                                  */
/* ====================================================================== */
interface CardProps {
  meta: CardMeta;
  count: number;
  avgIntensity: number | null;
  latest: any;
  onClick: () => void;
  index: number;
}

function CinematicCard({ meta, count, avgIntensity, latest, onClick }: CardProps) {
  const accent = meta.accent;
  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-[22px] p-[1px] overflow-hidden transition-transform duration-200 active:scale-[0.98] hover:scale-[1.015] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      style={{
        background: `linear-gradient(140deg, hsl(${accent} / 0.45), hsl(0 0% 100% / 0.06) 35%, hsl(0 0% 0% / 0.4) 70%, hsl(var(--primary) / 0.35))`,
      }}
    >
      {/* Outer ambient glow */}
      <span className="pointer-events-none absolute -inset-2 rounded-[26px] opacity-0 group-hover:opacity-100 transition-opacity blur-xl"
        style={{ background: `radial-gradient(circle at 50% 0%, hsl(${accent} / 0.4), transparent 70%)` }} />

      {/* Inner card */}
      <div className="relative rounded-[21px] overflow-hidden h-full"
        style={{
          background: 'linear-gradient(160deg, hsl(0 0% 11%) 0%, hsl(0 0% 6%) 50%, hsl(0 0% 4%) 100%)',
          boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.07), inset 0 -20px 30px -20px hsl(0 0% 0% / 0.7), 0 10px 24px -10px hsl(0 0% 0% / 0.8)',
        }}
      >
        {/* Top inner highlight */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Pattern overlay */}
        <PatternOverlay pattern={meta.pattern} accent={accent} />

        {/* Cut-corner accent panel top-right */}
        <span
          className="pointer-events-none absolute top-0 right-0 h-7 w-14"
          style={{
            background: `linear-gradient(135deg, transparent 50%, hsl(${accent} / 0.35) 50%, hsl(var(--primary) / 0.4))`,
            clipPath: 'polygon(20% 0, 100% 0, 100% 100%)',
          }}
        />
        {/* Index marker */}
        <span className="absolute top-1.5 right-2 text-[8px] font-mono font-bold text-white/70 tracking-wider">
          FJ·{String(CARDS.findIndex(c => c.key === meta.key) + 1).padStart(2, '0')}
        </span>

        {/* Side accent stripe */}
        <span className="pointer-events-none absolute left-0 top-4 bottom-4 w-[2px] rounded-r"
          style={{ background: `linear-gradient(180deg, transparent, hsl(${accent}), hsl(var(--primary)), transparent)`, boxShadow: `0 0 8px hsl(${accent} / 0.6)` }} />

        <div className="relative p-3.5 space-y-2.5">
          {/* Icon badge */}
          <div className="relative h-14 w-14">
            <span className="absolute inset-0 rounded-2xl blur-md opacity-70" style={{ background: `radial-gradient(circle, hsl(${accent} / 0.55), transparent 70%)` }} />
            <div
              className="relative h-14 w-14 flex items-center justify-center overflow-hidden"
              style={{
                clipPath: 'polygon(20% 0, 80% 0, 100% 25%, 100% 75%, 80% 100%, 20% 100%, 0 75%, 0 25%)',
                background: 'linear-gradient(160deg, hsl(0 0% 14%), hsl(0 0% 4%))',
                boxShadow: `inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 0 0 1px hsl(${accent} / 0.35), 0 0 12px hsl(${accent} / 0.3)`,
              }}
            >
              <img src={meta.iconImg} alt="" loading="lazy" width={44} height={44} className="h-11 w-11 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h3 className="font-display uppercase font-black text-[13px] leading-[1.05] tracking-wide text-foreground">
              {meta.title}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{meta.subtitle}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums"
              style={{
                background: `linear-gradient(180deg, hsl(${accent} / 0.18), hsl(0 0% 0% / 0.5))`,
                color: `hsl(${accent})`,
                boxShadow: `inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 0 0 1px hsl(${accent} / 0.4), 0 0 8px hsl(${accent} / 0.2)`,
              }}
            >
              {count} <span className="opacity-70 font-medium">SES</span>
            </span>
            {avgIntensity !== null && (
              <span className="text-[10px] text-foreground/70 font-mono tabular-nums">
                {avgIntensity.toFixed(1)}<span className="text-muted-foreground">/5</span>
              </span>
            )}
          </div>
          {latest && (
            <p className="text-[9px] text-muted-foreground/80 truncate font-mono uppercase tracking-wider">
              ◢ Last: {format(new Date(latest.date), 'MMM d')}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

/* ====================================================================== */
/* VARIANT B — Tactical / engineered cards                                 */
/* ====================================================================== */
function TacticalCard({ meta, count, avgIntensity, latest, onClick }: CardProps) {
  const accent = meta.accent;
  const idx = CARDS.findIndex(c => c.key === meta.key) + 1;
  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.98] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      style={{
        background: 'linear-gradient(180deg, hsl(0 0% 10%) 0%, hsl(220 8% 6%) 100%)',
        boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.06), inset 0 0 0 1px hsl(0 0% 100% / 0.05), 0 12px 30px -12px hsl(0 0% 0% / 0.85)',
      }}
    >
      {/* Hover glow */}
      <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ boxShadow: `0 0 0 1px hsl(${accent} / 0.5), 0 0 24px hsl(${accent} / 0.3)` }} />

      {/* Corner brackets (tactical) */}
      <Bracket position="tl" color={`hsl(var(--primary))`} />
      <Bracket position="tr" color={`hsl(var(--primary))`} />
      <Bracket position="bl" color={`hsl(${accent})`} />
      <Bracket position="br" color={`hsl(${accent})`} />

      {/* Pattern */}
      <PatternOverlay pattern={meta.pattern} accent={accent} />

      {/* Top engineered strip */}
      <div className="relative h-7 flex items-center justify-between px-2.5 border-b border-white/5"
        style={{ background: 'linear-gradient(180deg, hsl(0 0% 13%), hsl(0 0% 8%))' }}
      >
        <span className="text-[8px] font-mono font-bold tracking-[0.2em] text-muted-foreground">
          FJ-{String(idx).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
          <span className="text-[8px] font-mono font-bold tracking-wider" style={{ color: `hsl(${accent})` }}>
            ACTIVE
          </span>
        </div>
      </div>

      <div className="relative p-3 space-y-2.5">
        {/* Icon — beveled hex */}
        <div className="flex items-start justify-between">
          <div className="relative h-12 w-12">
            <span className="absolute inset-0 blur-md opacity-50" style={{ background: `radial-gradient(circle, hsl(${accent} / 0.6), transparent 70%)` }} />
            <div
              className="relative h-12 w-12 flex items-center justify-center"
              style={{
                clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
                background: `linear-gradient(160deg, hsl(${accent} / 0.25), hsl(0 0% 6%))`,
                boxShadow: `inset 0 1px 0 hsl(0 0% 100% / 0.15), inset 0 0 0 1px hsl(${accent} / 0.5)`,
              }}
            >
              <img src={meta.iconImg} alt="" loading="lazy" width={40} height={40} className="h-10 w-10 object-contain" />
            </div>
          </div>
          <span className="font-display text-3xl font-black tabular-nums leading-none mt-1"
            style={{ color: `hsl(${accent})`, textShadow: `0 0 12px hsl(${accent} / 0.5)` }}>
            {count}
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-display uppercase font-black text-[13px] leading-[1.05] tracking-wide text-foreground">
            {meta.title}
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{meta.subtitle}</p>
        </div>

        {/* Intensity bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-wider text-muted-foreground">
            <span>Intensity</span>
            <span className="text-foreground/80">{avgIntensity !== null ? `${avgIntensity.toFixed(1)}/5` : '—'}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden bg-black/60 border border-white/5">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${avgIntensity !== null ? (avgIntensity / 5) * 100 : 0}%`,
                background: `linear-gradient(90deg, hsl(${accent}), hsl(var(--primary)))`,
                boxShadow: `0 0 6px hsl(${accent} / 0.6)`,
              }}
            />
          </div>
        </div>

        {latest && (
          <p className="text-[9px] text-muted-foreground/80 truncate font-mono uppercase tracking-wider">
            ▸ {format(new Date(latest.date), 'MMM d, yyyy')}
          </p>
        )}
      </div>
    </button>
  );
}

function Bracket({ position, color }: { position: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
  const base = 'absolute h-3 w-3 pointer-events-none';
  const map = {
    tl: { className: `${base} top-1 left-1`, style: { borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` } },
    tr: { className: `${base} top-1 right-1`, style: { borderTop: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` } },
    bl: { className: `${base} bottom-1 left-1`, style: { borderBottom: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` } },
    br: { className: `${base} bottom-1 right-1`, style: { borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` } },
  } as const;
  return <span className={map[position].className} style={map[position].style} />;
}

/* ====================================================================== */
/* Pattern overlays                                                        */
/* ====================================================================== */
function PatternOverlay({ pattern, accent }: { pattern: CardMeta['pattern']; accent: string }) {
  const stroke = `hsl(${accent} / 0.4)`;
  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.10]"
      viewBox="0 0 200 200"
      preserveAspectRatio="none"
      aria-hidden
    >
      {pattern === 'grid' && (
        <g stroke={stroke} strokeWidth="0.4" fill="none">
          {Array.from({ length: 10 }).map((_, i) => (
            <g key={i}>
              <line x1={i * 20} y1="0" x2={i * 20} y2="200" />
              <line x1="0" y1={i * 20} x2="200" y2={i * 20} />
            </g>
          ))}
        </g>
      )}
      {pattern === 'lines' && (
        <g stroke={stroke} strokeWidth="0.6" fill="none">
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1={-50 + i * 25} y1="0" x2={i * 25} y2="200" />
          ))}
        </g>
      )}
      {pattern === 'wave' && (
        <g stroke={stroke} strokeWidth="0.8" fill="none">
          {[40, 80, 120, 160].map((y) => (
            <path key={y} d={`M0 ${y} Q 25 ${y - 14} 50 ${y} T 100 ${y} T 150 ${y} T 200 ${y}`} />
          ))}
        </g>
      )}
      {pattern === 'pulse' && (
        <path
          d="M0 100 L40 100 L50 70 L60 130 L70 50 L80 150 L90 100 L200 100"
          stroke={stroke}
          strokeWidth="0.9"
          fill="none"
        />
      )}
      {pattern === 'dots' && (
        <g fill={stroke}>
          {Array.from({ length: 10 }).flatMap((_, x) =>
            Array.from({ length: 10 }).map((_, y) => (
              <circle key={`${x}-${y}`} cx={x * 20 + 10} cy={y * 20 + 10} r="0.8" />
            ))
          )}
        </g>
      )}
      {pattern === 'streaks' && (
        <g stroke={stroke} strokeWidth="0.6" fill="none">
          {[20, 60, 100, 140, 180].map((y) => (
            <line key={y} x1="0" y1={y} x2="200" y2={y - 8} strokeDasharray="2 6" />
          ))}
        </g>
      )}
    </svg>
  );
}
