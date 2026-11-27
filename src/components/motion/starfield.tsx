import { cn } from "@/lib/utils";

// Детерминированный генератор, чтобы звёзды совпадали на сервере и клиенте
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(2026);
const STARS = Array.from({ length: 70 }, () => ({
  x: rand() * 100,
  y: rand() * 100,
  s: rand() < 0.15 ? 2 : 1,
  d: (rand() * 4).toFixed(2),
  o: (0.3 + rand() * 0.7).toFixed(2),
}));

export function Starfield({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white motion-safe:animate-[twinkle_4s_ease-in-out_infinite]"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.s,
            height: s.s,
            opacity: Number(s.o),
            animationDelay: `${s.d}s`,
          }}
        />
      ))}
    </div>
  );
}
