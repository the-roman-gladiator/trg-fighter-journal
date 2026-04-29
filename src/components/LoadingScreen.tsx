import loadingWarrior from '@/assets/loading-warrior.png';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  label?: string;
  fullscreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-20 w-20 md:h-28 md:w-28',
  md: 'h-32 w-32 md:h-56 md:w-56 lg:h-64 lg:w-64',
  lg: 'h-44 w-44 md:h-72 md:w-72 lg:h-80 lg:w-80',
};

/**
 * Branded loading state featuring the martial arts warrior emblem.
 * The icon flips horizontally on its Y-axis while staying centered.
 */
export function LoadingScreen({
  label,
  fullscreen = true,
  size = 'md',
  className,
}: LoadingScreenProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        className,
      )}
    >
      <img
        src={loadingWarrior}
        alt=""
        aria-hidden="true"
        className={cn(
          'block object-contain animate-flip-y select-none pointer-events-none',
          sizeMap[size],
        )}
      />
      {label && (
        <p className="text-sm text-muted-foreground tracking-wide">{label}</p>
      )}
    </div>
  );

  if (!fullscreen) return content;

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center px-4">
      {content}
    </div>
  );
}

export default LoadingScreen;
