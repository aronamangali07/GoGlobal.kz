// Типы уведомлений и категории для настроек (какие каналы включены).
export const CATEGORIES = ["offers", "applications", "events", "documents", "payments", "announcements", "messages", "staff"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Channel = "email" | "telegram";

export const TYPE_CATEGORY = {
  "offer.new": "offers",
  "application.selected": "applications",
  "application.waitlisted": "applications",
  "application.rejected": "applications",
  "application.approved": "applications",
  "application.ineligible": "applications",
  "event.scheduled": "events",
  "event.reminder24": "events",
  "event.reminder1": "events",
  "document.accepted": "documents",
  "document.rework": "documents",
  "payment.due": "payments",
  "announcement": "announcements",
  "message.new": "messages",
  // менеджеру
  "application.new": "staff",
  "document.uploaded": "staff",
  "offer.window_closed": "staff",
} as const satisfies Record<string, Category>;
export type NotificationType = keyof typeof TYPE_CATEGORY;

export type Prefs = Partial<Record<Category, Partial<Record<Channel, boolean>>>>;

/** По умолчанию всё включено. */
export function channelEnabled(prefs: Prefs | null | undefined, type: NotificationType, channel: Channel) {
  return prefs?.[TYPE_CATEGORY[type]]?.[channel] !== false;
}

export const TYPE_EMOJI: Partial<Record<NotificationType, string>> = {
  "offer.new": "✈️",
  "application.selected": "🎉",
  "application.approved": "✅",
  "application.waitlisted": "⏳",
  "application.rejected": "📭",
  "application.ineligible": "📭",
  "event.scheduled": "📅",
  "event.reminder24": "⏰",
  "event.reminder1": "⏰",
  "document.accepted": "✅",
  "document.rework": "✏️",
  "payment.due": "💳",
  announcement: "📣",
  "message.new": "💬",
  "application.new": "🙋",
  "document.uploaded": "📄",
  "offer.window_closed": "🔒",
};
