import { cn } from '@/lib/utils';

export type TrendRange = 'weekly' | 'monthly' | '6months';

const OPTIONS: { value: TrendRange; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: '6months', label: '6 Months' },
];

interface TrendRangeSelectorProps {
  value: TrendRange;
  onChange: (v: TrendRange) => void;
}

export function TrendRangeSelector({ value, onChange }: TrendRangeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-card/40 p-1">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md px-2 py-1.5 text-xs font-semibold transition-all',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
