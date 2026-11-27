import { CalendarDays, Megaphone, Compass, FileCheck2, House, LayoutGrid, MessageCircle, Route, UserRound, Users, Wallet } from "lucide-react";

export const STUDENT_NAV = [
  { href: "/dashboard", key: "home", icon: House },
  { href: "/offers", key: "offers", icon: Compass },
  { href: "/journey", key: "journey", icon: Route },
  { href: "/messages", key: "messages", icon: MessageCircle },
  { href: "/profile", key: "profile", icon: UserRound },
] as const;

// Пункты только для десктопного меню (на телефоне — внутри разделов)
export const STUDENT_NAV_EXTRA = [
  { href: "/calendar", key: "calendar", icon: CalendarDays },
  { href: "/documents", key: "documents", icon: FileCheck2 },
  { href: "/payments", key: "payments", icon: Wallet },
] as const;

export const STAFF_NAV = [
  { href: "/dashboard", key: "home", icon: House },
  { href: "/manage/offers", key: "manageOffers", icon: LayoutGrid },
  { href: "/manage/students", key: "students", icon: Users },
  { href: "/manage/documents", key: "documents", icon: FileCheck2 },
  { href: "/messages", key: "messages", icon: MessageCircle },
] as const;

// Только в боковом меню персонала (на телефоне — через «Офферы»)
export const STAFF_NAV_EXTRA = [{ href: "/manage/broadcast", key: "broadcast", icon: Megaphone }] as const;
