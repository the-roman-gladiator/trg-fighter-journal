import { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Flame, Quote, Camera, Loader2, User as UserIcon, CalendarDays, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

interface FighterCardProps {
  userId?: string;
  nickname?: string;
  name?: string;
  discipline?: string;
  level?: string;
  statement?: string;
  dailyMotivation?: string;
  avatarUrl?: string | null;
  weeklySessions?: number;
  longestStreak?: number;
  onAvatarChange?: (url: string) => void;
}

/**
 * Fight-card style summary — single rectangle frame containing:
 *   [ Photo ] | NICKNAME · DISCIPLINE · LEVEL · STATEMENT · MOTIVATION · WEEK · STREAK
 * Mobile-first stacked statline rows on the right of the photo.
 */
export function FighterCard({
  userId,
  nickname,
  name,
  discipline,
  level,
  statement,
  dailyMotivation,
  avatarUrl,
  weeklySessions,
  longestStreak,
  onAvatarChange,
}: FighterCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const displayName = (nickname || name || 'Fighter').toUpperCase();
  const primaryDiscipline = discipline?.split(',').map((d) => d.trim()).filter(Boolean).join(' / ');

  const handleAvatarClick = () => {
    if (!userId) {
      toast.error('Sign in to upload a photo');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);
      if (updateError) throw updateError;
      onAvatarChange?.(publicUrl);
      toast.success('Photo updated');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * Stat row — value left, red label right (UFC fight-card style).
   * `accent` prepends a small icon and tints the value.
   */
  const StatRow = ({
    label,
    value,
    accent,
    italic,
  }: {
    label: string;
    value: React.ReactNode;
    accent?: { icon: any; tone: string };
    italic?: boolean;
  }) => {
    const Icon = accent?.icon;
    return (
      <li className="flex items-center justify-between gap-2 rounded-sm bg-background/50 border border-border/50 px-2 py-1 min-h-[28px]">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {Icon && <Icon className={cn('h-3.5 w-3.5 shrink-0', accent?.tone)} />}
          <span
            className={cn(
              'text-[12px] sm:text-[13px] font-bold text-foreground tabular-nums truncate',
              italic && 'italic font-semibold',
            )}
            style={{ fontFamily: 'Barlow Condensed, Inter, sans-serif' }}
          >
            {value}
          </span>
        </div>
        {label && (
          <span
            className="text-[9px] font-black tracking-[0.18em] uppercase text-destructive shrink-0"
            style={{ fontFamily: 'Barlow Condensed, Inter, sans-serif' }}
          >
            {label}
          </span>
        )}
      </li>
    );
  };

  return (
    <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-[hsl(var(--primary)/0.18)] via-card to-card shadow-[0_8px_28px_-10px_hsl(var(--primary)/0.55)]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {/* Diagonal accent slash */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-[38%] w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent rotate-[8deg] origin-top pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none"
      />

      {/* Header bar */}
      <div className="relative flex items-center justify-between gap-2 px-3 py-1.5 border-b border-primary/30 bg-gradient-to-r from-primary/25 via-primary/10 to-transparent">
        <span
          className="text-[10px] font-black tracking-[0.3em] uppercase text-destructive"
          style={{ fontFamily: 'Barlow Condensed, Inter, sans-serif' }}
        >
          Fight Card
        </span>
      </div>

      {/* Body: photo + stat rows */}
      <div className="relative flex gap-3 p-3">
        {/* Avatar */}
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={uploading}
          aria-label="Upload fighter photo"
          className={cn(
            'relative shrink-0 w-[112px] sm:w-[128px] rounded-md overflow-hidden self-stretch',
            'border border-primary/40 bg-gradient-to-b from-muted/50 to-muted/20',
            'group focus:outline-none focus:ring-2 focus:ring-primary/60 transition',
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <UserIcon className="h-9 w-9" />
              <span className="text-[8px] font-bold tracking-[0.2em] uppercase">
                Add Photo
              </span>
            </div>
          )}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm transition-opacity',
              uploading
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100',
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-primary">
                <Camera className="h-5 w-5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  Change
                </span>
              </div>
            )}
          </div>
        </button>

        {/* Stacked statline rows */}
        <ul className="min-w-0 flex-1 space-y-1.5">
          <StatRow
            label=""
            value={
              <span className="text-[15px] sm:text-base font-black uppercase leading-none tracking-tight">
                {displayName}
              </span>
            }
          />
          {primaryDiscipline && (
            <StatRow label="" value={primaryDiscipline} />
          )}
          {level && <StatRow label="" value={level} />}
          {statement && (
            <StatRow
              label=""
              value={`"${statement}"`}
              italic
              accent={{ icon: Quote, tone: 'text-primary' }}
            />
          )}
          {dailyMotivation && (
            <StatRow
              label=""
              value={dailyMotivation}
              accent={{ icon: Quote, tone: 'text-primary' }}
            />
          )}
          {weeklySessions != null && (
            <StatRow
              label="This Week"
              value={`${weeklySessions} sess`}
              accent={{ icon: CalendarDays, tone: 'text-primary' }}
            />
          )}
          {longestStreak != null && (
            <StatRow
              label="Best Streak"
              value={`${longestStreak} days`}
              accent={{ icon: Flame, tone: 'text-orange-500' }}
            />
          )}
        </ul>
      </div>
    </Card>
  );
}
