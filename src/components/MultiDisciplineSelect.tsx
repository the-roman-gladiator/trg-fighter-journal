import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiDisciplineSelectProps {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  helper?: string;
}

/**
 * Multi-select discipline chips. A session can belong to several disciplines.
 * Selected items appear as removable pills; tap any unselected option to add.
 */
export function MultiDisciplineSelect({
  options,
  value,
  onChange,
  label = 'Discipline',
  helper,
}: MultiDisciplineSelectProps) {
  const toggle = (d: string) => {
    if (value.includes(d)) {
      onChange(value.filter(x => x !== d));
    } else {
      onChange([...value, d]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {/* Selected pills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(d => (
            <Badge
              key={d}
              variant="default"
              className="cursor-pointer text-xs px-2.5 py-1 bg-primary text-primary-foreground"
              onClick={() => toggle(d)}
            >
              {d}
              <X className="h-3 w-3 ml-1.5" />
            </Badge>
          ))}
        </div>
      )}

      {/* Available options */}
      <div className="flex flex-wrap gap-1.5">
        {options
          .filter(o => !value.includes(o))
          .map(d => (
            <Badge
              key={d}
              variant="outline"
              className={cn(
                'cursor-pointer text-xs px-2.5 py-1 border-border hover:border-primary/40 hover:bg-primary/5 transition-colors'
              )}
              onClick={() => toggle(d)}
            >
              {d}
            </Badge>
          ))}
      </div>

      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
      {value.length === 0 && (
        <p className="text-[11px] text-muted-foreground">Select one or more disciplines for this session.</p>
      )}
    </div>
  );
}
