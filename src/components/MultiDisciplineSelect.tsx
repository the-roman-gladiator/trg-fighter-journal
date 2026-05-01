import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface MultiDisciplineSelectProps {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  helper?: string;
}

/**
 * Multi-select discipline buttons in a 2-column grid (matches Activity layout).
 * Tap a button to toggle; selected = primary, unselected = outline.
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((d) => {
          const active = value.includes(d);
          return (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              className={`text-xs min-h-10 h-auto py-2 px-2 whitespace-normal text-center leading-tight break-words ${active ? '' : 'border-border'}`}
              onClick={() => toggle(d)}
            >
              {d}
            </Button>
          );
        })}
      </div>

      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
      {value.length === 0 && (
        <p className="text-[11px] text-muted-foreground">Select one or more disciplines for this session.</p>
      )}
    </div>
  );
}
