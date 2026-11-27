import { Landmark, Mic, Plane, Timer, TriangleAlert } from "lucide-react";

// Отдельный (не клиентский) модуль: иконки нужны и серверным, и клиентским компонентам
export const EVENT_ICONS = { interview: Mic, embassy: Landmark, deadline: TriangleAlert, flight: Plane, other: Timer } as const;
