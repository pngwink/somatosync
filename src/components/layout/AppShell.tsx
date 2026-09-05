import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "../navigation/Sidebar";
import { TopHeader } from "../navigation/TopHeader";
import { MobileNavigation } from "../navigation/MobileNavigation";
import { useAppMode } from "../../context/AppModeContext";
import { FocusModeOverlay } from "../../features/adaptive/FocusModeOverlay";
import { FirstTimeRecoverySetup } from "../../features/onboarding/FirstTimeRecoverySetup";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { mode } = useAppMode();

  if (mode === "signed-out") {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        {mode === "demo" && (
          <div data-focus-shell="demo-banner" className="border-b border-[var(--color-accent-soft-border)] bg-[var(--color-accent-soft)] px-4 py-1.5 text-center text-[16px] font-semibold text-[var(--color-accent)] sm:px-6">
            Maya Chen demo · sample recovery data
          </div>
        )}
        <main className="app-content flex-1 px-4 pb-24 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pb-14 xl:px-12">
          <div className="mx-auto w-full max-w-[1120px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <MobileNavigation />
      <FocusModeOverlay />
      <FirstTimeRecoverySetup />
    </div>
  );
}
