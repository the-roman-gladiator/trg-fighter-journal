import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserCircle, Check, X } from 'lucide-react';

const STORAGE_KEY = 'trg_profile_prompt_dismissed_at';
const TEN_MIN_MS = 10 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface Props {
  profile: any;
}

function isComplete(p: any) {
  return !!(p?.first_name && p?.surname && p?.discipline);
}

export function ProfileSetupPrompt({ profile }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const checks = [
    { label: 'Name', done: !!(profile?.first_name && profile?.surname) },
    { label: 'Discipline', done: !!profile?.discipline },
  ];
  const completeCount = checks.filter((c) => c.done).length;

  useEffect(() => {
    if (!profile) return;

    if (isComplete(profile)) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) || 0);
    const now = Date.now();
    const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : 0;
    const isFirstLogin = createdAt && now - createdAt < ONE_DAY_MS;

    let timer: number | undefined;

    if (!dismissedAt && isFirstLogin) {
      setOpen(true);
    } else {
      const baseline = dismissedAt || now;
      const elapsed = now - baseline;
      const wait = Math.max(TEN_MIN_MS - elapsed, 0);
      timer = window.setTimeout(() => {
        if (!isComplete(profile)) setOpen(true);
      }, wait);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [profile]);

  if (!profile || isComplete(profile)) return null;

  const handleSetup = () => {
    setOpen(false);
    navigate('/onboarding');
  };

  const handleLater = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleLater(); }}>
      <DialogContent
        className="max-w-[420px] bg-card border-border"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <UserCircle className="h-12 w-12 text-primary mb-2" />
          <DialogTitle className="text-xl font-bold">Set up your profile</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Complete your profile so we can personalise your training experience, track your progress accurately, and give your AI coach the context it needs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <p className="text-xs text-muted-foreground">{completeCount} of {checks.length} complete</p>
          <ul className="space-y-1.5">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                {c.done ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <X className="h-4 w-4 text-primary" />
                )}
                <span className={c.done ? 'line-through' : ''}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="default" className="w-full" onClick={handleSetup}>
            Set up now →
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleLater}>
            Maybe later
          </Button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          You can always update your profile in Settings
        </p>
      </DialogContent>
    </Dialog>
  );
}
