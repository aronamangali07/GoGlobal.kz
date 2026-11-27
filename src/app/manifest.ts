import type { MetadataRoute } from "next";

/** Веб-манифест: установка на главный экран телефона как приложение. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GoGlobal — программы за рубежом",
    short_name: "GoGlobal",
    description: "Work and Travel, Au Pair, стажировки и лагеря. Честное распределение офферов и уведомления.",
    lang: "ru",
    dir: "ltr",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#050a1c",
    theme_color: "#050a1c",
    categories: ["education", "travel"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Офферы", short_name: "Офферы", url: "/offers?source=pwa", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Мой путь", short_name: "Мой путь", url: "/journey?source=pwa", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Сообщения", short_name: "Чат", url: "/messages?source=pwa", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
