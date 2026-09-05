import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { primaryNavItems, secondaryNavItems, type NavItem } from "./navConfig";
import { cn } from "../../lib/utils";
import { currentPatient } from "../../data/patient";
import { useAppMode } from "../../context/AppModeContext";
import { loadRecoveryProfile } from "../../features/recovery/recoveryProfile";
import { isAcuteRecovery } from "../../features/science/recoverySafety";

export function Sidebar() {
  const { mode, userName } = useAppMode();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const acuteMode = mode === "user" && isAcuteRecovery(loadRecoveryProfile());
  const visiblePrimary = acuteMode ? primaryNavItems.filter((item) => item.href === "/app" || item.href === "/app/check-in") : primaryNavItems;
  const hasActiveSecondary = !acuteMode && secondaryNavItems.some((item) => location.pathname.startsWith(item.href));
  const showMoreItems = !acuteMode && (moreOpen || hasActiveSecondary);
  const displayName = mode === "demo" ? currentPatient.name : userName;
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside data-focus-shell="sidebar" className="hidden w-[236px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex">
      <div className="flex h-16 items-center px-5">
        <Wordmark />
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4" aria-label="Primary">
        {visiblePrimary.map((item) => (
          <NavItemLink key={item.href} {...item} />
        ))}

        {!acuteMode && <div className="pt-2">
          <button
            type="button"
            onClick={() => setMoreOpen((value) => !value)}
            className="flex w-full items-center gap-3 rounded-[13px] px-3.5 py-3 text-[16px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]"
            aria-expanded={showMoreItems}
          >
            <MoreHorizontal className="h-[18px] w-[18px] shrink-0 text-[var(--color-text-tertiary)]" />
            <span className="flex-1 text-left">More</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", showMoreItems && "rotate-180")} />
          </button>
          {showMoreItems && (
            <div className="mt-1 space-y-0.5 border-l border-[var(--color-border)] pl-2">
              {secondaryNavItems.map((item) => (
                <NavItemLink key={item.href} {...item} compact />
              ))}
            </div>
          )}
        </div>}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3">
        <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[16px] font-semibold text-[var(--color-accent)]">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-medium text-[var(--color-text-primary)]">{displayName}</p>
            <p className="truncate text-[16px] text-[var(--color-text-tertiary)]">
              {mode === "demo" ? `Demo snapshot · Day ${currentPatient.recoveryDay}` : "Private recovery record"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItemLink({ label, href, icon: Icon, end, compact = false }: NavItem & { compact?: boolean }) {
  return (
    <NavLink
      to={href}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-[13px] px-3.5 py-3 text-[16px] font-medium transition-colors",
          compact && "py-2.5 text-[16px]",
          isActive
            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-[var(--shadow-low)]"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]")} />
          <span aria-current={isActive ? "page" : undefined}>{label}</span>
        </>
      )}
    </NavLink>
  );
}
