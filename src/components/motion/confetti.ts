"use client";
import confetti from "canvas-confetti";

/** Праздничный залп — для получения места и визы. Учитывает reduced-motion. */
export function celebrate() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#3552f2", "#2de2d6", "#ff7a2f", "#ffd166", "#ffffff"];
  const end = Date.now() + 900;
  const frame = () => {
    confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0, y: 0.75 }, colors, disableForReducedMotion: true });
    confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1, y: 0.75 }, colors, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  confetti({ particleCount: 120, spread: 100, startVelocity: 45, origin: { y: 0.6 }, colors, disableForReducedMotion: true });
  frame();
}
