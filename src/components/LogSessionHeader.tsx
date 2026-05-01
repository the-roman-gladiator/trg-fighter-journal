import { useState } from 'react';
import { Menu } from 'lucide-react';

const CATEGORIES = [
  'TECHNICAL SKILLS',
  'SPARRING & ROLLING',
  'CARDIO & ENDURANCE',
  'STRENGTH & CONDITIONING',
  'STRETCHING & MOBILITY',
  'MY FIGHT REVIEW',
] as const;

export type LogSessionCategory = typeof CATEGORIES[number];

interface LogSessionHeaderProps {
  date?: Date;
  defaultCategory?: LogSessionCategory;
  onCategoryChange?: (category: LogSessionCategory) => void;
  onMenuClick?: () => void;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function LogSessionHeader({
  date = new Date(),
  defaultCategory = 'TECHNICAL SKILLS',
  onCategoryChange,
  onMenuClick,
}: LogSessionHeaderProps) {
  const [selected, setSelected] = useState<LogSessionCategory>(defaultCategory);

  const handleSelect = (c: LogSessionCategory) => {
    setSelected(c);
    onCategoryChange?.(c);
  };

  return (
    <div
      className="w-full"
      style={{
        background: '#000000',
        padding: 'clamp(16px, 4vw, 28px)',
        fontFamily: 'inherit',
      }}
    >
      {/* Header row */}
      <div
        className="flex items-start justify-between"
        style={{ marginBottom: 'clamp(16px, 3.5vw, 28px)' }}
      >
        <div>
          <h1
            className="font-bold text-white leading-tight"
            style={{ fontSize: 'clamp(24px, 5.5vw, 36px)', letterSpacing: '-0.01em' }}
          >
            Log session
          </h1>
          <p
            className="text-muted-foreground"
            style={{ fontSize: 'clamp(12px, 2.4vw, 14px)', marginTop: 'clamp(2px, 0.6vw, 6px)' }}
          >
            {formatDate(date)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="text-white hover:opacity-80 transition-opacity"
          style={{ padding: 'clamp(4px, 1vw, 8px)' }}
        >
          {/* Pro 3-line hamburger, middle line slightly shorter */}
          <svg
            width="clamp(22px, 4.5vw, 28px)"
            height="clamp(22px, 4.5vw, 28px)"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 'clamp(22px, 4.5vw, 28px)', height: 'clamp(22px, 4.5vw, 28px)' }}
          >
            <line x1="4" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="4" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="4" y1="20" x2="24" y2="20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Category grid */}
      <div
        className="grid grid-cols-3"
        style={{ gap: 'clamp(8px, 1.6vw, 14px)' }}
      >
        {CATEGORIES.map((c) => {
          const isActive = selected === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => handleSelect(c)}
              className="font-bold uppercase text-white transition-colors flex items-center justify-center text-center"
              style={{
                background: isActive ? '#cc0000' : '#111111',
                border: isActive ? '1px solid transparent' : '1px solid #2e2e2e',
                borderRadius: '6px',
                padding: 'clamp(14px, 3.2vw, 22px) clamp(6px, 1.4vw, 12px)',
                minHeight: 'clamp(72px, 14vw, 110px)',
                fontSize: 'clamp(10px, 1.8vw, 13px)',
                lineHeight: 1.2,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#4a4a4a';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#2e2e2e';
                }
              }}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
