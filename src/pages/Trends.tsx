import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Trends() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-display font-bold text-primary">Trends</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-5 max-w-lg">
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <TrendingUp className="h-10 w-10 text-primary/40 mx-auto" />
            <p className="text-sm font-semibold">Statistics & Trends</p>
            <p className="text-xs text-muted-foreground">Detailed trend analysis coming soon. Your training distribution chart is on the Dashboard.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
