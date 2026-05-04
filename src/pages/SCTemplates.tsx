import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, Dumbbell, Play, Check } from 'lucide-react';
import { SC_TEMPLATES, SCTemplate } from '@/data/scTemplates';
import { cn } from '@/lib/utils';

export default function SCTemplates() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const template = useMemo(() => SC_TEMPLATES.find((t) => t.id === id), [id]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <Button variant="ghost" size="sm" onClick={() => (template ? navigate('/sc-templates') : navigate('/'))} className="mb-2 -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight uppercase font-display">
            Strength &amp; Conditioning Templates
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Intermediate · Built for fighters, not bodybuilders</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 max-w-3xl">
        {template ? <SessionView template={template} /> : <TemplateGrid onSelect={(t) => navigate(`/sc-templates/${t.id}`)} />}
      </main>
    </div>
  );
}

function TemplateGrid({ onSelect }: { onSelect: (t: SCTemplate) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SC_TEMPLATES.map((t) => (
        <Card key={t.id} className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base uppercase tracking-wide font-display">{t.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{t.focus}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                {t.level}
              </Badge>
              {t.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {t.duration}
              </span>
              <span className="flex items-center gap-1">
                <Dumbbell className="h-3 w-3" /> {t.exercises.length} exercises
              </span>
            </div>
            <Button onClick={() => onSelect(t)} size="sm" className="mt-auto">
              <Play className="mr-1 h-3.5 w-3.5" /> Start Session
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SessionView({ template }: { template: SCTemplate }) {
  // completed[exerciseIdx][setIdx] = boolean
  const [completed, setCompleted] = useState<boolean[][]>(() =>
    template.exercises.map((e) => Array(e.sets).fill(false)),
  );

  const totalSets = template.exercises.reduce((s, e) => s + e.sets, 0);
  const doneSets = completed.flat().filter(Boolean).length;
  const pct = Math.round((doneSets / totalSets) * 100);

  const toggle = (eIdx: number, sIdx: number) => {
    setCompleted((prev) => {
      const next = prev.map((row) => [...row]);
      next[eIdx][sIdx] = !next[eIdx][sIdx];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg uppercase tracking-wide font-display">{template.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{template.focus}</p>
            </div>
            <Badge variant="outline" className="border-primary/40 text-primary">
              {template.level}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {template.duration}
            </span>
            <span>· {totalSets} total sets</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-primary">
                {doneSets}/{totalSets} sets · {pct}%
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {template.exercises.map((ex, eIdx) => {
          const exDone = completed[eIdx].every(Boolean);
          return (
            <Card key={eIdx} className={cn(exDone && 'border-primary/50')}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm uppercase tracking-wide">{ex.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {ex.equipment} · Reps {ex.reps} · Rest {ex.rest}
                    </div>
                  </div>
                  {exDone && <Check className="h-4 w-4 text-primary shrink-0" />}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {completed[eIdx].map((done, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => toggle(eIdx, sIdx)}
                      className={cn(
                        'h-11 min-w-[3.25rem] px-3 rounded-md border text-xs font-semibold uppercase tracking-wide transition-colors',
                        done
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground',
                      )}
                      aria-pressed={done}
                      aria-label={`Set ${sIdx + 1} ${done ? 'completed' : 'incomplete'}`}
                    >
                      Set {sIdx + 1}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {pct === 100 && (
        <Card className="border-primary/60 bg-primary/5">
          <CardContent className="pt-4 text-center">
            <div className="text-sm font-bold uppercase tracking-wide text-primary">Session Complete</div>
            <p className="text-xs text-muted-foreground mt-1">All sets logged. Recover well.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
