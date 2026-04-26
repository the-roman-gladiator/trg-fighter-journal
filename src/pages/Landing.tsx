import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shield,
  Brain,
  Network,
  TrendingUp,
  GraduationCap,
  Lock,
  ArrowRight,
  Swords,
  Target,
  Flame,
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const enterApp = () => navigate('/auth');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-[hsl(352_84%_32%)] shadow-[0_0_16px_-4px_hsl(var(--primary)/0.6)]">
              <Swords className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>
              Fighter Journal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => scrollTo('beta')} className="hidden sm:inline-flex">
              Private Beta
            </Button>
            <Button size="sm" onClick={enterApp}>
              Enter App
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.18) 0%, transparent 70%), linear-gradient(180deg, hsl(0 0% 5%) 0%, hsl(0 0% 3.5%) 100%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)' }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:pt-20 md:pb-24 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Lock className="h-3 w-3" /> Private Beta
            </div>
            <h1
              className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Fighter <span className="bg-gradient-to-b from-primary to-[hsl(352_84%_32%)] bg-clip-text text-transparent">Journal</span>
            </h1>
            <p className="mt-5 text-lg font-medium text-foreground/90 sm:text-xl">
              Track your training. Build your pathway. Fight with purpose.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              A private beta training journal for combat athletes who want to understand their performance,
              mindset, emotions, strategy, and progress.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={enterApp} className="w-full sm:w-auto">
                Enter App <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo('beta')} className="w-full sm:w-auto">
                Join Private Beta
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>MMA</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>Muay Thai</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>BJJ</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>Boxing</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>K1</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>Wrestling</span>
            </div>
          </div>
        </div>
      </section>

      {/* Private Beta notice */}
      <section id="beta" className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        <Card className="overflow-hidden border-primary/30">
          <div
            aria-hidden
            className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }}
          />
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold sm:text-2xl" style={{ fontFamily: 'Cinzel, serif' }}>
                  Private Beta Access
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Fighter Journal is currently being tested with selected athletes and coaches before public launch.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Access is limited while we improve the experience, test the training logs, and refine the
                  Combat Pathway system.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={enterApp}>Request Access</Button>
                  <Button variant="outline" onClick={enterApp}>
                    Sign In
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* What the app tracks */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">What it tracks</p>
          <h2 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'Cinzel, serif' }}>
            Built around real training
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Swords,
              title: 'Training Sessions',
              text: 'Log discipline, class type, techniques, effort, notes, and progress.',
            },
            {
              icon: Brain,
              title: 'Mindset & Emotions',
              text: 'Track how you feel before and after training so you can understand your internal performance patterns.',
            },
            {
              icon: Network,
              title: 'Combat Pathway Map',
              text: 'Visualise how techniques, reactions, strategies, and movement chains connect.',
            },
            {
              icon: TrendingUp,
              title: 'Progress Trends',
              text: 'See repeated habits, training consistency, execution rate, and development over time.',
            },
            {
              icon: GraduationCap,
              title: 'Coach Notes',
              text: 'Allow coaches and head coaches to review selected fighter notes and support athlete development.',
            },
            {
              icon: Shield,
              title: 'Private & Secure',
              text: 'Your training data stays yours. Strict isolation between athletes, fighters, and coaches.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title} className="group transition-transform hover:-translate-y-0.5">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Who it is for */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">Who it's for</p>
            <h2 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'Cinzel, serif' }}>
              Built for combat athletes
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'MMA fighters',
              'Muay Thai and K1 athletes',
              'BJJ and grappling competitors',
              'Boxing and striking athletes',
              'Coaches and fight teams',
              'Strength & conditioning athletes connected to combat sports',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-4 py-3 transition-colors hover:border-primary/40"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Target className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Combat Pathway feature highlight */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">Signature Feature</p>
            <h2
              className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Build Your <span className="bg-gradient-to-b from-primary to-[hsl(352_84%_32%)] bg-clip-text text-transparent">Combat Pathway</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Fighter Journal helps athletes move beyond simple note-taking. The Combat Pathway system helps
              fighters understand how one movement connects to another — from trigger, to action, to reaction,
              to strategy.
            </p>
            <div className="mt-6">
              <Button onClick={enterApp} variant="outline">
                Explore the Pathway <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { a: 'Trigger', b: 'Action', c: 'Reaction', d: 'Adaptation' },
              { a: 'Technique', b: 'Counter', c: 'Reset', d: 'Capitalisation' },
              { a: 'Training Note', b: 'Pattern', c: 'Progress', d: 'Fight IQ' },
            ].map((row, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    {[row.a, row.b, row.c, row.d].map((step, idx, arr) => (
                      <span key={step} className="flex items-center gap-2">
                        <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 font-semibold text-foreground">
                          {step}
                        </span>
                        {idx < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-primary/70" />}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-5xl px-4 pb-14">
        <Card className="overflow-hidden border-primary/30">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                'radial-gradient(50% 80% at 50% 0%, hsl(var(--primary) / 0.18), transparent 70%)',
            }}
          />
          <CardContent className="flex flex-col items-center gap-5 p-8 text-center sm:p-10">
            <Flame className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>
              Ready to train with intent?
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Join the Private Beta and start building your Combat Pathway today.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={enterApp}>
                Enter App
              </Button>
              <Button size="lg" variant="outline" onClick={enterApp}>
                Join Private Beta
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* TRG credibility */}
      <div className="mx-auto max-w-6xl px-4 pb-6 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Developed from the coaching system used at The Roman Gladiators Academy
        </p>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-[hsl(352_84%_32%)]">
                  <Swords className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                  Fighter Journal
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Powered by TRG Performance System
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Lock className="h-2.5 w-2.5" /> Private Beta
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={enterApp} className="hover:text-foreground">Enter App</button></li>
                <li><button onClick={() => scrollTo('beta')} className="hover:text-foreground">Private Beta</button></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="cursor-not-allowed">Privacy Policy <span className="text-[10px] uppercase tracking-wider text-primary/80">· Coming soon</span></span></li>
                <li><span className="cursor-not-allowed">Terms & Conditions <span className="text-[10px] uppercase tracking-wider text-primary/80">· Coming soon</span></span></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:hello@thefighterjournal.com" className="hover:text-foreground">
                    hello@thefighterjournal.com
                  </a>
                </li>
                <li>
                  <a href="https://thefighterjournal.com" className="hover:text-foreground">
                    thefighterjournal.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} Fighter Journal. All rights reserved.</p>
            <p>Train with purpose.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
