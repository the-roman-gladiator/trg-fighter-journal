import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { UserSettingsProvider } from "./hooks/useUserSettings";
import { AppModeProvider } from "./hooks/useAppMode";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <UserSettingsProvider>
            <AppModeProvider>
              <Routes>
                <Route path="/" element={<Dashboard />} />
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
              </Routes>
            </AppModeProvider>
          </UserSettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
