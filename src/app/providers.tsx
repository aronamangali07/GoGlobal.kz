"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ServiceWorker } from "@/features/pwa/pwa";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* reducedMotion="user" — Motion сам отключает трансформации при prefers-reduced-motion */}
      <MotionConfig reducedMotion="user">
        {children}
        <ServiceWorker />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ className: "!rounded-2xl !font-sans" }}
        />
      </MotionConfig>
    </ThemeProvider>
  );
}
