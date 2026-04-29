import loadingWarrior from '@/assets/loading-warrior.png';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  label?: string;
  fullscreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-12 w-12',
  md: 'h-20 w-20',
  lg: 'h-28 w-28',
};

/**
 * Branded loading state featuring the martial arts warrior emblem.
 * The outer ring rotates while the warrior stays centered and pulses softly.
 */
export function LoadingScreen({
  label = 'Loading...',
  fullscreen = true,
  size = 'md',
  className,
}: LoadingScreenProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className={cn('relative', sizeMap[size])}>
        <img
          src={loadingWarrior}
          alt="Loading"
          className="absolute inset-0 h-full w-full object-contain animate-spin"
          style={{ animationDuration: '2.4s' }}
        />
      </div>
      {label && (
        <p className="text-sm text-muted-foreground tracking-wide">{label}</p>
      )}
    </div>
  );

  if (!fullscreen) return content;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {content}
    </div>
  );
}

export default LoadingScreen;
