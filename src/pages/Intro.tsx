import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  BookOpenCheck,
  Sparkles,
  LineChart,
  Compass,
} from 'lucide-react';

type Slide = {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    Icon: BookOpenCheck,
    title: 'Log every session. See your growth.',
    body:
      'Track every class, sparring round, strength workout and cardio session. Build a complete picture of your martial arts journey.',
  },
  {
    Icon: Sparkles,
    title: 'Your personal AI coach, always on.',
    body:
      'Get instant session analysis, technique feedback and personalised training recommendations — 24 hours a day.',
  },
  {
    Icon: LineChart,
    title: 'Data that makes you better.',
    body:
      'See your strength gains, cardio trends, training load and recovery patterns. Know exactly when to push and when to rest.',
  },
  {
    Icon: Compass,
    title: "Know where you're going.",
    body:
      'Follow structured pathways built for your discipline and level. Every session moves you forward.',
  },
];

export default function Intro() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      if (user) {
        await supabase
          .from('profiles')
          .update({ show_intro: false })
          .eq('id', user.id);
        await refreshProfile();
      }
    } finally {
      navigate('/onboarding', { replace: true });
    }
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
    }
  };

  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, finishing]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 50;
    if (dx <= -threshold) next();
    else if (dx >= threshold) prev();
    touchStartX.current = null;
  };

  const slide = SLIDES[index];
  const Icon = slide.Icon;

  return (
    <div
      className="relative min-h-[100dvh] w-full bg-background text-foreground flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Skip */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={finish}
          disabled={finishing}
          className="text-muted-foreground hover:text-foreground"
        >
          Skip
        </Button>
      </div>

      {/* Desktop prev arrow */}
      <button
        type="button"
        aria-label="Previous"
        onClick={prev}
        disabled={index === 0}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 items-center justify-center rounded-full border border-border bg-card/60 text-foreground/80 hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      {/* Desktop next arrow */}
      <button
        type="button"
        aria-label="Next"
        onClick={next}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 items-center justify-center rounded-full border border-border bg-card/60 text-foreground/80 hover:text-foreground hover:border-primary/40 transition-colors"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <Card className="w-full max-w-xl border-border/60 bg-card/80 p-8 md:p-12 text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(352_90%_56%)] shadow-[var(--shadow-glow)]">
            <Icon className="h-12 w-12 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
            {slide.title}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            {slide.body}
          </p>
        </Card>
      </div>

      {/* Bottom: dots + next */}
      <div className="px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-6">
        <div className="flex items-center gap-2" role="tablist" aria-label="Slide pagination">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-border hover:bg-muted-foreground/60'
              }`}
            />
          ))}
        </div>

        <Button
          variant="default"
          size="lg"
          onClick={next}
          disabled={finishing}
          className="w-full max-w-xs"
        >
          {isLast ? 'Get Started' : 'Next'}
          {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
