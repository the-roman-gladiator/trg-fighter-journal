import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Dumbbell, Heart, Swords, Calendar, QrCode, ClipboardList } from 'lucide-react';
import { differenceInWeeks, differenceInDays, parseISO, addWeeks } from 'date-fns';

interface AssignedProgram {
  id: string;
  classification_result: string;
  current_phase: string;
  phase_week_start: number;
  phase_week_end: number;
  start_date: string;
  reassessment_date: string | null;
  martial_arts_sessions_per_week: number;
  cardio_sessions_per_week: number;
  strength_sessions_per_week: number;
  active: boolean;
}

interface AssessmentData {
  discipline: string;
  height_cm: number;
  weight_kg: number;
}

export default function BeginnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [program, setProgram] = useState<AssignedProgram | null>(null);
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data: prog } = await supabase
      .from('assigned_programs')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prog) {
      setProgram(prog as AssignedProgram);
      if (prog.assessment_id) {
        const { data: assess } = await supabase
          .from('user_assessments')
          .select('discipline, height_cm, weight_kg')
          .eq('id', prog.assessment_id)
          .single();
        if (assess) setAssessment(assess as AssessmentData);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            <h1 className="text-xl font-bold mt-2">Physical Preparation</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-lg text-center">
          <Card>
            <CardContent className="py-8 space-y-4">
              <Dumbbell className="h-12 w-12 text-primary mx-auto" />
              <h2 className="text-xl font-bold">Welcome!</h2>
              <p className="text-muted-foreground">Complete your beginner assessment to get a personalized training pathway.</p>
              <Button onClick={() => navigate('/onboarding')} className="w-full h-14 text-base">Start Assessment</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const startDate = parseISO(program.start_date);
  const currentWeek = Math.max(1, differenceInWeeks(new Date(), startDate) + 1);
  const reassessDate = program.reassessment_date ? parseISO(program.reassessment_date) : addWeeks(startDate, 12);
  const daysUntilReassess = Math.max(0, differenceInDays(reassessDate, new Date()));
  const totalWeeks = program.phase_week_end;
  const progressPercent = Math.min(100, (currentWeek / totalWeeks) * 100);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <h1 className="text-xl font-bold mt-2">Physical Preparation</h1>
          <p className="text-sm text-muted-foreground">{assessment?.discipline || 'MMA'} · {program.classification_result}</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg space-y-4">
        {/* Phase card */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{program.current_phase}</CardTitle>
              <Badge variant="outline">Week {currentWeek}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercent} className="h-3 mb-2" />
            <p className="text-xs text-muted-foreground">
              {daysUntilReassess} days until reassessment
            </p>
          </CardContent>
        </Card>

        {/* This week's prescription */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-muted/20 rounded-lg p-3">
                <Swords className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{program.martial_arts_sessions_per_week}</p>
                <p className="text-xs text-muted-foreground">Martial Arts</p>
              </div>
              <div className="text-center bg-muted/20 rounded-lg p-3">
                <Heart className="h-5 w-5 mx-auto text-destructive mb-1" />
                <p className="text-2xl font-bold text-foreground">{program.cardio_sessions_per_week}</p>
                <p className="text-xs text-muted-foreground">Cardio</p>
              </div>
              <div className="text-center bg-muted/20 rounded-lg p-3">
                <Dumbbell className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{program.strength_sessions_per_week}</p>
                <p className="text-xs text-muted-foreground">Strength</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => navigate('/strength')} className="h-14 text-sm" variant="default">
            <Dumbbell className="mr-2 h-4 w-4" /> Strength
          </Button>
          <Button onClick={() => navigate('/session/new')} className="h-14 text-sm" variant="outline">
            <ClipboardList className="mr-2 h-4 w-4" /> Log Session
          </Button>
          <Button onClick={() => navigate('/onboarding')} className="h-14 text-sm" variant="outline">
            <Calendar className="mr-2 h-4 w-4" /> Reassess
          </Button>
          <Button onClick={() => navigate('/')} className="h-14 text-sm" variant="outline">
            <QrCode className="mr-2 h-4 w-4" /> QR Scan
          </Button>
        </div>

        {/* Philosophy */}
        <Card className="bg-card border-primary/10">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground italic text-center">
              "You are not training to be tired. You are training to be dangerous when tired."
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
