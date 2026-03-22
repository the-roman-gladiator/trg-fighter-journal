import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Eye, Dumbbell, Clock, Target } from 'lucide-react';

interface TemplateWithExercises {
  id: string;
  name: string;
  discipline: string;
  level: string;
  goal: string;
  duration_weeks: number;
  category: string;
  progression_weeks_1_4: string;
  progression_weeks_5_8: string;
  progression_weeks_9_12: string;
  system_rule: string;
  override_rule: string;
  workout_template_exercises: Array<{
    id: string;
    exercise_name: string;
    exercise_order: number;
    default_sets: number;
    default_reps: number;
    default_weight: number;
    default_duration: string;
    default_rounds: number;
    notes: string;
  }>;
}

export default function StrengthTemplatesList() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateWithExercises | null>(null);

  const strengthProfile = profile as any;
  const discipline = strengthProfile?.discipline || 'MMA';
  const strengthLevel = strengthProfile?.strength_level || 'Beginner';

  useEffect(() => {
    fetchTemplates();
  }, [user, discipline, strengthLevel]);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('workout_templates')
      .select('*, workout_template_exercises(*)')
      .eq('source_type', 'system')
      .eq('discipline', discipline)
      .eq('level', strengthLevel)
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setTemplates(data as any);
    }
    setLoading(false);
  };

  const startWorkout = (templateId: string) => {
    navigate(`/strength/workout/${templateId}`);
  };

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Loading templates...</p>;
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-3">
          <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            No workout templates available for {discipline} – {strengthLevel}.
          </p>
          <p className="text-sm text-muted-foreground">Contact your coach to get workouts assigned.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{discipline} – {strengthLevel}</h2>
        <Badge variant="outline">{templates.length} workouts</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <Badge variant="secondary" className="text-xs">{template.level}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{template.goal}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {template.duration_weeks} weeks
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" /> {template.workout_template_exercises?.length || 0} exercises
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPreviewTemplate(template)}
                >
                  <Eye className="mr-1 h-3 w-3" /> Preview
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => startWorkout(template.id)}
                >
                  <Play className="mr-1 h-3 w-3" /> Start
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Goal:</span> {previewTemplate.goal}</p>
                <p><span className="font-medium">Duration:</span> {previewTemplate.duration_weeks} weeks</p>
                <p><span className="font-medium">Level:</span> {previewTemplate.level}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Exercises</h4>
                <div className="space-y-2">
                  {(previewTemplate.workout_template_exercises || [])
                    .sort((a, b) => a.exercise_order - b.exercise_order)
                    .map((ex, i) => (
                      <div key={ex.id} className="flex justify-between items-center p-2 rounded bg-muted/30">
                        <span className="text-sm">{i + 1}. {ex.exercise_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {ex.default_sets && ex.default_reps
                            ? `${ex.default_sets}x${ex.default_reps}`
                            : ex.default_duration || ex.default_rounds
                            ? `${ex.default_duration || `${ex.default_rounds} rounds`}`
                            : ''}
                          {ex.default_weight ? ` @ ${ex.default_weight}kg` : ''}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground text-sm">Progression Model</p>
                  <p>Weeks 1–4: {previewTemplate.progression_weeks_1_4}</p>
                  <p>Weeks 5–8: {previewTemplate.progression_weeks_5_8}</p>
                  <p>Weeks 9–12: {previewTemplate.progression_weeks_9_12}</p>
                </div>
                {previewTemplate.system_rule && (
                  <p><span className="font-medium text-foreground">System Rule:</span> {previewTemplate.system_rule}</p>
                )}
              </div>

              <Button className="w-full" onClick={() => {
                setPreviewTemplate(null);
                startWorkout(previewTemplate.id);
              }}>
                <Play className="mr-2 h-4 w-4" /> Start This Workout
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
