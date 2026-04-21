import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Map } from 'lucide-react';

export default function Records() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-display font-bold text-primary">Records</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-5 max-w-lg space-y-3">
        <Card
          className="cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => navigate('/pathway')}
        >
          <CardContent className="py-5 px-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Map className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-foreground">Pathway</h3>
              <p className="text-xs text-muted-foreground">Your training knowledge base &amp; movement chains</p>
            </div>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full h-12 text-sm font-semibold"
          onClick={() => navigate('/pathway')}
        >
          Open Pathway
        </Button>
      </main>
    </div>
  );
}
