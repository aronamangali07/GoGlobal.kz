// Генерирует точки суши для «точечного» глобуса на экране входа.
// Запуск: node scripts/gen-globe-dots.mjs  → src/components/globe/land-dots.json
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { geoContains, geoBounds } from "d3-geo";

const topo = JSON.parse(
  readFileSync(new URL("../node_modules/world-atlas/countries-110m.json", import.meta.url)),
);
const countries = feature(topo, topo.objects.countries).features.map((f) => ({
  f,
  id: f.id,
  b: geoBounds(f),
}));

const N = 15000; // точек на всей сфере (равномерная сетка Фибоначчи)
const golden = Math.PI * (3 - Math.sqrt(5));
const out = [];
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2;
  const lat = (Math.asin(y) * 180) / Math.PI;
  let lon = ((i * golden * 180) / Math.PI) % 360;
  if (lon > 180) lon -= 360;
  if (lat < -60) continue; // Антарктида не нужна
  for (const c of countries) {
    const [[x0, y0], [x1, y1]] = c.b;
    const inLon = x0 <= x1 ? lon >= x0 && lon <= x1 : lon >= x0 || lon <= x1;
    if (!inLon || lat < y0 || lat > y1) continue;
    if (geoContains(c.f, [lon, lat])) {
      // 1 = Казахстан (подсвечиваем), 0 = остальной мир
      out.push([+lon.toFixed(2), +lat.toFixed(2), c.id === "398" ? 1 : 0]);
      break;
    }
  }
}
writeFileSync(
  new URL("../src/components/globe/land-dots.json", import.meta.url),
  JSON.stringify(out),
);
console.log(`dots: ${out.length}, kz: ${out.filter((d) => d[2]).length}`);
