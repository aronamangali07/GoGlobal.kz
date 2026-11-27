"use client";

import { geoDistance, geoInterpolate, geoOrthographic } from "d3-geo";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import dots from "./land-dots.json";
import { DESTINATIONS, HOME, type City } from "./routes";

type Dot = [number, number, number];
const LAND = dots as Dot[];

const COLORS = {
  dot: "rgba(160, 182, 255, 0.85)",
  dotKz: "rgba(255, 170, 90, 0.95)",
  route: [45, 226, 214] as const,
  plane: "#ffffff",
  glow: "rgba(90, 120, 255, 0.35)",
};

const TRAVEL_MS = 2600; // полёт самолёта
const HOLD_MS = 1300; // пауза в точке прибытия
const TURN_MS = 1400; // поворот глобуса к следующему маршруту

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerpAngle = (a: number, b: number, t: number) => {
  let d = ((b - a + 540) % 360) - 180;
  if (d < -180) d += 360;
  return a + d * t;
};

/** Центр вида так, чтобы маршрут целиком был на видимой стороне. */
function viewFor(dest: City): [number, number] {
  const mid = geoInterpolate(HOME.coords, dest.coords)(0.5);
  return [-mid[0], -mid[1] * 0.75 - 8];
}

export function RouteGlobe({
  className,
  onRouteChange,
}: {
  className?: string;
  onRouteChange?: (city: City) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const onRouteChangeRef = useRef(onRouteChange);
  useEffect(() => {
    onRouteChangeRef.current = onRouteChange;
  }, [onRouteChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const projection = geoOrthographic().clipAngle(90).precision(0.3);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const r = Math.min(width, height) * 0.41;
      projection.scale(r).translate([width / 2, height / 2]);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let routeIndex = 0;
    let phaseStart = performance.now();
    let phase: "turn" | "fly" | "hold" = "turn";
    let fromView = viewFor(DESTINATIONS[DESTINATIONS.length - 1]);
    let toView = viewFor(DESTINATIONS[0]);
    let rotation: [number, number] = [...fromView];
    const done: City[] = [];
    onRouteChangeRef.current?.(DESTINATIONS[0]);

    // Высота дуги над поверхностью: точку отодвигаем от центра диска.
    const lift = (p: [number, number], h: number): [number, number] => {
      const [cx, cy] = projection.translate();
      return [cx + (p[0] - cx) * (1 + h), cy + (p[1] - cy) * (1 + h)];
    };
    const arcPoint = (interp: (t: number) => [number, number], t: number, peak: number) => {
      const p = projection(interp(t));
      if (!p) return null;
      return lift(p as [number, number], peak * Math.sin(Math.PI * t));
    };

    const drawArc = (dest: City, upTo: number, alpha: number, withPlane: boolean, now: number) => {
      const interp = geoInterpolate(HOME.coords, dest.coords);
      const dist = geoDistance(HOME.coords, dest.coords);
      const peak = Math.min(0.22, 0.08 + dist * 0.06);
      const steps = 80;
      const [r, g, b] = COLORS.route;

      // Хвост: от прозрачного к яркому
      ctx.lineCap = "round";
      let prev = arcPoint(interp, 0, peak);
      const last = Math.max(1, Math.floor(steps * upTo));
      for (let i = 1; i <= last; i++) {
        const t = (i / steps);
        const p = arcPoint(interp, Math.min(t, upTo), peak);
        if (!p || !prev) continue;
        const fade = withPlane ? Math.max(0.12, i / last) : 0.55;
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * fade})`;
        ctx.lineWidth = 2.2;
        ctx.shadowColor = `rgba(${r},${g},${b},0.9)`;
        ctx.shadowBlur = withPlane ? 10 : 4;
        ctx.beginPath();
        ctx.moveTo(prev[0], prev[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.stroke();
        prev = p;
      }
      ctx.shadowBlur = 0;

      if (withPlane && upTo > 0.01 && upTo < 0.999) {
        const a = arcPoint(interp, upTo, peak);
        const b2 = arcPoint(interp, Math.min(1, upTo + 0.01), peak);
        if (a && b2) drawPlane(a, Math.atan2(b2[1] - a[1], b2[0] - a[0]), now);
      }
    };

    const drawPlane = (p: [number, number], angle: number, now: number) => {
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(angle);
      const s = Math.max(0.8, Math.min(1.25, width / 520));
      ctx.scale(s, s);
      // свечение
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      grd.addColorStop(0, `rgba(255,255,255,${0.35 + 0.1 * Math.sin(now / 120)})`);
      grd.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      // силуэт самолёта (нос по оси +x)
      ctx.fillStyle = COLORS.plane;
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.quadraticCurveTo(7, -1.4, 3, -1.4);
      ctx.lineTo(-1, -1.4);
      ctx.lineTo(-4.5, -8);
      ctx.lineTo(-6.5, -8);
      ctx.lineTo(-4.5, -1.4);
      ctx.lineTo(-8, -1.4);
      ctx.lineTo(-9.5, -4);
      ctx.lineTo(-11, -4);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-11, 4);
      ctx.lineTo(-9.5, 4);
      ctx.lineTo(-8, 1.4);
      ctx.lineTo(-4.5, 1.4);
      ctx.lineTo(-6.5, 8);
      ctx.lineTo(-4.5, 8);
      ctx.lineTo(-1, 1.4);
      ctx.lineTo(3, 1.4);
      ctx.quadraticCurveTo(7, 1.4, 9, 0);
      ctx.fill();
      ctx.restore();
    };

    const drawCity = (c: City, now: number, strong: boolean) => {
      const center: [number, number] = [-rotation[0], -rotation[1]];
      if (geoDistance(center, c.coords) > Math.PI / 2 - 0.05) return;
      const p = projection(c.coords);
      if (!p) return;
      const pulse = (now / 1600) % 1;
      const [r, g, b] = c === HOME ? [255, 154, 82] : COLORS.route;
      if (strong) {
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.6 * (1 - pulse)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 4 + pulse * 14, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.shadowColor = `rgb(${r},${g},${b})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p[0], p[1], strong ? 3.6 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const render = (now: number, progress: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      projection.rotate([rotation[0], rotation[1], 0]);
      const [cx, cy] = projection.translate();
      const R = projection.scale();

      // атмосфера
      const atm = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.2);
      atm.addColorStop(0, COLORS.glow);
      atm.addColorStop(1, "rgba(90,120,255,0)");
      ctx.fillStyle = atm;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // шар
      const sphere = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      sphere.addColorStop(0, "#1b2a63");
      sphere.addColorStop(1, "#070d26");
      ctx.fillStyle = sphere;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120,150,255,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // точки суши
      const center: [number, number] = [-rotation[0], -rotation[1]];
      const size = Math.max(1.3, R / 150);
      for (let i = 0; i < LAND.length; i++) {
        const d = LAND[i];
        const dist = geoDistance(center, [d[0], d[1]]);
        if (dist > Math.PI / 2) continue;
        const p = projection([d[0], d[1]]);
        if (!p) continue;
        const edge = 1 - dist / (Math.PI / 2); // затемнение к краю
        ctx.fillStyle = d[2] ? COLORS.dotKz : COLORS.dot;
        ctx.globalAlpha = 0.18 + 0.82 * Math.sqrt(edge);
        const s = d[2] ? size * 1.5 : size;
        ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
      }
      ctx.globalAlpha = 1;

      // уже пройденные маршруты — тусклые
      for (const c of done) drawArc(c, 1, 0.35, false, now);
      const current = DESTINATIONS[routeIndex];
      if (phase !== "turn" || reduced) drawArc(current, progress, 1, !reduced, now);

      drawCity(HOME, now, true);
      for (const c of DESTINATIONS) drawCity(c, now, c === current);
    };

    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - phaseStart;
      let progress = 0;
      if (phase === "turn") {
        const t = easeInOut(Math.min(1, elapsed / TURN_MS));
        rotation = [lerpAngle(fromView[0], toView[0], t), fromView[1] + (toView[1] - fromView[1]) * t];
        if (elapsed >= TURN_MS) {
          phase = "fly";
          phaseStart = now;
        }
      } else if (phase === "fly") {
        progress = easeInOut(Math.min(1, elapsed / TRAVEL_MS));
        // лёгкий дрейф глобуса во время полёта
        rotation = [toView[0] - progress * 6, toView[1]];
        if (elapsed >= TRAVEL_MS) {
          phase = "hold";
          phaseStart = now;
        }
      } else {
        progress = 1;
        rotation = [toView[0] - 6 - (elapsed / HOLD_MS) * 2, toView[1]];
        if (elapsed >= HOLD_MS) {
          done.push(DESTINATIONS[routeIndex]);
          if (done.length > 3) done.shift();
          routeIndex = (routeIndex + 1) % DESTINATIONS.length;
          fromView = [...rotation];
          toView = viewFor(DESTINATIONS[routeIndex]);
          phase = "turn";
          phaseStart = now;
          onRouteChangeRef.current?.(DESTINATIONS[routeIndex]);
        }
      }
      render(now, progress);
      raf = requestAnimationFrame(tick);
    };

    if (reduced) {
      // Статичный кадр: все маршруты сразу, без движения
      rotation = viewFor(DESTINATIONS[0]);
      done.push(...DESTINATIONS.slice(1, 4));
      const draw = () => render(performance.now(), 1);
      draw();
      ro.disconnect();
      const ro2 = new ResizeObserver(() => {
        resize();
        draw();
      });
      ro2.observe(canvas);
      return () => ro2.disconnect();
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
