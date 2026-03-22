import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, BookOpen, Network, Search, X, Filter } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ViewMode = 'home' | 'all-notes' | 'interactive-map';

export default function MyPathway() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('home');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('all');
  const [filterStrategy, setFilterStrategy] = useState('all');

  // Interactive Map state
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mapResults, setMapResults] = useState<any[]>([]);
  const [mapLoading, setMapLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const sevenDaysAgo = subDays(new Date(), 7).toISOString().split('T')[0];

    // All Notes: sessions older than 7 days
    const { data } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'Completed')
      .lt('date', sevenDaysAgo)
      .order('date', { ascending: false });

    setSessions(data || []);

    // Load all tags
    const { data: tags } = await supabase.from('tags').select('*').order('name');
    setAllTags(tags || []);

    setLoading(false);
  };

  const filteredSessions = sessions.filter(s => {
    if (filterDiscipline !== 'all' && s.discipline !== filterDiscipline) return false;
    if (filterStrategy !== 'all' && s.strategy !== filterStrategy) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = s.title?.toLowerCase().includes(term);
      const matchNotes = s.notes?.toLowerCase().includes(term);
      const matchDiscipline = s.discipline?.toLowerCase().includes(term);
      const matchMovement = s.first_movement?.toLowerCase().includes(term);
      if (!matchTitle && !matchNotes && !matchDiscipline && !matchMovement) return false;
    }
    return true;
  });

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

    // Get tag IDs
    const { data: tagRows } = await supabase
      .from('tags')
      .select('id')
      .in('name', tags);

    if (!tagRows || tagRows.length === 0) { setMapResults([]); setMapLoading(false); return; }

    const tagIds = tagRows.map(t => t.id);

    // Get session IDs that have ALL selected tags (AND logic)
    const { data: sessionTags } = await supabase
      .from('session_tags')
      .select('session_id, tag_id')
      .in('tag_id', tagIds);

    if (!sessionTags) { setMapResults([]); setMapLoading(false); return; }

    // Group by session and filter for sessions that have ALL tags
    const sessionTagCount: Record<string, number> = {};
    sessionTags.forEach(st => {
      sessionTagCount[st.session_id] = (sessionTagCount[st.session_id] || 0) + 1;
    });

    const matchingSessionIds = Object.entries(sessionTagCount)
      .filter(([, count]) => count >= tags.length)
      .map(([id]) => id);

    if (matchingSessionIds.length === 0) { setMapResults([]); setMapLoading(false); return; }

    const { data: matchingSessions } = await supabase
      .from('training_sessions')
      .select('*')
      .in('id', matchingSessionIds)
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    setMapResults(matchingSessions || []);
    setMapLoading(false);
  };

  const clearMapFilters = () => {
    setSelectedTags([]);
    setMapResults([]);
  };

  const disciplines = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ', 'Strength Training', 'Cardio Activity'];
  const strategies = ['Attacking', 'Defending', 'Countering', 'Intercepting', 'Transitions', 'Control'];

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  // Home view
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
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setView('all-notes')}>
            <CardContent className="pt-6 pb-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">All Notes</h3>
                <p className="text-sm text-muted-foreground">{sessions.length} archived sessions</p>
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

  // All Notes view
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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
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

          {/* Results */}
          {filteredSessions.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No archived notes found.</p>
          ) : (
            <div className="space-y-2">
              {filteredSessions.map(session => (
                <Card key={session.id} className="cursor-pointer hover:border-primary/20" onClick={() => navigate(`/session/${session.id}`)}>
                  <CardContent className="py-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{session.title || `${session.discipline} Training`}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(session.date), 'MMM d, yyyy')}</p>
                        {session.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{session.notes}</p>}
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <Badge variant="outline" className="text-xs">{session.discipline}</Badge>
                        {session.strategy && <Badge variant="outline" className="text-xs">{session.strategy}</Badge>}
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

  // Interactive Map view
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => setView('home')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <h1 className="text-xl font-bold mt-2">Interactive Map</h1>
          <p className="text-sm text-muted-foreground">Select tags to explore your knowledge</p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-4 max-w-lg space-y-4">
        {/* Tag chips */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> Tags</CardTitle>
              {selectedTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearMapFilters} className="text-xs">
                  <X className="h-3 w-3 mr-1" /> Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags yet. Add tags when creating sessions.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.name) ? 'default' : 'outline'}
                    className="cursor-pointer text-sm px-3 py-1"
                    onClick={() => toggleTag(tag.name)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {selectedTags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {mapLoading ? 'Searching...' : `${mapResults.length} session${mapResults.length !== 1 ? 's' : ''} matching all selected tags`}
            </p>
            {mapResults.map(session => (
              <Card key={session.id} className="cursor-pointer hover:border-primary/20" onClick={() => navigate(`/session/${session.id}`)}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{session.title || `${session.discipline} Training`}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(session.date), 'MMM d, yyyy')}</p>
                      {session.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{session.notes}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs ml-2 shrink-0">{session.discipline}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!mapLoading && mapResults.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">No sessions match all selected tags.</p>
            )}
          </div>
        )}

        {selectedTags.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            Select one or more tags above to explore your training notes.
          </p>
        )}
      </main>
    </div>
  );
}
