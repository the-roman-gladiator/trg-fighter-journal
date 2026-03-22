import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import MyPlan from '@/components/strength/MyPlan';
import PathwayProgress from '@/components/strength/PathwayProgress';
import StrengthTemplatesList from '@/components/strength/StrengthTemplatesList';
import StrengthHistory from '@/components/strength/StrengthHistory';

export default function StrengthTraining() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'plan';

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-primary">Strength Training</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-4">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="plan">My Plan</TabsTrigger>
            <TabsTrigger value="progress">Pathway</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="plan" className="mt-4">
            <MyPlan />
          </TabsContent>
          <TabsContent value="progress" className="mt-4">
            <PathwayProgress />
          </TabsContent>
          <TabsContent value="templates" className="mt-4">
            <StrengthTemplatesList />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <StrengthHistory />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
