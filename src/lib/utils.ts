import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Текущее время для серверных компонентов (динамический рендер на каждый запрос). */
export const nowMs = () => Date.now();
