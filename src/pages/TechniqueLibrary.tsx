import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, ExternalLink, BookOpen, Image as ImageIcon } from 'lucide-react';

interface TechniqueItem {
  id: string;
  discipline: string;
  tactic: string;
  name_en: string;
  name_original: string | null;
  image_url: string | null;
  youtube_search_query: string | null;
  notes: string | null;
  level: string;
  sort_order: number;
}

const LEVEL_COLORS: Record<string, string> = {
  Beginner: 'bg-emerald-600 text-white border-emerald-700',
  Intermediate: 'bg-amber-500 text-black border-amber-600',
  Advance: 'bg-rose-600 text-white border-rose-700',
};

const DISCIPLINE_COLORS: Record<string, string> = {
  'MMA': 'bg-red-900/30 text-red-400 border-red-800/40',
  'Muay Thai': 'bg-orange-900/30 text-orange-400 border-orange-800/40',
  'K1': 'bg-yellow-900/30 text-yellow-400 border-yellow-800/40',
  'BJJ': 'bg-purple-900/30 text-purple-400 border-purple-800/40',
  'Wrestling': 'bg-blue-900/30 text-blue-400 border-blue-800/40',
  'Grappling': 'bg-teal-900/30 text-teal-400 border-teal-800/40',
};

export default function TechniqueLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [tacticFilter, setTacticFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const { data: techniques = [], isLoading } = useQuery({
    queryKey: ['technique-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technique_library')
        .select('*')
        .order('discipline')
        .order('sort_order');
      if (error) throw error;
      return data as unknown as TechniqueItem[];
    },
    enabled: !!user,
  });

  const disciplines = useMemo(() =>
    [...new Set(techniques.map(t => t.discipline))].sort(),
    [techniques]
  );

  const tactics = useMemo(() => {
    const filtered = disciplineFilter === 'all'
      ? techniques
      : techniques.filter(t => t.discipline === disciplineFilter);
    return [...new Set(filtered.map(t => t.tactic))].sort();
  }, [techniques, disciplineFilter]);

  const filtered = useMemo(() => {
    let result = techniques;
    if (disciplineFilter !== 'all') {
      result = result.filter(t => t.discipline === disciplineFilter);
    }
    if (tacticFilter !== 'all') {
      result = result.filter(t => t.tactic === tacticFilter);
    }
    if (levelFilter !== 'all') {
      result = result.filter(t => t.level === levelFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.name_en.toLowerCase().includes(q) ||
        (t.name_original && t.name_original.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        t.tactic.toLowerCase().includes(q) ||
        t.discipline.toLowerCase().includes(q)
      );
    }
    return result;
  }, [techniques, disciplineFilter, tacticFilter, levelFilter, search]);

  // Group by discipline then tactic
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, TechniqueItem[]>>();
    filtered.forEach(t => {
      if (!map.has(t.discipline)) map.set(t.discipline, new Map());
      const tacMap = map.get(t.discipline)!;
      if (!tacMap.has(t.tactic)) tacMap.set(t.tactic, []);
      tacMap.get(t.tactic)!.push(t);
    });
    return map;
  }, [filtered]);

  const youtubeUrl = (query: string) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  let rowNumber = 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 max-w-lg flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-wide font-cinzel">Technique Library</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search techniques..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-2">
          <Select value={disciplineFilter} onValueChange={v => { setDisciplineFilter(v); setTacticFilter('all'); }}>
            <SelectTrigger className="text-sm h-9">
              <SelectValue placeholder="Discipline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Disciplines</SelectItem>
              {disciplines.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tacticFilter} onValueChange={setTacticFilter}>
            <SelectTrigger className="text-sm h-9">
              <SelectValue placeholder="Tactic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tactics</SelectItem>
              {tactics.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="text-sm h-9">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advance">Advance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>{filtered.length} techniques</span>
          <span>{disciplines.length} disciplines</span>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading library...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">No techniques found</div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([discipline, tacMap]) => (
              <div key={discipline} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs font-semibold ${DISCIPLINE_COLORS[discipline] || ''}`}>
                    {discipline}
                  </Badge>
                </div>

                {Array.from(tacMap.entries()).map(([tactic, items]) => (
                  <div key={`${discipline}-${tactic}`} className="space-y-1.5">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">
                      {tactic}
                    </h3>
                    {items.map(tech => {
                      rowNumber++;
                      return (
                        <Card key={tech.id} className="border-border/50 bg-card/50 hover:border-primary/20 transition-colors">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              {/* Row number */}
                              <div className="flex-shrink-0 w-7 h-7 rounded-md bg-secondary flex items-center justify-center">
                                <span className="text-[11px] font-bold text-muted-foreground">{rowNumber}</span>
                              </div>

                              {/* Image */}
                              <div className="flex-shrink-0 w-10 h-10 rounded-md bg-secondary/60 border border-border/30 flex items-center justify-center overflow-hidden">
                                {tech.image_url ? (
                                  <img src={tech.image_url} alt={tech.name_en} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                                )}
                              </div>

                              {/* Names + level */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-semibold text-foreground leading-tight">{tech.name_en}</p>
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 h-auto leading-none font-bold uppercase tracking-wide ${LEVEL_COLORS[tech.level] || ''}`}>
                                    {tech.level}
                                  </Badge>
                                </div>
                                {tech.name_original && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{tech.name_original}</p>
                                )}
                                {tech.notes && (
                                  <p className="text-[10px] text-muted-foreground/80 mt-0.5 leading-tight italic">{tech.notes}</p>
                                )}
                              </div>

                              {/* YouTube link */}
                              {tech.youtube_search_query && (
                                <a
                                  href={youtubeUrl(tech.youtube_search_query)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 p-1.5 rounded-md bg-red-900/20 hover:bg-red-900/40 transition-colors"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 text-red-400" />
                                </a>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
