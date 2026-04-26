import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, UserPlus, Swords } from 'lucide-react';

const ALL_FIGHT_DISCIPLINES = ['MMA', 'Muay Thai', 'K1', 'Boxing', 'BJJ', 'Grappling', 'Wrestling'];

interface FighterRow {
  id: string;
  user_id: string;
  fighter_status: string;
  approved_fight_disciplines: string[];
  requested_fight_disciplines: string[];
  profile_name: string;
  profile_email: string;
}

interface FighterManagerProps {
  fighters: FighterRow[];
  onChanged: () => void;
}

export function FighterManager({ fighters, onChanged }: FighterManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Edit dialog state
  const [editing, setEditing] = useState<FighterRow | null>(null);
  const [editDiscs, setEditDiscs] = useState<string[]>([]);

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; email: string; name: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newDiscs, setNewDiscs] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  const approved = useMemo(
    () => fighters.filter(f => f.fighter_status === 'approved'),
    [fighters]
  );

  // ---------- Edit ----------
  const openEdit = (f: FighterRow) => {
    setEditing(f);
    setEditDiscs(f.approved_fight_disciplines || []);
  };
  const toggleEdit = (d: string) =>
    setEditDiscs(p => (p.includes(d) ? p.filter(x => x !== d) : [...p, d]));

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from('fighter_profiles')
      .update({
        approved_fight_disciplines: editDiscs,
        discipline_approved_by: user!.id,
        discipline_approved_at: new Date().toISOString(),
      })
      .eq('id', editing.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Updated', description: `${editing.profile_name}'s disciplines updated.` });
    setEditing(null);
    onChanged();
  };

  // ---------- Delete ----------
  const handleDelete = async (f: FighterRow) => {
    const { error } = await supabase.from('fighter_profiles').delete().eq('id', f.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Removed', description: `${f.profile_name} is no longer a fighter.` });
    onChanged();
  };

  // ---------- Add ----------
  const runSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    const term = searchEmail.trim().toLowerCase();
    const { data } = await supabase
      .from('profiles')
      .select('id, email, name, surname')
      .or(`email.ilike.%${term}%,name.ilike.%${term}%`)
      .limit(10);
    setSearchResults(
      (data || []).map((p: any) => ({
        id: p.id,
        email: p.email,
        name: [p.name, p.surname].filter(Boolean).join(' ') || p.email,
      }))
    );
    setSearching(false);
  };

  const toggleNewDisc = (d: string) =>
    setNewDiscs(p => (p.includes(d) ? p.filter(x => x !== d) : [...p, d]));

  const handleAdd = async () => {
    if (!selectedUserId || newDiscs.length === 0) {
      toast({ title: 'Pick a user and at least one discipline', variant: 'destructive' });
      return;
    }
    // Insert OR update if profile already exists
    const { data: existing } = await supabase
      .from('fighter_profiles')
      .select('id')
      .eq('user_id', selectedUserId)
      .maybeSingle();

    const payload = {
      fighter_status: 'approved',
      requested_fight_disciplines: newDiscs,
      approved_fight_disciplines: newDiscs,
      approved_by_head_coach: user!.id,
      approved_at: new Date().toISOString(),
      discipline_approved_by: user!.id,
      discipline_approved_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await supabase.from('fighter_profiles').update(payload).eq('id', existing.id)
      : await supabase.from('fighter_profiles').insert({ user_id: selectedUserId, ...payload });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Fighter added' });
    setAddOpen(false);
    setSearchEmail('');
    setSearchResults([]);
    setSelectedUserId(null);
    setNewDiscs([]);
    onChanged();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {approved.length} approved fighter{approved.length !== 1 ? 's' : ''}
        </p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Fighter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Fighter Manually</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by email or name…"
                  value={searchEmail}
                  onChange={e => setSearchEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runSearch()}
                />
                <Button size="sm" onClick={runSearch} disabled={searching}>
                  Search
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto border border-border rounded-md p-1">
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedUserId(r.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted ${
                        selectedUserId === r.id ? 'bg-primary/15 border border-primary/40' : ''
                      }`}
                    >
                      <div className="font-medium">{r.name}</div>
                      <div className="text-muted-foreground">{r.email}</div>
                    </button>
                  ))}
                </div>
              )}

              {selectedUserId && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Approved disciplines:</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_FIGHT_DISCIPLINES.map(d => (
                      <label key={d} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox
                          checked={newDiscs.includes(d)}
                          onCheckedChange={() => toggleNewDisc(d)}
                        />
                        {d}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!selectedUserId || newDiscs.length === 0}>
                Add as Fighter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {approved.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No approved fighters yet.
          </CardContent>
        </Card>
      ) : (
        approved.map(f => (
          <Card key={f.id}>
            <CardContent className="pt-4 pb-3">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm flex items-center gap-1.5 truncate">
                    <Swords className="h-3.5 w-3.5 text-primary shrink-0" />
                    {f.profile_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{f.profile_email}</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 text-xs shrink-0">
                  Approved
                </Badge>
              </div>

              <div className="flex gap-1 flex-wrap mt-2">
                {(f.approved_fight_disciplines || []).map(d => (
                  <Badge key={d} variant="default" className="text-[10px]">{d}</Badge>
                ))}
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs"
                  onClick={() => openEdit(f)}
                >
                  <Pencil className="h-3 w-3 mr-1" /> Edit Disciplines
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="h-7 text-xs">
                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove fighter?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the fighter profile for{' '}
                        <strong>{f.profile_name}</strong>. Their training data is kept,
                        but they will lose fighter status. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(f)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Remove Fighter
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Disciplines</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{editing.profile_name}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {ALL_FIGHT_DISCIPLINES.map(d => (
                  <label key={d} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={editDiscs.includes(d)}
                      onCheckedChange={() => toggleEdit(d)}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
