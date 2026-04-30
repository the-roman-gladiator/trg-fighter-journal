import React from "react";
import {
  Flame, CalendarDays, Zap, ChevronRight, User, GraduationCap, Swords,
  BookOpen, PlusCircle, ClipboardList, TrendingUp, NotebookPen, Trophy,
} from "lucide-react";

/**
 * Standalone visual mockup — does NOT use real data or shared components.
 * Route: /mockup-dashboard
 * Uses semantic tokens where possible; `destructive` stands in for the red accent.
 */
export default function MockupDashboard() {
  const days = [
    { label: "MON", value: "✓", active: true },
    { label: "TUE", value: "✓", active: true },
    { label: "WED", value: "✓", active: true },
    { label: "THU", value: "4", current: true },
    { label: "FRI", value: "5" },
    { label: "SAT", value: "6" },
    { label: "SUN", value: "7" },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground flex justify-center">
      <section className="relative w-full max-w-[430px] min-h-screen overflow-hidden bg-background border-x border-destructive/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--destructive)/0.35),transparent_35%),radial-gradient(circle_at_center,hsl(var(--destructive)/0.18),transparent_45%)] pointer-events-none" />

        {/* Header */}
        <header className="relative px-8 pt-9 pb-8 border-b border-border">
          <div className="absolute top-7 right-8 flex items-center gap-5 text-sm text-foreground/85">
            <User size={18} />
            <span>Sign Out</span>
          </div>
          <div className="grid grid-cols-[1fr_126px] gap-5 items-center pt-10">
            <div>
              <h1 className="text-5xl leading-[0.9] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}>
                <span className="block text-foreground drop-shadow-lg">FIGHTER</span>
                <span className="block text-destructive">JOURNAL</span>
              </h1>
              <p className="mt-5 text-sm tracking-[0.34em] text-foreground/75 font-semibold">
                TRACK. IMPROVE. WIN.
              </p>
            </div>
            <div className="h-28 rounded-2xl overflow-hidden border border-destructive/40 bg-destructive/10 shadow-[0_0_35px_hsl(var(--destructive)/0.2)] flex items-center justify-center">
              <span className="text-xs text-muted-foreground">FIGHTER</span>
            </div>
          </div>

          <div className="mt-8 mx-auto w-fit flex items-center gap-2 rounded-full bg-card/60 p-1 border border-border">
            <button className="flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-bold text-destructive-foreground shadow-[0_0_20px_hsl(var(--destructive)/0.45)]">
              <GraduationCap size={17} /> Athlete
            </button>
            <button className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-foreground/65">
              <Swords size={17} /> Fighter
            </button>
          </div>
        </header>

        <div className="relative px-5 pt-7 pb-28 space-y-6">
          {/* Status + Stats */}
          <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm">
            <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr] divide-x divide-border">
              <div className="pr-4">
                <p className="text-xs tracking-[0.2em] text-muted-foreground font-bold">STATUS</p>
                <p className="mt-2 text-2xl font-black text-destructive">READY</p>
                <div className="mt-2 flex items-center gap-2 text-xs tracking-[0.22em] text-muted-foreground font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> IN CAMP
                </div>
              </div>
              <Stat icon={<Flame size={20} />} value="3" label="DAY STREAK" />
              <Stat icon={<CalendarDays size={20} />} value="17" label="SESSIONS" />
              <Stat icon={<Zap size={20} />} value="3.3" label="INTENSITY" />
            </div>
          </section>

          {/* Fight Card */}
          <section className="rounded-2xl border border-destructive/70 bg-card overflow-hidden shadow-[0_0_35px_hsl(var(--destructive)/0.18)]">
            <div className="px-4 py-3 border-b border-destructive/60">
              <p className="text-xs font-black tracking-[0.45em] text-destructive">FIGHT CARD</p>
            </div>
            <div className="p-3 grid grid-cols-[42%_1fr] gap-4">
              <div className="rounded-xl overflow-hidden border border-destructive/50 bg-destructive/15 min-h-[250px] flex items-center justify-center">
                <span className="text-xs text-muted-foreground">PORTRAIT</span>
              </div>
              <div className="py-3 pr-2 flex flex-col">
                <h3 className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>DOMINUS</h3>
                <p className="mt-6 text-sm font-black tracking-[0.14em] leading-6 text-foreground/90">
                  MMA • MUAY THAI • K1<br />BJJ • GRAPPLING
                </p>
                <p className="mt-6 text-sm font-black tracking-[0.16em] text-foreground/90">UFC CHAMP</p>
                <div className="mt-5">
                  <p className="text-xs font-black tracking-[0.35em] text-destructive">CREED</p>
                  <p className="mt-2 text-sm font-black tracking-[0.14em] text-foreground/95">FINO ALLA MORTE!</p>
                </div>
                <div className="mt-auto pt-7">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black tracking-[0.35em] text-destructive">PROGRESS</p>
                    <p className="text-sm font-bold text-foreground/80">80%</p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-4/5 rounded-full bg-destructive shadow-[0_0_16px_hsl(var(--destructive)/0.65)]" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Weekly Overview */}
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black tracking-[0.35em] text-destructive">THIS WEEK</p>
              <button className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                VIEW ALL <ChevronRight size={14} />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-7 gap-3">
              {days.map((day) => (
                <div key={day.label} className="text-center">
                  <p className="text-[10px] font-bold text-muted-foreground">{day.label}</p>
                  <div
                    className={`mt-3 mx-auto h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border ${
                      day.active
                        ? "bg-destructive border-destructive text-destructive-foreground"
                        : day.current
                        ? "border-destructive text-foreground bg-background"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {day.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-7">
              <p className="text-sm font-black tracking-[0.18em] text-foreground/85">WEEKLY GOAL</p>
              <div className="mt-3 flex items-center gap-4">
                <p className="text-sm text-foreground/70 whitespace-nowrap">3 / 5 SESSIONS</p>
                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-3/5 rounded-full bg-destructive" />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background/95 border-t border-destructive/40 px-4 py-3 backdrop-blur-xl">
          <div className="grid grid-cols-6 gap-1 text-[11px] font-semibold">
            <NavItem active icon={<BookOpen size={22} />} label="Dashboard" />
            <NavItem icon={<PlusCircle size={22} />} label="+ Log" />
            <NavItem icon={<ClipboardList size={22} />} label="Records" />
            <NavItem icon={<TrendingUp size={22} />} label="Trends" />
            <NavItem icon={<NotebookPen size={22} />} label="Reflection" />
            <NavItem icon={<Trophy size={22} />} label="Award" />
          </div>
        </nav>
      </section>
    </main>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="px-3 text-center">
      <div className="flex justify-center text-destructive">{icon}</div>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-1 text-[10px] tracking-[0.12em] text-muted-foreground font-bold">{label}</p>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex flex-col items-center gap-1 ${active ? "text-destructive" : "text-muted-foreground"}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
