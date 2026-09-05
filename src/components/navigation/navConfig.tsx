import {
  Home,
  ClipboardCheck,
  HeartPulse,
  MessagesSquare,
  FileText,
  User,
  Settings,
  Lock,
  BrainCog,
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

export const primaryNavItems: NavItem[] = [
  { label: "Home", href: "/app", icon: Home, end: true },
  { label: "Check In", href: "/app/check-in", icon: ClipboardCheck },
  { label: "Recovery", href: "/app/recovery", icon: HeartPulse },
  { label: "Focus", href: "/app/neuro-adaptive", icon: BrainCog },
];

export const secondaryNavItems: NavItem[] = [
  { label: "Assistant", href: "/app/research", icon: MessagesSquare },
  { label: "Reports", href: "/app/reports", icon: FileText },
  { label: "Privacy & Data", href: "/app/privacy", icon: Lock },
  { label: "Profile", href: "/app/profile", icon: User },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export const mobileNavItems: NavItem[] = primaryNavItems;
