import { useState } from 'react';
import { useUserLists, ListType } from '@/hooks/useUserLists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { disciplines } from '@/config/dropdownOptions';

interface Props {
  type: ListType;
  title: string;
  scoped?: boolean; // if true, items are filtered by discipline (techniques)
}

export function CustomListManager({ type, title, scoped = false }: Props) {
  const { getActive, addItem, updateItem, softDelete } = useUserLists();
  const { toast } = useToast();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [discipline, setDiscipline] = useState<string>(scoped ? disciplines[0] : '');

  const items = getActive(type, scoped ? discipline : undefined);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const err = await addItem(type, newName, scoped ? discipline : undefined);
    if (err) {
      toast({ title: 'Error', description: 'Item already exists or could not be added', variant: 'destructive' });
    } else {
      setNewName('');
      toast({ title: 'Added', description: `${newName} added` });
    }
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const saveEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    const err = await updateItem(editingId, editValue);
    if (err) {
      toast({ title: 'Error', description: 'Could not save', variant: 'destructive' });
    } else {
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleDelete = async (id: string) => {
    await softDelete(id);
    toast({ title: 'Removed', description: 'Item hidden from selectors' });
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">{title}</Label>
          <span className="text-[10px] text-muted-foreground">{items.length} active</span>
        </div>

        {scoped && (
          <Select value={discipline} onValueChange={setDiscipline}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {disciplines.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2 text-center">No items yet</p>
          )}
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30 border border-border/60">
              {editingId === item.id ? (
                <>
                  <Input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="h-8 text-xs flex-1"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  />
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xs flex-1 truncate">{item.item_name}</span>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item.id, item.item_name)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={`Add new ${title.toLowerCase()}...`}
            className="h-9 text-xs flex-1"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          />
          <Button type="button" size="sm" onClick={handleAdd} className="h-9">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
