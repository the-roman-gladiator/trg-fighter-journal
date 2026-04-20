import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface PredictiveTagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disciplines?: string[]; // for ranking suggestions
}

interface TagStat {
  name: string;
  count: number;
  lastUsed: number; // ms timestamp
  disciplines: Set<string>;
}

/**
 * Predictive tag input. Suggestions are sourced from this user's
 * own session history and ranked by:
 *  1. Most recently used
 *  2. Most frequently used
 *  3. Tags overlapping the currently selected disciplines
 * Free custom tags are accepted (Enter / + button).
 */
export function PredictiveTagInput({
  selectedTags,
  onTagsChange,
  disciplines = [],
}: PredictiveTagInputProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<TagStat[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    // Pull recent sessions (last 200) with their tags + discipline info.
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id, date, discipline, disciplines')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(200);

    if (!sessions || sessions.length === 0) {
      setStats([]);
      return;
    }

    const sessionIds = sessions.map(s => s.id);
    const { data: tagJoins } = await supabase
      .from('session_tags')
      .select('session_id, tags(name)')
      .in('session_id', sessionIds);

    const sessionMeta = new Map<string, { date: string; disciplines: string[] }>();
    sessions.forEach((s: any) => {
      const ds: string[] = Array.isArray(s.disciplines) && s.disciplines.length > 0
        ? s.disciplines
        : [s.discipline].filter(Boolean);
      sessionMeta.set(s.id, { date: s.date, disciplines: ds });
    });

    const map = new Map<string, TagStat>();
    (tagJoins || []).forEach((row: any) => {
      const name = row.tags?.name?.trim();
      if (!name) return;
      const meta = sessionMeta.get(row.session_id);
      const ts = meta ? new Date(meta.date).getTime() : 0;
      const existing = map.get(name.toLowerCase());
      if (existing) {
        existing.count += 1;
        if (ts > existing.lastUsed) existing.lastUsed = ts;
        meta?.disciplines.forEach(d => existing.disciplines.add(d));
      } else {
        map.set(name.toLowerCase(), {
          name,
          count: 1,
          lastUsed: ts,
          disciplines: new Set(meta?.disciplines || []),
        });
      }
    });

    setStats(Array.from(map.values()));
  };

  const suggestions = useMemo(() => {
    const lowerSelected = new Set(selectedTags.map(t => t.toLowerCase()));
    const lowerInput = input.trim().toLowerCase();
    const discSet = new Set(disciplines);

    const filtered = stats.filter(s => {
      if (lowerSelected.has(s.name.toLowerCase())) return false;
      if (lowerInput && !s.name.toLowerCase().includes(lowerInput)) return false;
      return true;
    });

    // Score: discipline overlap (3) + recency bucket (0-2) + frequency (capped 2)
    const now = Date.now();
    const day = 1000 * 60 * 60 * 24;
    const scored = filtered.map(s => {
      const recencyDays = s.lastUsed ? (now - s.lastUsed) / day : 999;
      const recencyScore = recencyDays < 7 ? 2 : recencyDays < 30 ? 1 : 0;
      const freqScore = Math.min(s.count, 2);
      const discScore = disciplines.length > 0 && [...s.disciplines].some(d => discSet.has(d)) ? 3 : 0;
      return { ...s, score: discScore + recencyScore + freqScore };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.lastUsed !== a.lastUsed) return b.lastUsed - a.lastUsed;
      return b.count - a.count;
    });

    return scored.slice(0, 12);
  }, [stats, selectedTags, input, disciplines]);

  const addTag = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (selectedTags.some(t => t.toLowerCase() === name.toLowerCase())) {
      setInput('');
      return;
    }
    onTagsChange([...selectedTags, name]);
    setInput('');
  };

  const removeTag = (name: string) => {
    onTagsChange(selectedTags.filter(t => t !== name));
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const exactMatchExists = suggestions.some(s => s.name.toLowerCase() === input.trim().toLowerCase());
  const showCreateHint = input.trim().length > 0 && !exactMatchExists;

  return (
    <div className="space-y-2.5">
      <Label>Tags</Label>

      {/* Selected chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map(t => (
            <Badge
              key={t}
              variant="default"
              className="cursor-pointer text-xs px-2.5 py-1 bg-primary text-primary-foreground max-w-full"
              onClick={() => removeTag(t)}
            >
              <span className="truncate">{t}</span>
              <X className="h-3 w-3 ml-1.5 shrink-0" />
            </Badge>
          ))}
        </div>
      )}

      {/* Input + add button */}
      <div className="flex gap-2">
        <Input
          placeholder="Type a tag…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          className="flex-1 min-w-0"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => addTag(input)}
          disabled={!input.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showCreateHint && (
        <p className="text-[11px] text-muted-foreground">
          Press Enter to add <span className="text-foreground font-medium">"{input.trim()}"</span> as a new tag.
        </p>
      )}

      {/* Suggestions from history */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">
            Suggested {input ? 'matches' : 'from your history'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(s => (
              <Badge
                key={s.name}
                variant="outline"
                className="cursor-pointer text-xs px-2.5 py-1 border-border hover:border-primary/40 hover:bg-primary/5 transition-colors max-w-full"
                onClick={() => addTag(s.name)}
                title={`Used ${s.count}× • ${s.lastUsed ? new Date(s.lastUsed).toLocaleDateString() : 'no date'}`}
              >
                <span className="truncate">{s.name}</span>
                {s.count > 1 && <span className="text-muted-foreground ml-1.5">×{s.count}</span>}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
