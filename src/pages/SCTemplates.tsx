import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Clock, Dumbbell, Play, Check, Trash2 } from 'lucide-react';
import { SC_TEMPLATES, SCExercise, SCTemplate } from '@/data/scTemplates';
import { cn } from '@/lib/utils';

type ExerciseRow = SCExercise & { done: boolean; repsValue: string };

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
  const [rows, setRows] = useState<ExerciseRow[]>(() =>
    template.exercises.map((e) => ({ ...e, done: false, repsValue: e.reps })),
  );

  const total = rows.length;
  const doneCount = rows.filter((r) => r.done).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const toggle = (i: number) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, done: !r.done } : r)));

  const updateReps = (i: number, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, repsValue: value } : r)));

  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

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
            <span>· {total} exercises</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-primary">
                {doneCount}/{total} done · {pct}%
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rows.map((ex, i) => (
          <Card key={i} className={cn(ex.done && 'border-primary/50 bg-primary/5')}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={ex.done}
                  onCheckedChange={() => toggle(i)}
                  className="mt-1 h-5 w-5"
                  aria-label={`Mark ${ex.name} as done`}
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className={cn('font-semibold text-sm uppercase tracking-wide', ex.done && 'line-through text-muted-foreground')}>
                        {ex.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {ex.equipment} · {ex.sets} sets · Rest {ex.rest}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(i)}
                      className="h-7 w-7 p-0 shrink-0"
                      aria-label="Delete exercise"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reps</label>
                    <Input
                      value={ex.repsValue}
                      onChange={(e) => updateReps(i, e.target.value)}
                      className="h-8 text-sm max-w-[140px]"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card>
            <CardContent className="pt-6 pb-6 text-center text-sm text-muted-foreground">
              No exercises left. Go back and pick another template.
            </CardContent>
          </Card>
        )}
      </div>

      {pct === 100 && rows.length > 0 && (
        <Card className="border-primary/60 bg-primary/5">
          <CardContent className="pt-4 text-center">
            <div className="text-sm font-bold uppercase tracking-wide text-primary flex items-center justify-center gap-2">
              <Check className="h-4 w-4" /> Session Complete
            </div>
            <p className="text-xs text-muted-foreground mt-1">All exercises logged. Recover well.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
