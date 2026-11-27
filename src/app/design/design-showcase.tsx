"use client";

import { motion } from "motion/react";
import { Bell, Heart, Mail, MapPin, PartyPopper, Plane } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { celebrate } from "@/components/motion/confetti";

const SWATCHES = [
  "bg", "surface", "surface-2", "fg", "fg-muted", "border",
  "primary", "route", "accent", "success", "warning", "danger",
] as const;

// Демонстрационная витрина компонентов (тексты — образцы, не продуктовые строки)
export function DesignShowcase() {
  return (
    <div className="mt-8 flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">Цвета</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SWATCHES.map((s) => (
            <div key={s} className="overflow-hidden rounded-xl border border-border">
              <div className="h-12" style={{ background: `var(--${s})` }} />
              <div className="bg-surface px-2 py-1.5 text-[11px] text-fg-muted">{s}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">Типографика</h2>
        <p className="font-display text-3xl font-semibold">Unbounded — заголовки</p>
        <p className="mt-2 text-[15px] text-fg-muted">Manrope — основной текст. Съешь же ещё этих мягких французских булок.</p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">Кнопки</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Хочу!</Button>
          <Button variant="accent">
            <Plane className="size-4" /> Accent
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Загрузка</Button>
          <Button disabled>Недоступно</Button>
          <Button variant="secondary" size="icon" aria-label="Избранное">
            <Heart className="size-4" />
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">Поля</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Email" placeholder="you@example.com" icon={<Mail className="size-[18px]" />} hint="Подсказка" />
          <Input label="С ошибкой" defaultValue="oops" error="Проверьте значение" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">Бейджи</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="primary">Work and Travel</Badge>
          <Badge tone="route">Открыт</Badge>
          <Badge tone="accent">Новый</Badge>
          <Badge tone="success">Принято</Badge>
          <Badge tone="warning">На проверке</Badge>
          <Badge tone="danger">Переделать</Badge>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">Карточка оффера (превью)</h2>
        <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
          <Card className="hover:shadow-[var(--shadow-lift)] transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone="primary">Work and Travel · A2</Badge>
                <h3 className="mt-2 font-display text-lg font-semibold">Landry&apos;s Rainforest Cafe</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-fg-muted">
                  <MapPin className="size-4" /> Galveston, TX
                </p>
              </div>
              <Badge tone="accent">2 / 3</Badge>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-route"
                initial={{ width: 0 }}
                whileInView={{ width: "66%" }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </Card>
        </motion.div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">Скелетон</h2>
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-2 w-full" />
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">Уведомления и праздник</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              toast("Новый оффер!", {
                description: "Work and Travel · Landry's Rainforest Cafe, Galveston TX",
                icon: <Bell className="size-4 text-accent" />,
              })
            }
          >
            <Bell className="size-4" /> Тост
          </Button>
          <Button variant="accent" onClick={celebrate}>
            <PartyPopper className="size-4" /> Конфетти
          </Button>
        </div>
      </section>
    </div>
  );
}
