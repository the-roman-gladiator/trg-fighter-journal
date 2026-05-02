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
    <div className="relative min-h-screen bg-background">
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
                className="font-display uppercase font-black leading-[0.95] tracking-tight"
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
              className="flex items-center gap-1 rounded-full p-1"
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid var(--fj-line-mid)',
              }}
            >
              {(['A', 'B'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => switchVariant(v)}
                  className={cn(
                    'h-7 w-7 rounded-full text-[11px] font-bold transition-all',
                    variant === v ? 'text-white' : 'hover:text-white',
                  )}
                  style={
                    variant === v
                      ? {
                          background: 'linear-gradient(180deg, var(--fj-red), var(--fj-red-dark))',
                          boxShadow: '0 0 10px var(--fj-red-glow)',
                        }
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

        {/* All Notes — clean wide card */}
        <button
          type="button"
          onClick={onOpenAllNotes}
          className="group relative mt-4 block w-full overflow-hidden text-left transition-all duration-300 hover:-translate-y-0.5"
          style={{
            borderRadius: 'var(--fj-radius-card)',
            background: 'linear-gradient(180deg, rgba(18,24,32,0.96) 0%, rgba(9,12,17,0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'var(--fj-shadow-card), var(--fj-shadow-inset)',
          }}
        >
          <span
            className="absolute top-0 left-4 right-4 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }}
          />
          <div className="relative flex items-center gap-3 p-4">
            <span
              className="flex items-center justify-center shrink-0"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(8,11,16,0.95))',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <BookOpen className="h-5 w-5" style={{ color: 'var(--fj-text-soft)' }} />
            </span>
            <div className="flex-1 min-w-0">
              <h3
                className="uppercase font-display leading-tight"
                style={{ fontWeight: 800, fontSize: 15, color: 'var(--fj-text)', letterSpacing: '0.02em' }}
              >
                All Notes
              </h3>
              <p style={{ fontSize: 12, color: 'var(--fj-text-soft)' }}>
                <span className="font-display font-bold tabular-nums" style={{ color: 'var(--fj-text)' }}>{archivedCount}</span> archived sessions
              </p>
            </div>
            <ChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              style={{ color: 'var(--fj-text-muted)' }}
            />
          </div>
        </button>

        {/* Quote — subtle, not loud */}
        <div
          className="mt-4 relative overflow-hidden"
          style={{
            borderRadius: 'var(--fj-radius-card)',
            background: 'linear-gradient(180deg, rgba(18,24,32,0.96) 0%, rgba(9,12,17,0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '14px 16px',
            boxShadow: 'var(--fj-shadow-card), var(--fj-shadow-inset)',
          }}
        >
          <span
            className="absolute left-0 top-3 bottom-3 w-[2px]"
            style={{ background: 'var(--fj-red)', boxShadow: '0 0 8px var(--fj-red-glow)' }}
          />
          <div className="relative flex items-start gap-3 pl-2">
            <Sparkles
              className="h-4 w-4 mt-0.5 shrink-0"
              style={{ color: 'var(--fj-red)' }}
            />
            <p className="font-medium italic leading-snug" style={{ color: 'var(--fj-text-soft)', fontSize: 13 }}>
              "Progress is not given. It is earned session by session."
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
