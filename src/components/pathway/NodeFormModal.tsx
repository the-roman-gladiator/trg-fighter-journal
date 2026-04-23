import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PathwayNode } from './FuturisticMap';

interface NodeFormModalProps {
  mode: 'add' | 'edit';
  node: PathwayNode | null;
  onSave: (data: { title: string; description: string; node_type: string; status: string; color_tag: string }) => void;
  onClose: () => void;
}

const NODE_TYPES = ['concept', 'technique', 'achievement', 'milestone', 'session'];
const STATUSES = ['active', 'completed', 'paused', 'archived'];
const COLOR_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Blue', value: '#3b82f6' },
];

export function NodeFormModal({ mode, node, onSave, onClose }: NodeFormModalProps) {
  const [title, setTitle] = useState(node?.title || '');
  const [description, setDescription] = useState(node?.description || '');
  const [nodeType, setNodeType] = useState(node?.node_type || 'concept');
  const [status, setStatus] = useState(node?.status || 'active');
  const [colorTag, setColorTag] = useState(node?.color_tag || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), description, node_type: nodeType, status, color_tag: colorTag });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#12121e] border-cyan-900/40 text-cyan-50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cyan-100">
            {mode === 'add' ? 'Create New Node' : 'Edit Node'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-cyan-400/60 mb-1 block">Title</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Node title..."
              className="bg-cyan-500/5 border-cyan-500/20 text-cyan-100 placeholder:text-cyan-500/30"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-cyan-400/60 mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="bg-cyan-500/5 border-cyan-500/20 text-cyan-100 placeholder:text-cyan-500/30 min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-cyan-400/60 mb-1 block">Type</label>
              <Select value={nodeType} onValueChange={setNodeType}>
                <SelectTrigger className="bg-cyan-500/5 border-cyan-500/20 text-cyan-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12121e] border-cyan-900/40">
                  {NODE_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="text-cyan-100 capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-cyan-400/60 mb-1 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-cyan-500/5 border-cyan-500/20 text-cyan-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12121e] border-cyan-900/40">
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="text-cyan-100 capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-cyan-400/60 mb-1 block">Color Tag</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value || 'default'}
                  type="button"
                  onClick={() => setColorTag(c.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    colorTag === c.value ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value || '#06b6d4' }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} className="text-cyan-400/60">Cancel</Button>
            <Button type="submit" className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30">
              {mode === 'add' ? 'Create Node' : 'Done'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
