import { useState } from 'react';
import loadingWarrior from '@/assets/loading-warrior.png';
import { Button } from '@/components/ui/button';

/**
 * TEMPORARY debug route — mount the loading-warrior PNG on a series of
 * fully contrasting backgrounds. Any stray non-transparent pixels (white halo,
 * grey matte, leftover background) will become visible against at least one
 * of these surfaces. Remove this route once the asset is verified.
 */
const BACKGROUNDS = [
  { name: 'White', value: '#ffffff', text: '#000' },
  { name: 'Black', value: '#000000', text: '#fff' },
  { name: 'Magenta', value: '#ff00ff', text: '#000' },
  { name: 'Cyan', value: '#00ffff', text: '#000' },
  { name: 'Lime', value: '#00ff00', text: '#000' },
  { name: 'Checkerboard', value: 'checker', text: '#000' },
] as const;

const checkerStyle: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
  backgroundSize: '24px 24px',
  backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
  backgroundColor: '#ffffff',
};

export default function LoadingDebug() {
  const [bgIndex, setBgIndex] = useState(0);
  const bg = BACKGROUNDS[bgIndex];
  const isChecker = bg.value === 'checker';

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center gap-6 p-6"
      style={isChecker ? checkerStyle : { backgroundColor: bg.value }}
    >
      <div className="flex flex-wrap gap-2 justify-center">
        {BACKGROUNDS.map((b, i) => (
          <Button
            key={b.name}
            size="sm"
            variant={i === bgIndex ? 'default' : 'outline'}
            onClick={() => setBgIndex(i)}
          >
            {b.name}
          </Button>
        ))}
      </div>

      <p
        className="text-sm font-mono"
        style={{ color: bg.text }}
      >
        Background: <strong>{bg.name}</strong> — any halo or square edge means non-transparent pixels.
      </p>

      <div className="flex flex-col items-center gap-8">
        {/* Raw <img> — no animation, no wrapper background */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-mono" style={{ color: bg.text }}>
            raw img · 320px
          </span>
          <img
            src={loadingWarrior}
            alt="warrior"
            className="h-80 w-80 object-contain"
          />
        </div>

        {/* Side-by-side at small size */}
        <div className="flex gap-6 items-center">
          {[64, 128, 200].map((px) => (
            <div key={px} className="flex flex-col items-center gap-1">
              <span className="text-xs font-mono" style={{ color: bg.text }}>
                {px}px
              </span>
              <img
                src={loadingWarrior}
                alt=""
                style={{ height: px, width: px }}
                className="object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
