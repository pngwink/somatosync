import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { Bell, Menu, Moon, Sun, Laptop, LogOut, Settings as SettingsIcon, User as UserIcon, X } from "lucide-react";
import { useState } from "react";
import { Wordmark } from "./Wordmark";
import { primaryNavItems, secondaryNavItems } from "./navConfig";
import { useTheme } from "../../hooks/useTheme";
import { currentPatient } from "../../data/patient";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useToast } from "../shared/Toast";
import { cn } from "../../lib/utils";
import { useAppMode } from "../../context/AppModeContext";
import { useUserPreferences } from "../../context/UserPreferencesContext";
import { buildTwoWeekSchedule, toLocalDateKey } from "../../features/schedule/scheduleEngine";
import { FocusModeControl } from "../../features/adaptive/FocusModeControl";
import { DangerSignsDialog } from "../../features/safety/DangerSignsDialog";
import { loadRecoveryProfile } from "../../features/recovery/recoveryProfile";
import { isAcuteRecovery } from "../../features/science/recoverySafety";

const allNavItems = [...primaryNavItems, ...secondaryNavItems];

export function TopHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, mode, setMode } = useTheme();
  const { show } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode: appMode, userName, signOut } = useAppMode();
  const { notificationsEnabled, assessmentRemindersEnabled } = useUserPreferences();
  const todayKey = toLocalDateKey(new Date());
  const todayTasks = buildTwoWeekSchedule(appMode, new Date()).find((day) => day.dateKey === todayKey)?.tasks ?? [];
  const reminderTasks = todayTasks.filter((task) => task.status === "due-today");
  const acuteMode = appMode === "user" && isAcuteRecovery(loadRecoveryProfile());
  const visiblePrimaryNav = acuteMode ? primaryNavItems.filter((item) => item.href === "/app" || item.href === "/app/check-in") : primaryNavItems;
  const visibleSecondaryNav = acuteMode ? [] : secondaryNavItems;
  const displayName = appMode === "demo" ? currentPatient.name : userName;
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentTitle = location.pathname.startsWith("/app/assessments")
    ? "Check In"
    : allNavItems.find((i) => (i.end ? location.pathname === i.href : location.pathname.startsWith(i.href)))?.label ?? "SomatoSync";

  return (
    <>
      <header data-focus-shell="header" className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-3">
          <button
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <span className="hidden text-[16px] font-semibold text-[var(--color-text-primary)] lg:block" aria-current="page">
            {currentTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DangerSignsDialog compact={false} />
          {!acuteMode && <FocusModeControl />}
          {!acuteMode && notificationsEnabled && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
                  aria-label="Notifications"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {assessmentRemindersEnabled && reminderTasks.length > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {assessmentRemindersEnabled && reminderTasks.length > 0 ? (
                  <div className="space-y-1 px-2 py-1">
                    {reminderTasks.map((task) => (
                      <DropdownMenuItem key={`${task.date}-${task.assessmentType}`} onClick={() => navigate(task.href)}>
                        <div>
                          <p className="font-medium">{task.label}</p>
                          <p className="text-[16px] text-[var(--color-text-secondary)]">Suggested for today</p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ) : (
                  <div className="px-2.5 py-3 text-[16px] text-[var(--color-text-secondary)]">
                    {assessmentRemindersEnabled ? "Nothing is due right now." : "Assessment reminders are turned off."}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]" aria-label="Theme">
                {resolvedTheme === "dark" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setMode("light")}>
                <Sun className="h-3.5 w-3.5" /> Light {mode === "light" && "✓"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("dark")}>
                <Moon className="h-3.5 w-3.5" /> Dark {mode === "dark" && "✓"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("system")}>
                <Laptop className="h-3.5 w-3.5" /> System {mode === "system" && "✓"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 rounded-full" aria-label="Account menu">
                <Avatar>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {displayName}
                {appMode === "demo" ? " · Demo" : ""}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/app/profile")}>
                <UserIcon className="h-3.5 w-3.5" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                <SettingsIcon className="h-3.5 w-3.5" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  signOut();
                  show({ title: "Signed out", description: "Prototype session cleared.", tone: "success" });
                  navigate("/sign-in");
                }}
              >
                <LogOut className="h-3.5 w-3.5" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/30" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[var(--color-surface)] p-4 shadow-[var(--shadow-med)]">
            <div className="mb-4 flex items-center justify-between">
              <Wordmark />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-1.5 text-[var(--color-text-secondary)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-0.5" aria-label="Primary">
              {visiblePrimaryNav.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2.5 text-[16px] font-medium",
                      isActive ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
              {!acuteMode && <p className="mb-1 mt-4 px-2.5 text-[16px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">More</p>}
              {visibleSecondaryNav.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2.5 text-[16px] font-medium",
                      isActive ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
