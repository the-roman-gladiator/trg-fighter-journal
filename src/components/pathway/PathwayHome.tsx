import { useState } from 'react';
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PathwayCard, type PathwayCardData, type AccentTheme, type TextureType } from './PathwayCard';
import iconTechnical from '@/assets/pathway-technical.png';
import iconSparring from '@/assets/pathway-sparring.png';
import iconStrength from '@/assets/pathway-strength.png';
import iconCardio from '@/assets/pathway-cardio.png';
import iconRecovery from '@/assets/pathway-recovery.png';
import iconMindset from '@/assets/pathway-mindset.png';

export type PathwayCategoryKey = 'technical' | 'sparring' | 'strength' | 'cardio' | 'stretching' | 'fight_review';

/* ====================================================================== */
/* Data-driven card definitions                                            */
/* ====================================================================== */
interface CardDef {
  key: PathwayCategoryKey;
  title: string;
  subtitle: string;
  icon: string;
  accentTheme: AccentTheme;
  textureType: TextureType;
}

const PATHWAY_CARDS: CardDef[] = [
  { key: 'technical',    title: 'Technical Skills',     subtitle: 'Neural Map · chains',   icon: iconTechnical, accentTheme: 'tech',     textureType: 'grid' },
  { key: 'sparring',     title: 'Sparring & Rolling',   subtitle: 'Live rounds & rolls',   icon: iconSparring,  accentTheme: 'sparring', textureType: 'streaks' },
  { key: 'strength',     title: 'Strength Training',    subtitle: 'Lifts, sets & load',    icon: iconStrength,  accentTheme: 'strength', textureType: 'lines' },
  { key: 'cardio',       title: 'Cardio & Conditioning',subtitle: 'Endurance & HR work',   icon: iconCardio,    accentTheme: 'cardio',   textureType: 'pulse' },
  { key: 'stretching',   title: 'Mobility & Recovery',  subtitle: 'Stretching · rehab',    icon: iconRecovery,  accentTheme: 'recovery', textureType: 'wave' },
  { key: 'fight_review', title: 'Mindset & Reflection', subtitle: 'Fight review',          icon: iconMindset,   accentTheme: 'mindset',  textureType: 'dots' },
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
    try { localStorage.setItem('pathway-variant', v); } catch { /* no-op */ }
  };

  return (
    <div className="pathway-shell">
      {/* Layered hero background (handled by .pathway-hero-bg ::before / ::after) */}
      <div className="pathway-hero-bg" />

      {/* Faint fighter silhouette top-right for atmosphere */}
      <FighterSilhouette />

      {/* ===== Header ===== */}
      <header className="relative z-10 px-5 pt-7 pb-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <span className="h-[2px] w-8 bg-gradient-to-r from-[color:var(--fj-red)] to-transparent shadow-[0_0_8px_var(--fj-red-glow)]" />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: 'var(--fj-text-muted)' }}>
              Fighter Journal
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1
                className="font-display uppercase font-black leading-[0.95] tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
                style={{ fontSize: 40, color: 'var(--fj-text)' }}
              >
                My<br />Pathway
              </h1>
              <p className="mt-2 tracking-wide" style={{ fontSize: 12, color: 'var(--fj-text-muted)' }}>
                Your training knowledge base
              </p>
            </div>
            {/* Variant toggle */}
            <div
              className="flex items-center gap-1 rounded-full p-1 backdrop-blur-md"
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid var(--fj-line-mid)',
                boxShadow: 'var(--fj-shadow-card)',
              }}
            >
              {(['A', 'B'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => switchVariant(v)}
                  className={cn(
                    'h-7 w-7 rounded-full text-[11px] font-bold transition-all',
                    variant === v
                      ? 'text-white shadow-[0_0_12px_var(--fj-red-glow)]'
                      : 'hover:text-white',
                  )}
                  style={
                    variant === v
                      ? { background: 'linear-gradient(180deg, var(--fj-red), var(--fj-red-dark))' }
                      : { color: 'var(--fj-text-muted)' }
                  }
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
          {PATHWAY_CARDS.map((def, idx) => {
            const { count, latest, avgIntensity } = categoryStats(def.key);
            const data: PathwayCardData = {
              id: def.key,
              title: def.title,
              subtitle: def.subtitle,
              icon: def.icon,
              sessionCount: count,
              avg: avgIntensity,
              lastDate: latest?.date ?? null,
              accentTheme: def.accentTheme,
              textureType: def.textureType,
            };
            return (
              <PathwayCard
                key={def.key}
                data={data}
                index={idx}
                variant={variant}
                onClick={() => onOpenCategory(def.key)}
              />
            );
          })}
        </div>

        {/* All Notes — uses the same premium card shell */}
        <button
          type="button"
          onClick={onOpenAllNotes}
          className="pathway-card group mt-4 block"
        >
          <span className="pathway-card-edge" />
          <span className="pathway-card-texture" />
          <div className="pathway-card-body !flex-row items-center gap-4">
            <span className="pathway-icon-badge pathway-icon-badge--bevel">
              <BookOpen className="h-5 w-5" style={{ color: 'var(--fj-red)' }} />
            </span>
            <div className="flex-1">
              <h3 className="pathway-title">All Notes</h3>
              <p className="pathway-subtitle">{archivedCount} archived sessions</p>
            </div>
            <ChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              style={{ color: 'var(--fj-text-muted)' }}
            />
          </div>
        </button>

        {/* Quote */}
        <div
          className="mt-4 relative rounded-[var(--fj-radius-card)] overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(28,10,12,0.9) 0%, rgba(9,12,17,0.98) 100%)',
            border: '1px solid rgba(255,43,43,0.22)',
            padding: '16px 18px',
            boxShadow: 'var(--fj-shadow-card), var(--fj-glow-red)',
          }}
        >
          <div className="absolute inset-0 opacity-50 pointer-events-none" style={{
            background: 'radial-gradient(circle at 20% 50%, var(--fj-red-glow), transparent 60%)',
          }} />
          <div className="relative flex items-start gap-3">
            <Sparkles
              className="h-4 w-4 mt-0.5 shrink-0"
              style={{ color: 'var(--fj-red)', filter: 'drop-shadow(0 0 6px var(--fj-red-glow))' }}
            />
            <p className="font-semibold italic leading-snug" style={{ color: 'var(--fj-text)', fontSize: 14 }}>
              "Progress is not given. It is earned session by session."
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ====================================================================== */
/* Faint fighter silhouette — atmospheric only                             */
/* ====================================================================== */
function FighterSilhouette() {
  return (
    <div
      className="absolute -top-6 -right-10 w-72 h-80 pointer-events-none"
      style={{
        opacity: 0.13,
        WebkitMaskImage: 'radial-gradient(ellipse at 60% 30%, black 30%, transparent 70%)',
        maskImage: 'radial-gradient(ellipse at 60% 30%, black 30%, transparent 70%)',
      }}
    >
      <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="fjFighterGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f5f7fb" />
            <stop offset="100%" stopColor="#8f1010" />
          </linearGradient>
        </defs>
        <path
          d="M100 18c-22 0-38 16-40 38-1 14 4 24 10 32-4 6-6 14-6 22 0 4 1 8 3 12l-18 14c-8 6-12 14-12 24v40c0 6 4 10 10 10h106c6 0 10-4 10-10v-40c0-10-4-18-12-24l-18-14c2-4 3-8 3-12 0-8-2-16-6-22 6-8 11-18 10-32-2-22-18-38-40-38z"
          fill="url(#fjFighterGrad)"
        />
        <ellipse cx="48" cy="158" rx="18" ry="22" fill="#ff2b2b" opacity="0.85" />
      </svg>
    </div>
  );
}
