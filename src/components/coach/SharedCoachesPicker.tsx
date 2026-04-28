import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface CoachShare {
  shared_with: string;
  permission: 'view' | 'comment';
  see_student_status: boolean;
  see_class_plan: boolean;
}

interface Props {
  selected: CoachShare[];
  onChange: (next: CoachShare[]) => void;
}

/**
 * Picker for selecting other coaches to share a coach note with.
 * Lists every user with a coach_level. Only takes effect when the parent
 * sets visibility_scope to 'selected_coaches'.
 */
export function SharedCoachesPicker({ selected, onChange }: Props) {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, middle_name, surname, coach_level')
        .not('coach_level', 'is', null);
      setCoaches((data || []).filter(c => c.id !== user?.id));
    })();
  }, [user]);

  const toggle = (coachId: string) => {
    const exists = selected.find(s => s.shared_with === coachId);
    if (exists) {
      onChange(selected.filter(s => s.shared_with !== coachId));
    } else {
      onChange([...selected, {
        shared_with: coachId,
        permission: 'view',
        see_student_status: false,
        see_class_plan: true,
      }]);
    }
  };

  const update = (coachId: string, patch: Partial<CoachShare>) => {
    onChange(selected.map(s => s.shared_with === coachId ? { ...s, ...patch } : s));
  };

  if (coaches.length === 0) {
    return <p className="text-xs text-muted-foreground">No other coaches in the organization yet.</p>;
  }

  return (
    <ScrollArea className="max-h-72 rounded border border-border">
      <div className="p-2 space-y-2">
        {coaches.map(c => {
          const fullName = [c.name, c.middle_name, c.surname].filter(Boolean).join(' ') || 'Coach';
          const sel = selected.find(s => s.shared_with === c.id);
          return (
            <div key={c.id} className="rounded p-2 bg-muted/20 space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={!!sel} onCheckedChange={() => toggle(c.id)} />
                <span className="truncate">{fullName}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{c.coach_level}</span>
              </label>
              {sel && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <div>
                    <Label className="text-[10px]">Permission</Label>
                    <Select value={sel.permission} onValueChange={(v: any) => update(c.id, { permission: v })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View only</SelectItem>
                        <SelectItem value="comment">View + comment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1 pt-3.5">
                    <label className="flex items-center gap-1.5 text-[11px]">
                      <Checkbox checked={sel.see_class_plan}
                        onCheckedChange={(v) => update(c.id, { see_class_plan: !!v })} />
                      See class plan
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px]">
                      <Checkbox checked={sel.see_student_status}
                        onCheckedChange={(v) => update(c.id, { see_student_status: !!v })} />
                      See student status
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
