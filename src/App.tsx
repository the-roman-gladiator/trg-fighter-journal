import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { UserSettingsProvider } from "./hooks/useUserSettings";
import { AppModeProvider } from "./hooks/useAppMode";
import { BottomNav } from "./components/BottomNav";
import { ErrorBoundary, GlobalErrorListener } from "./components/ErrorBoundary";
import { useBrowserNotifications } from "./hooks/useBrowserNotifications";
import { useAnalytics } from "./hooks/useAnalytics";
import { useSubscription } from "./hooks/useSubscription";
import globalBgDark from "@/assets/dashboard-bg-octagon.webp";
import { SubscriptionProvider } from "./hooks/useSubscription";
import { FighterProfileProvider } from "./hooks/useFighterProfile";

// Eager: critical first-paint routes
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

// Lazy: everything else (code-split for faster initial load)
const SessionEdit = lazy(() => import("./pages/SessionEdit"));
const SessionDetail = lazy(() => import("./pages/SessionDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const StrengthTraining = lazy(() => import("./pages/StrengthTraining"));
const WorkoutSessionPage = lazy(() => import("./pages/WorkoutSessionPage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

const BeginnerDashboard = lazy(() => import("./pages/BeginnerDashboard"));
const GuidedSession = lazy(() => import("./pages/GuidedSession"));
const MyPathway = lazy(() => import("./pages/MyPathway"));
const FighterDashboard = lazy(() => import("./pages/FighterDashboard"));
const FighterSessionEdit = lazy(() => import("./pages/FighterSessionEdit"));
const FighterSessionDetail = lazy(() => import("./pages/FighterSessionDetail"));
const FighterPathway = lazy(() => import("./pages/FighterPathway"));
const CoachDashboard = lazy(() => import("./pages/CoachDashboard"));
const CoachSessionEdit = lazy(() => import("./pages/CoachSessionEdit"));
const StudentSaveCoachNote = lazy(() => import("./pages/StudentSaveCoachNote"));
const TechniqueLibrary = lazy(() => import("./pages/TechniqueLibrary"));
const Records = lazy(() => import("./pages/Records"));
const Trends = lazy(() => import("./pages/Trends"));
const Reflection = lazy(() => import("./pages/Reflection"));
const Award = lazy(() => import("./pages/Award"));
const AIFighterAssistant = lazy(() => import("./pages/AIFighterAssistant"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));



// Pre-warm route chunks while the browser is idle so first navigation is instant
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  (window as any).requestIdleCallback(() => {
    import('./pages/SessionEdit');
    import('./pages/Profile');
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function RootRoute() {
  const { user, profile, loading } = useAuth();
  const { isAdmin, loading: subLoading } = useSubscription();
  if (loading || (user && subLoading)) return <LoadingScreen />;
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

function GlobalDarkBackground() {
  const { pathname } = useLocation();
  // Background image lives ONLY on the main dashboard route ("/").
  // Every other page uses the plain dark --background color from CSS.
  if (pathname !== '/') return null;
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${globalBgDark})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          opacity: 0.42,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-background/55 via-background/35 to-background/85"
      />
    </>
  );
}

function AppShell() {
  useBrowserNotifications();
  useAnalytics();
  const { pathname } = useLocation();
  const excludeBg = pathname.startsWith('/profile');
  return (
    <div className={`h-[100dvh] flex flex-col overflow-hidden ${excludeBg ? 'bg-background' : 'bg-transparent'} relative`}>
      <GlobalDarkBackground />
      <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] relative z-10">
      <AdminLockGate>
      <Suspense fallback={<LoadingScreen />}>
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
        <Route path="/coach-note/save/:offerId" element={<StudentSaveCoachNote />} />
        <Route path="/library" element={<TechniqueLibrary />} />
        
        <Route path="/records" element={<Records />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/reflection" element={<Reflection />} />
        <Route path="/award" element={<Award />} />
        <Route path="/ai-assistant" element={<AIFighterAssistant />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </AdminLockGate>
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
            <SubscriptionProvider>
              <FighterProfileProvider>
                <UserSettingsProvider>
                  <AppModeProvider>
                    <GlobalErrorListener />
                    <AppShell />
                  </AppModeProvider>
                </UserSettingsProvider>
              </FighterProfileProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
