import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { UserSettingsProvider } from "./hooks/useUserSettings";
import { AppModeProvider } from "./hooks/useAppMode";
import { BottomNav } from "./components/BottomNav";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import { useAuth } from "./hooks/useAuth";
import SessionEdit from "./pages/SessionEdit";
import SessionDetail from "./pages/SessionDetail";
import Profile from "./pages/Profile";
import StrengthTraining from "./pages/StrengthTraining";
import WorkoutSessionPage from "./pages/WorkoutSessionPage";
import Onboarding from "./pages/Onboarding";
import BeginnerDashboard from "./pages/BeginnerDashboard";
import GuidedSession from "./pages/GuidedSession";
import MyPathway from "./pages/MyPathway";
import FighterDashboard from "./pages/FighterDashboard";
import FighterSessionEdit from "./pages/FighterSessionEdit";
import FighterSessionDetail from "./pages/FighterSessionDetail";
import FighterPathway from "./pages/FighterPathway";
import CoachDashboard from "./pages/CoachDashboard";
import CoachSessionEdit from "./pages/CoachSessionEdit";
import TechniqueLibrary from "./pages/TechniqueLibrary";
import Records from "./pages/Records";
import Trends from "./pages/Trends";
import Reflection from "./pages/Reflection";
import Award from "./pages/Award";
import TechniqueArchive from "./pages/TechniqueArchive";
import AIFighterAssistant from "./pages/AIFighterAssistant";
import NotFound from "./pages/NotFound";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminDashboard from "./pages/AdminDashboard";
import { useBrowserNotifications } from "./hooks/useBrowserNotifications";
import { useAnalytics } from "./hooks/useAnalytics";
import { ErrorBoundary, GlobalErrorListener } from "./components/ErrorBoundary";
import { useSubscription } from "./hooks/useSubscription";
import { Navigate, useLocation } from "react-router-dom";

const queryClient = new QueryClient();

function RootRoute() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: subLoading } = useSubscription();
  if (loading || (user && subLoading)) return <div className="min-h-screen bg-background" />;
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  return user ? <Dashboard /> : <Landing />;
}

/**
 * Admins are locked to the admin area. Any other route redirects to /admin.
 * Non-admins pass through unchanged.
 */
function AdminLockGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: subLoading } = useSubscription();
  const { pathname } = useLocation();
  if (authLoading || (user && subLoading)) return <>{children}</>;
  if (user && isAdmin && !pathname.startsWith('/admin') && pathname !== '/auth') {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

function AppShell() {
  useBrowserNotifications();
  useAnalytics();
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/session/new" element={<SessionEdit />} />
        <Route path="/session/:id" element={<SessionDetail />} />
        <Route path="/session/:id/edit" element={<SessionEdit />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/strength" element={<StrengthTraining />} />
        <Route path="/strength/workout/:templateId" element={<WorkoutSessionPage />} />
        <Route path="/strength/workout/:logId/resume" element={<WorkoutSessionPage />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/beginner" element={<BeginnerDashboard />} />
        <Route path="/guided-session/:workoutId" element={<GuidedSession />} />
        <Route path="/pathway" element={<MyPathway />} />
        <Route path="/fighter" element={<FighterDashboard />} />
        <Route path="/fighter/session/new" element={<FighterSessionEdit />} />
        <Route path="/fighter/session/:id" element={<FighterSessionDetail />} />
        <Route path="/fighter/session/:id/edit" element={<FighterSessionEdit />} />
        <Route path="/fighter/pathway" element={<FighterPathway />} />
        <Route path="/coach" element={<CoachDashboard />} />
        <Route path="/coach/session/new" element={<CoachSessionEdit />} />
        <Route path="/coach/session/:id/edit" element={<CoachSessionEdit />} />
        <Route path="/library" element={<TechniqueLibrary />} />
        <Route path="/archive" element={<TechniqueArchive />} />
        <Route path="/records" element={<Records />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/reflection" element={<Reflection />} />
        <Route path="/award" element={<Award />} />
        <Route path="/ai-assistant" element={<AIFighterAssistant />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <UserSettingsProvider>
              <AppModeProvider>
                <GlobalErrorListener />
                <AppShell />
              </AppModeProvider>
            </UserSettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
