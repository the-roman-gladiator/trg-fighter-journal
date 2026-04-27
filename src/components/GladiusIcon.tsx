import { useState, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import gladiusPng from '@/assets/gladius-icon.png';

interface GladiusIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  alt?: string;
}

/**
 * Roman gladiator AI emblem.
 * Renders the optimized PNG by default and falls back to a crisp inline SVG
 * (centurion helmet + red crest) if the bitmap fails to load.
 */
export function GladiusIcon({
  className,
  alt = 'Gladius',
  width = 512,
  height = 512,
  loading = 'lazy',
  ...rest
}: GladiusIconProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <svg
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={alt}
        className={cn(className)}
      >
        <defs>
          <linearGradient id="gladius-crest" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(352 84% 55%)" />
            <stop offset="100%" stopColor="hsl(352 84% 35%)" />
          </linearGradient>
          <linearGradient id="gladius-metal" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(35 35% 55%)" />
            <stop offset="100%" stopColor="hsl(28 40% 22%)" />
          </linearGradient>
        </defs>

        {/* Crest plume */}
        <path
          d="M16 22 C16 10, 48 10, 48 22 L46 30 L18 30 Z"
          fill="url(#gladius-crest)"
        />
        {/* Crest ridges */}
        <g stroke="hsl(0 0% 0% / 0.3)" strokeWidth="0.8" strokeLinecap="round">
          <line x1="22" y1="12" x2="22" y2="28" />
          <line x1="28" y1="11" x2="28" y2="29" />
          <line x1="34" y1="11" x2="34" y2="29" />
          <line x1="40" y1="12" x2="40" y2="28" />
        </g>

        {/* Helmet dome */}
        <path
          d="M18 28 C18 20, 46 20, 46 28 L46 38 C46 44, 42 50, 38 52 L26 52 C22 50, 18 44, 18 38 Z"
          fill="url(#gladius-metal)"
          stroke="hsl(28 40% 18%)"
          strokeWidth="1"
        />

        {/* Brow band with star */}
        <path
          d="M20 30 L44 30 L42 35 L22 35 Z"
          fill="hsl(28 40% 18%)"
          opacity="0.6"
        />
        <path
          d="M32 28 L34 32 L38 32 L35 34.5 L36 38 L32 36 L28 38 L29 34.5 L26 32 L30 32 Z"
          fill="hsl(35 35% 60%)"
          opacity="0.85"
        />

        {/* Eye slits with glow */}
        <path d="M24 38 L30 38 L29 41 L24 40 Z" fill="hsl(20 95% 55%)" />
        <path d="M34 38 L40 38 L40 40 L35 41 Z" fill="hsl(20 95% 55%)" />

        {/* Nose guard */}
        <path
          d="M31 38 L33 38 L33 50 L32 51 L31 50 Z"
          fill="hsl(28 40% 22%)"
        />

        {/* Cheek guards */}
        <path
          d="M22 42 L26 44 L26 52 L23 52 Z"
          fill="hsl(352 84% 38%)"
          opacity="0.85"
        />
        <path
          d="M42 42 L38 44 L38 52 L41 52 Z"
          fill="hsl(352 84% 38%)"
          opacity="0.85"
        />
      </svg>
    );
  }

  return (
    <img
      src={gladiusPng}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      onError={() => setFailed(true)}
      className={cn(className)}
      {...rest}
    />
  );
}
