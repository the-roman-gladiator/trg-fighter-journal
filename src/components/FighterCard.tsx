import { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Flame, Quote, Camera, Loader2, User as UserIcon, CalendarDays, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

interface FighterCardProps {
  userId?: string;
  nickname?: string;
  name?: string;
  age?: number | null;
  height?: string;
  weight?: string;
  stance?: string;
  record?: string; // e.g. "20W-1L"
  discipline?: string;
  level?: string;
  statement?: string;
  avatarUrl?: string | null;
  /** Sessions logged in the current week. */
  weeklySessions?: number;
  /** Longest consecutive-day training streak. */
  longestStreak?: number;
  /** Avg effort score over the last 7 days. */
  avgEffort?: number;
  /** Optional callback fired after a successful avatar upload. */
  onAvatarChange?: (url: string) => void;
}

/**
 * Fight-card style fighter summary — UFC inspired:
 *   [ Photo ]  |  Name + statline rows
 *   ───────────────────────────────────────
 *           Performance stat tiles
 */
export function FighterCard({
  userId,
  nickname,
  name,
  age,
  height,
  weight,
  stance,
  record,
  discipline,
  level,
  statement,
  avatarUrl,
  weeklySessions,
  longestStreak,
  avgEffort,
  onAvatarChange,
}: FighterCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const displayName = (nickname || name || 'Fighter').toUpperCase();
  const primaryDiscipline = discipline?.split(',')[0]?.trim();

  const statLines: { label: string; value?: string | number | null }[] = [
    { label: 'Age', value: age ?? undefined },
    { label: 'Height', value: height },
    { label: 'Weight', value: weight },
    { label: 'Record', value: record },
    { label: 'Stance', value: stance },
    { label: 'Style', value: primaryDiscipline },
    { label: 'Level', value: level },
  ].filter((s) => s.value != null && s.value !== '') as {
    label: string;
    value: string | number;
  }[];

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

  const perfStats: { icon: any; label: string; value: string | number; tone: string }[] = [];
  if (weeklySessions != null) {
    perfStats.push({
      icon: CalendarDays,
      label: 'This Week',
      value: weeklySessions,
      tone: 'text-primary',
    });
  }
  if (longestStreak != null) {
    perfStats.push({
      icon: Flame,
      label: 'Best Streak',
      value: longestStreak,
      tone: 'text-orange-500',
    });
  }
  if (avgEffort != null && avgEffort > 0) {
    perfStats.push({
      icon: Zap,
      label: 'Avg Effort',
      value: avgEffort,
      tone: 'text-yellow-500',
    });
  }

  return (
    <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-[hsl(var(--primary)/0.18)] via-card to-card shadow-[0_8px_28px_-10px_hsl(var(--primary)/0.55)]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {/* Diagonal slash separating photo / stats — fight-card signature */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-[42%] w-px bg-gradient-to-b from-transparent via-primary/60 to-transparent rotate-[8deg] origin-top pointer-events-none hidden xs:block"
      />
      <div
        aria-hidden
        className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none"
      />

      {/* Header bar */}
      <div className="relative flex items-center justify-between gap-2 px-3 py-1.5 border-b border-primary/30 bg-gradient-to-r from-primary/25 via-primary/10 to-transparent">
        <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-primary">
          Fight Card
        </span>
        {record && (
          <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-foreground/80 tabular-nums">
            {record}
          </span>
        )}
      </div>

      {/* Hero row: photo + name/statline */}
      <div className="relative flex gap-3 p-3">
        {/* Avatar */}
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={uploading}
          aria-label="Upload fighter photo"
          className={cn(
            'relative shrink-0 h-28 w-24 sm:h-36 sm:w-28 rounded-md overflow-hidden',
            'border border-primary/40 bg-gradient-to-b from-muted/50 to-muted/20',
            'group focus:outline-none focus:ring-2 focus:ring-primary/60 transition',
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <UserIcon className="h-8 w-8" />
              <span className="text-[8px] font-bold tracking-[0.2em] uppercase">
                Add Photo
              </span>
            </div>
          )}
          {/* Hover/upload overlay */}
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

        {/* Name + statline */}
        <div className="min-w-0 flex-1 flex flex-col">
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
            Nickname
          </p>
          <h3
            className="text-xl sm:text-2xl font-black uppercase leading-[1.05] tracking-tight text-foreground break-words"
            style={{ fontFamily: 'Barlow Condensed, Inter, sans-serif' }}
          >
            {displayName}
          </h3>

          {/* Compact statline rows (UFC style — value left, label right in red) */}
          {statLines.length > 0 && (
            <ul className="mt-2 flex-1 space-y-1">
              {statLines.slice(0, 5).map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between gap-2 rounded-sm bg-background/40 border border-border/40 px-2 py-0.5"
                >
                  <span className="text-[11px] sm:text-xs font-semibold text-foreground tabular-nums truncate">
                    {s.value}
                  </span>
                  <span
                    className="text-[9px] font-black tracking-[0.18em] uppercase text-destructive shrink-0"
                    style={{ fontFamily: 'Barlow Condensed, Inter, sans-serif' }}
                  >
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Performance stat tiles — under the statistics, full width */}
      {perfStats.length > 0 && (
        <div className="relative px-3 pb-3">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${perfStats.length}, minmax(0, 1fr))` }}
          >
            {perfStats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="flex items-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-2 py-1.5"
                >
                  <Icon className={cn('h-4 w-4 shrink-0', s.tone)} />
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold tracking-[0.18em] uppercase text-muted-foreground leading-none">
                      {s.label}
                    </p>
                    <p className="text-base font-black tabular-nums text-foreground leading-tight">
                      {s.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Statement */}
      {statement && (
        <div className="relative mx-3 mb-3 pt-2 border-t border-primary/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Quote className="h-3 w-3 text-primary shrink-0" />
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-primary">
              My Statement
            </p>
          </div>
          <p className="text-[13px] sm:text-sm font-semibold italic leading-snug text-foreground break-words">
            "{statement}"
          </p>
        </div>
      )}
    </Card>
  );
}
