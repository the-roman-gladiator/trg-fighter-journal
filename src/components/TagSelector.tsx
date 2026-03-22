import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface TagSelectorProps {
  sessionId?: string;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagSelector({ sessionId, selectedTags, onTagsChange }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([]);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('name');
    setAllTags(data || []);
  };

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const addNewTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    if (allTags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      // Tag exists, just select it
      const existing = allTags.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (existing && !selectedTags.includes(existing.name)) {
        onTagsChange([...selectedTags, existing.name]);
      }
      setNewTagName('');
      return;
    }

    const { data, error } = await supabase.from('tags').insert({ name }).select().single();
    if (!error && data) {
      setAllTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      onTagsChange([...selectedTags, data.name]);
      setNewTagName('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewTag();
    }
  };

  // Suggested tags based on common martial arts terms
  const suggestedTags = ['Jab', 'Cross', 'Hook', 'Uppercut', 'Low Kick', 'Takedown', 'Guard', 'Timing', 'Distance', 'Pressure', 'Counter', 'Feint', 'Entry', 'Defense'];

  return (
    <div className="space-y-3">
      <Label>Tags</Label>
      
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map(tag => (
            <Badge key={tag} variant="default" className="cursor-pointer text-xs" onClick={() => toggleTag(tag)}>
              {tag} <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {/* Add new tag */}
      <div className="flex gap-2">
        <Input
          placeholder="Add tag..."
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={addNewTag} disabled={!newTagName.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Available tags */}
      <div className="flex flex-wrap gap-1.5">
        {allTags
          .filter(t => !selectedTags.includes(t.name))
          .slice(0, 20)
          .map(tag => (
            <Badge
              key={tag.id}
              variant="outline"
              className="cursor-pointer text-xs hover:bg-primary/10"
              onClick={() => toggleTag(tag.name)}
            >
              {tag.name}
            </Badge>
          ))}
      </div>
    </div>
  );
}
