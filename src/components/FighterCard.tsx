import { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Camera, Loader2, User as UserIcon } from 'lucide-react';
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
  /** Optional mission / next-fight line */
  target?: string;
  /** @deprecated kept for backwards compat — no longer rendered */
  dailyMotivation?: string;
  avatarUrl?: string | null;
  /** @deprecated no longer rendered inside identity panel */
  weeklySessions?: number;
  /** @deprecated no longer rendered inside identity panel */
  longestStreak?: number;
  onAvatarChange?: (url: string) => void;
}

/**
 * Fighter Identity Panel
 *   [ Photo ] | NICKNAME (primary)
 *               TARGET    (mission)
 *               DISCIPLINE (tag row)
 *               STATEMENT  (italic identity)
 *
 * Solid, sharp, fighter-style — minimal noise, strong vertical rhythm.
 */
export function FighterCard({
  userId,
  nickname,
  name,
  discipline,
  level,
  statement,
  target,
  avatarUrl,
  onAvatarChange,
}: FighterCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const displayName = (nickname || name || 'Fighter').toUpperCase();
  const disciplineTags = (discipline || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => d.toUpperCase());

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

  const displayFont = { fontFamily: 'Barlow Condensed, Inter, sans-serif' } as const;

  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-lg',
        'border border-destructive/40 bg-black text-white',
        'shadow-[0_2px_0_0_hsl(var(--destructive)/0.35)]',
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {/* Top accent bar — sharp, no gradient noise */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-destructive/30 bg-destructive/10">
        <span
          className="text-[10px] font-black tracking-[0.32em] uppercase text-destructive"
          style={displayFont}
        >
          Fight Card
        </span>
      </div>

      <div className="flex gap-4 p-4">
        {/* Avatar — tall portrait on the left */}
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={uploading}
          aria-label="Upload fighter photo"
          className={cn(
            'relative shrink-0 w-[112px] sm:w-[132px] rounded-md overflow-hidden self-stretch min-h-[320px] sm:min-h-[360px]',
            'border border-destructive/40 bg-white/5',
            'group focus:outline-none focus:ring-2 focus:ring-destructive/60 transition',
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/60">
              <UserIcon className="h-9 w-9" />
              <span className="text-[8px] font-bold tracking-[0.2em] uppercase">
                Add Photo
              </span>
            </div>
          )}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity',
              uploading
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100',
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-destructive animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-destructive">
                <Camera className="h-5 w-5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  Change
                </span>
              </div>
            )}
          </div>
        </button>

        {/* Identity stack — strong vertical rhythm */}
        <div className="min-w-0 flex-1 flex flex-col text-left">
          {/* 1. NICKNAME — primary (wraps to 2 lines if long) */}
          <h2
            className="text-white font-black uppercase leading-[0.95] tracking-tight text-[26px] sm:text-[32px] break-words line-clamp-2"
            style={displayFont}
          >
            {displayName}
          </h2>

          {/* 2. DISCIPLINES — tag row */}
          {disciplineTags.length > 0 && (
            <p
              className="mt-3 text-white/55 text-[11px] sm:text-[12px] font-semibold tracking-[0.18em] uppercase break-words"
              style={displayFont}
            >
              {disciplineTags.join(' • ')}
            </p>
          )}

          {/* 3. TARGET — mission (wraps to 2 lines if long) */}
          {target && (
            <p
              className="mt-4 text-white font-semibold leading-snug text-[14px] sm:text-[15px] line-clamp-2"
              style={displayFont}
            >
              {target}
            </p>
          )}

          {/* 4. STATEMENT — identity (italic, up to 2 lines) */}
          {statement && (
            <p className="mt-3 text-white/70 italic font-light text-[13px] sm:text-[14px] leading-snug line-clamp-2">
              "{statement}"
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
