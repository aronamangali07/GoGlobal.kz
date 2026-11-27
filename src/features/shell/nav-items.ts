import { CalendarDays, Compass, House, MessageCircle, Route, UserRound } from "lucide-react";

export const STUDENT_NAV = [
  { href: "/dashboard", key: "home", icon: House },
  { href: "/offers", key: "offers", icon: Compass },
  { href: "/journey", key: "journey", icon: Route },
  { href: "/messages", key: "messages", icon: MessageCircle },
  { href: "/profile", key: "profile", icon: UserRound },
] as const;

// Пункты только для десктопного меню (на телефоне — внутри разделов)
export const STUDENT_NAV_EXTRA = [{ href: "/calendar", key: "calendar", icon: CalendarDays }] as const;
