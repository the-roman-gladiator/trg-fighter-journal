import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import StrengthDashboard from '@/components/strength/StrengthDashboard';
import StrengthTemplatesList from '@/components/strength/StrengthTemplatesList';
import StrengthHistory from '@/components/strength/StrengthHistory';

export default function StrengthTraining() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
        <Tabs defaultValue="dashboard">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <StrengthDashboard />
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
