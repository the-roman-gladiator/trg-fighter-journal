import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface Props {
  /** array of student user_ids */
  selected: string[];
  onChange: (next: string[]) => void;
  discipline?: string;
}

const GROUP_PRESETS = [
  { id: 'all', label: 'All Students' },
  { id: 'beginner', label: 'Beginners' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'fighters', label: 'Fighters' },
] as const;

/**
 * Picker for selecting which students may save a coach note. Supports:
 *  - Quick group presets (All / Beginners / Intermediate / Advanced / Fighters)
 *  - Per-student manual selection
 * Group presets resolve at click-time into the matching student ids.
 */
export function StudentOfferPicker({ selected, onChange, discipline }: Props) {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [fighterIds, setFighterIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, name, middle_name, surname, level, discipline');
      // Exclude the coach themselves; coaches can be students too but typically not relevant here.
      setStudents((profs || []).filter(p => p.id !== user?.id));

      const { data: fps } = await supabase
        .from('fighter_profiles')
        .select('user_id')
        .eq('fighter_status', 'approved');
      setFighterIds(new Set((fps || []).map((f: any) => f.user_id)));
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return students
      .filter(s => {
        if (!discipline || discipline === 'General') return true;
        if (!s.discipline) return true; // unknown discipline -> still show
        return String(s.discipline).split(',').map((d: string) => d.trim()).includes(discipline);
      })
      .filter(s => {
        if (!q) return true;
        const name = [s.name, s.middle_name, s.surname].filter(Boolean).join(' ').toLowerCase();
        return name.includes(q);
      });
  }, [students, search, discipline]);

  const applyGroup = (id: string) => {
    let ids: string[];
    if (id === 'all') ids = filtered.map(s => s.id);
    else if (id === 'fighters') ids = filtered.filter(s => fighterIds.has(s.id)).map(s => s.id);
    else ids = filtered.filter(s => (s.level || '').toLowerCase() === id).map(s => s.id);
    // merge unique
    onChange(Array.from(new Set([...selected, ...ids])));
  };

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id));
    else onChange([...selected, id]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {GROUP_PRESETS.map(g => (
          <Button key={g.id} type="button" size="sm" variant="outline"
            className="h-7 text-[11px]"
            onClick={() => applyGroup(g.id)}>
            + {g.label}
          </Button>
        ))}
        {selected.length > 0 && (
          <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground"
            onClick={() => onChange([])}>
            Clear ({selected.length})
          </Button>
        )}
      </div>

      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…" className="h-8" />

      <ScrollArea className="max-h-64 rounded border border-border">
        <div className="p-2 space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">No students found.</p>
          )}
          {filtered.map(s => {
            const fullName = [s.name, s.middle_name, s.surname].filter(Boolean).join(' ') || 'Student';
            return (
              <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted/30">
                <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                <span className="truncate flex-1">{fullName}</span>
                <span className="text-[10px] text-muted-foreground">{s.level}</span>
                {fighterIds.has(s.id) && (
                  <span className="text-[10px] text-primary">⚔︎</span>
                )}
              </label>
            );
          })}
        </div>
      </ScrollArea>

      <p className="text-[10px] text-muted-foreground">{selected.length} student{selected.length !== 1 ? 's' : ''} selected</p>
    </div>
  );
}
