import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, ShieldCheck, AlertTriangle, Heart, History, BarChart3 } from 'lucide-react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { UsersPanel } from '@/components/admin/UsersPanel';
import { ApprovalsPanel } from '@/components/admin/ApprovalsPanel';
import { IssuesPanel } from '@/components/admin/IssuesPanel';
import { HealthPanel } from '@/components/admin/HealthPanel';
import { ActivityPanel } from '@/components/admin/ActivityPanel';

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <AdminGuard>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Full control panel</p>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">ADMIN</Badge>
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/analytics')}>
            <BarChart3 className="h-4 w-4 mr-1" /> Analytics
          </Button>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="users" className="text-xs gap-1">
              <Users className="h-3.5 w-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Approvals
            </TabsTrigger>
            <TabsTrigger value="issues" className="text-xs gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Issues
            </TabsTrigger>
            <TabsTrigger value="health" className="text-xs gap-1">
              <Heart className="h-3.5 w-3.5" /> Health
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1">
              <History className="h-3.5 w-3.5" /> Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <UsersPanel />
          </TabsContent>
          <TabsContent value="approvals" className="mt-4">
            <ApprovalsPanel />
          </TabsContent>
          <TabsContent value="issues" className="mt-4">
            <IssuesPanel />
          </TabsContent>
          <TabsContent value="health" className="mt-4">
            <HealthPanel />
          </TabsContent>
          <TabsContent value="activity" className="mt-4">
            <ActivityPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
