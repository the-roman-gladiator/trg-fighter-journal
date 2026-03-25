import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, BookOpen, Network, Search, X, Filter, GitBranch } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InteractiveMap } from '@/components/pathway/InteractiveMap';

type ViewMode = 'home' | 'all-notes' | 'interactive-map' | 'pathways';

interface PathwayChain {
  strategy: string;
  technique: string;
  firstMovement: string;
  opponentReaction: string;
  thirdMovement: string;
  count: number;
  sessions: any[];
}

export default function MyPathway() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('home');
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('all');
  const [filterStrategy, setFilterStrategy] = useState('all');

  // Interactive Map state
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mapResults, setMapResults] = useState<any[]>([]);
  const [mapLoading, setMapLoading] = useState(false);

  // Pathway filter
  const [pathwayFilter, setPathwayFilter] = useState('all');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // All sessions for pathways
    const { data: all } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .order('date', { ascending: false });

    setAllSessions(all || []);

    // All Notes = ALL sessions (no date filter)
    setArchivedSessions(all || []);

    // Load all tags
    const { data: tags } = await supabase.from('tags').select('*').order('name');
    setAllTags(tags || []);

    setLoading(false);
  };

  const filteredArchived = archivedSessions.filter(s => {
    if (filterDiscipline !== 'all' && s.discipline !== filterDiscipline) return false;
    if (filterStrategy !== 'all' && s.strategy !== filterStrategy) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const fields = [s.title, s.notes, s.discipline, s.first_movement, (s as any).technique, s.opponent_action, s.second_movement];
      if (!fields.some(f => f?.toLowerCase().includes(term))) return false;
    }
    return true;
  });

  // Build pathway chains from all sessions
  const pathwayChains = useMemo(() => {
    const chains = new Map<string, PathwayChain>();
    
    for (const s of allSessions) {
      if (!s.first_movement && !s.opponent_action && !s.second_movement) continue;
      
      const key = [s.strategy || '', (s as any).technique || '', s.first_movement || '', s.opponent_action || '', s.second_movement || ''].join('|||');
      
      if (chains.has(key)) {
        const existing = chains.get(key)!;
        existing.count++;
        existing.sessions.push(s);
      } else {
        chains.set(key, {
          strategy: s.strategy || '',
          technique: (s as any).technique || '',
          firstMovement: s.first_movement || '',
          opponentReaction: s.opponent_action || '',
          thirdMovement: s.second_movement || '',
          count: 1,
          sessions: [s],
        });
      }
    }

    return Array.from(chains.values()).sort((a, b) => b.count - a.count);
  }, [allSessions]);

  const filteredChains = pathwayChains.filter(c => {
    if (pathwayFilter === 'all') return true;
    return c.strategy === pathwayFilter || c.technique === pathwayFilter;
  });

  const uniqueStrategies = [...new Set(pathwayChains.map(c => c.strategy).filter(Boolean))];
  const uniqueTechniques = [...new Set(pathwayChains.map(c => c.technique).filter(Boolean))];

  const toggleTag = async (tagName: string) => {
    const newSelected = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    setSelectedTags(newSelected);
    await searchByTags(newSelected);
  };

  const searchByTags = async (tags: string[]) => {
    if (!user || tags.length === 0) { setMapResults([]); return; }
    setMapLoading(true);

    const { data: tagRows } = await supabase.from('tags').select('id').in('name', tags);
    if (!tagRows || tagRows.length === 0) { setMapResults([]); setMapLoading(false); return; }

    const tagIds = tagRows.map(t => t.id);
    const { data: sessionTags } = await supabase.from('session_tags').select('session_id, tag_id').in('tag_id', tagIds);
    if (!sessionTags) { setMapResults([]); setMapLoading(false); return; }

    const sessionTagCount: Record<string, number> = {};
    sessionTags.forEach(st => { sessionTagCount[st.session_id] = (sessionTagCount[st.session_id] || 0) + 1; });

    const matchingIds = Object.entries(sessionTagCount).filter(([, c]) => c >= tags.length).map(([id]) => id);
    if (matchingIds.length === 0) { setMapResults([]); setMapLoading(false); return; }

    const { data: matching } = await supabase
      .from('training_sessions').select('*').in('id', matchingIds).eq('user_id', user.id).order('date', { ascending: false });

    setMapResults(matching || []);
    setMapLoading(false);
  };

  const disciplines = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'];
  const strategies = ['Attacking', 'Defending', 'Countering', 'Intercepting', 'Transitions', 'Control'];

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  const SessionCard = ({ session }: { session: any }) => {
    const chain = [session.first_movement, session.opponent_action, session.second_movement].filter(Boolean).join(' → ');
    return (
      <Card className="cursor-pointer hover:border-primary/20" onClick={() => navigate(`/session/${session.id}`)}>
        <CardContent className="py-3">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{session.title || (session as any).technique || `${session.discipline} Training`}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(session.date), 'MMM d, yyyy')}{session.time && ` – ${session.time}`}</p>
              {chain && <p className="text-xs text-primary/70 mt-1 font-mono">{chain}</p>}
              {session.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{session.notes}</p>}
            </div>
            <div className="flex gap-1 ml-2 shrink-0">
              <Badge variant="outline" className="text-[10px]">{session.discipline}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Home
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            <h1 className="text-xl font-bold mt-2">My Pathway</h1>
            <p className="text-sm text-muted-foreground">Your training knowledge base</p>
          </div>
        </header>
        <main className="container mx-auto px-4 py-4 max-w-lg space-y-4">
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setView('pathways')}>
            <CardContent className="pt-6 pb-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Technical Pathways</h3>
                <p className="text-sm text-muted-foreground">{pathwayChains.length} movement chains recorded</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setView('all-notes')}>
            <CardContent className="pt-6 pb-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">All Notes</h3>
                <p className="text-sm text-muted-foreground">{archivedSessions.length} archived sessions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setView('interactive-map')}>
            <CardContent className="pt-6 pb-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Network className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Interactive Map</h3>
                <p className="text-sm text-muted-foreground">Explore knowledge by tags</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4 text-center">
              <p className="text-sm font-semibold text-primary italic">
                "Progress is not given. It is earned session by session."
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Technical Pathways
  if (view === 'pathways') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => setView('home')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            <h1 className="text-xl font-bold mt-2">Technical Pathways</h1>
            <p className="text-sm text-muted-foreground">Your movement chains and patterns</p>
          </div>
        </header>
        <main className="container mx-auto px-4 py-4 max-w-lg space-y-4">
          {/* Quick filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Badge variant={pathwayFilter === 'all' ? 'default' : 'outline'} className="cursor-pointer shrink-0" onClick={() => setPathwayFilter('all')}>All</Badge>
            {uniqueStrategies.map(s => (
              <Badge key={s} variant={pathwayFilter === s ? 'default' : 'outline'} className="cursor-pointer shrink-0" onClick={() => setPathwayFilter(s)}>{s}</Badge>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {uniqueTechniques.slice(0, 10).map(t => (
              <Badge key={t} variant={pathwayFilter === t ? 'default' : 'outline'} className="cursor-pointer shrink-0 text-xs" onClick={() => setPathwayFilter(t)}>{t}</Badge>
            ))}
          </div>

          {filteredChains.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No movement chains recorded yet. Add 1st/2nd/3rd movements to your sessions.</p>
          ) : (
            <div className="space-y-3">
              {filteredChains.map((chain, i) => (
                <Card key={i} className="border-l-2 border-l-primary/40">
                  <CardContent className="py-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-1.5">
                        {chain.strategy && <Badge variant="outline" className="text-[10px]">{chain.strategy}</Badge>}
                        {chain.technique && <Badge variant="secondary" className="text-[10px]">{chain.technique}</Badge>}
                      </div>
                      <Badge variant="default" className="text-[10px]">{chain.count}x</Badge>
                    </div>
                    <div className="space-y-1">
                      {chain.firstMovement && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5">1st</span>
                          <span className="text-xs">{chain.firstMovement}</span>
                        </div>
                      )}
                      {chain.opponentReaction && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">2nd</span>
                          <span className="text-xs">{chain.opponentReaction}</span>
                        </div>
                      )}
                      {chain.thirdMovement && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5">3rd</span>
                          <span className="text-xs">{chain.thirdMovement}</span>
                        </div>
                      )}
                    </div>
                    {/* Session links */}
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-[10px] text-muted-foreground mb-1">Sessions:</p>
                      <div className="flex gap-1 flex-wrap">
                        {chain.sessions.slice(0, 5).map(s => (
                          <Badge key={s.id} variant="outline" className="text-[10px] cursor-pointer" onClick={() => navigate(`/session/${s.id}`)}>
                            {format(new Date(s.date), 'MMM d')}
                          </Badge>
                        ))}
                        {chain.sessions.length > 5 && <Badge variant="outline" className="text-[10px]">+{chain.sessions.length - 5}</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // All Notes
  if (view === 'all-notes') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => setView('home')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            <h1 className="text-xl font-bold mt-2">All Notes</h1>
            <p className="text-sm text-muted-foreground">Sessions older than 7 days</p>
          </div>
        </header>
        <main className="container mx-auto px-4 py-4 max-w-lg space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Discipline" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Disciplines</SelectItem>
                {disciplines.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStrategy} onValueChange={setFilterStrategy}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Strategy" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                {strategies.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {filteredArchived.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No archived notes found.</p>
          ) : (
            <div className="space-y-2">
              {filteredArchived.map(s => <SessionCard key={s.id} session={s} />)}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Interactive Map
  return <InteractiveMap sessions={allSessions} onBack={() => setView('home')} />;
}
