import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  label?: string;
  fullscreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-6 w-6 border-2',
  md: 'h-10 w-10 border-[3px]',
  lg: 'h-14 w-14 border-4',
};

/**
 * Minimal branded loading state — a clean primary-colored spinner.
 */
export function LoadingScreen({
  label,
  fullscreen = true,
  size = 'md',
  className,
}: LoadingScreenProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-primary border-t-transparent animate-spin',
          sizeMap[size],
        )}
        role="status"
        aria-label="Loading"
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
