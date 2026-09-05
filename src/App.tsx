import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { AppShell } from "./components/layout/AppShell";
import { ThemeProvider } from "./hooks/ThemeProvider";
import { ToastProvider } from "./components/shared/Toast";
import { TooltipProvider } from "./components/ui/tooltip";
import { AppModeProvider } from "./context/AppModeContext";
import { NeuroAdaptiveProvider } from "./features/adaptive/NeuroAdaptiveContext";
import { UserPreferencesProvider } from "./context/UserPreferencesContext";

import { LandingPage } from "./pages/LandingPage";
import { SignInPage } from "./pages/auth/SignInPage";
import { CreateAccountPage } from "./pages/auth/CreateAccountPage";
import { OverviewPage } from "./pages/OverviewPage";
import { CheckInPage } from "./pages/CheckInPage";
import { ReactionAssessmentPage } from "./features/assessments/reaction/ReactionAssessmentPage";
import { PcssAssessmentPage } from "./features/assessments/pcss/PcssAssessmentPage";
import { VoiceCheckInPage } from "./features/voice/VoiceCheckInPage";
import { BalanceAssessmentPage } from "./features/assessments/balance/BalanceAssessmentPage";
import { MemoryAssessmentPage } from "./features/assessments/memory/MemoryAssessmentPage";
import { LegalPage } from "./pages/LegalPage";
import { ProgressPage } from "./pages/ProgressPage";
import { RecoveryHubPage } from "./pages/RecoveryHubPage";
import { ReturnSupportPage } from "./pages/ReturnSupportPage";
import { ResearchAssistantPage } from "./pages/ResearchAssistantPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { PrivacyDataPage } from "./features/privacy/PrivacyDataPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { NeuroAdaptivePage } from "./features/adaptive/NeuroAdaptivePage";
import { SharedSupportsPage } from "./features/relay/SharedSupportsPage";
import { RecoveryRelayPage } from "./pages/RecoveryRelayPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/create-account" element={<CreateAccountPage />} />
      <Route path="/terms" element={<LegalPage type="terms" />} />
      <Route path="/privacy-policy" element={<LegalPage type="privacy" />} />
      <Route path="/share/supports" element={<SharedSupportsPage />} />

      <Route
        path="/app"
        element={
          <AppShell>
            <OverviewPage />
          </AppShell>
        }
      />
      <Route
        path="/app/check-in"
        element={
          <AppShell>
            <CheckInPage />
          </AppShell>
        }
      />
      <Route path="/app/assessments" element={<Navigate to="/app/check-in?tab=history" replace />} />
      <Route
        path="/app/assessments/reaction-time"
        element={
          <AppShell>
            <ReactionAssessmentPage />
          </AppShell>
        }
      />
      <Route
        path="/app/assessments/pcss"
        element={
          <AppShell>
            <PcssAssessmentPage />
          </AppShell>
        }
      />
      <Route
        path="/app/assessments/voice-check-in"
        element={
          <AppShell>
            <VoiceCheckInPage />
          </AppShell>
        }
      />
      <Route
        path="/app/assessments/balance"
        element={
          <AppShell>
            <BalanceAssessmentPage />
          </AppShell>
        }
      />
      <Route
        path="/app/assessments/memory"
        element={
          <AppShell>
            <MemoryAssessmentPage />
          </AppShell>
        }
      />
      <Route path="/app/assessments/visual-tracking" element={<Navigate to="/app/check-in" replace />} />
      <Route path="/app/calendar" element={<Navigate to="/app/check-in?tab=schedule" replace />} />
      <Route
        path="/app/recovery"
        element={
          <AppShell>
            <RecoveryHubPage />
          </AppShell>
        }
      />
      <Route path="/app/progress" element={<Navigate to="/app/recovery?tab=progress" replace />} />
      <Route path="/app/return-support" element={<Navigate to="/app/recovery?tab=plan" replace />} />
      <Route
        path="/app/recovery/plan-details"
        element={
          <AppShell>
            <ReturnSupportPage />
          </AppShell>
        }
      />
      <Route
        path="/app/recovery/share"
        element={
          <AppShell>
            <RecoveryRelayPage />
          </AppShell>
        }
      />
      <Route
        path="/app/recovery/progress-details"
        element={
          <AppShell>
            <ProgressPage />
          </AppShell>
        }
      />
      <Route
        path="/app/research"
        element={
          <AppShell>
            <ResearchAssistantPage />
          </AppShell>
        }
      />
      <Route
        path="/app/reports"
        element={
          <AppShell>
            <ReportsPage />
          </AppShell>
        }
      />
      <Route
        path="/app/profile"
        element={
          <AppShell>
            <ProfilePage />
          </AppShell>
        }
      />
      <Route
        path="/app/settings"
        element={
          <AppShell>
            <SettingsPage />
          </AppShell>
        }
      />
      <Route
        path="/app/neuro-adaptive"
        element={
          <AppShell>
            <NeuroAdaptivePage />
          </AppShell>
        }
      />
      <Route
        path="/app/privacy"
        element={
          <AppShell>
            <PrivacyDataPage />
          </AppShell>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={200}>
          <ToastProvider>
            <AppModeProvider>
              <UserPreferencesProvider>
                <NeuroAdaptiveProvider>
                  <BrowserRouter>
                    <AppRoutes />
                  </BrowserRouter>
                </NeuroAdaptiveProvider>
              </UserPreferencesProvider>
            </AppModeProvider>
          </ToastProvider>
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
