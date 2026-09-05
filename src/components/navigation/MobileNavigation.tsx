import { NavLink } from "react-router-dom";
import { mobileNavItems } from "./navConfig";
import { cn } from "../../lib/utils";

export function MobileNavigation() {
  return (
    <nav
      data-focus-shell="mobile-nav"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-border)] bg-[var(--color-surface)]/96 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden"
      aria-label="Primary"
    >
      {mobileNavItems.map(({ label, href, icon: Icon, end }) => (
        <NavLink
          key={href}
          to={href}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1.5 rounded-[14px] py-2.5 text-[16px] font-semibold transition-colors",
              isActive ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span aria-current={isActive ? "page" : undefined}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
