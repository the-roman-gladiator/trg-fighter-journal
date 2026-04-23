import { Check, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutosaveStatus as Status } from '@/hooks/useAutosave';

interface Props {
  status: Status;
  className?: string;
  /** Optional custom labels */
  labels?: Partial<Record<Status, string>>;
}

const DEFAULT_LABELS: Record<Status, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Failed to save',
};

/**
 * Tiny inline status pill — intentionally subtle.
 * Use anywhere near editable content (header, footer of a card, next to a label).
 */
export function AutosaveStatus({ status, className, labels }: Props) {
  if (status === 'idle') {
    return <span className={cn('inline-block h-4', className)} aria-hidden="true" />;
  }

  const text = labels?.[status] ?? DEFAULT_LABELS[status];

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-medium tracking-wide transition-opacity',
        status === 'saving' && 'text-muted-foreground',
        status === 'saved' && 'text-emerald-500',
        status === 'error' && 'text-destructive',
        className,
      )}
    >
      {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === 'saved' && <Check className="h-3 w-3" />}
      {status === 'error' && <AlertTriangle className="h-3 w-3" />}
      {text}
    </span>
  );
}
