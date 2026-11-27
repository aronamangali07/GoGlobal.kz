# GoGlobal.kz

Платформа агентства международных программ для студентов из Казахстана: Work and Travel, Au Pair, Internship/Trainee, Camp Counselor.
Вместо гонки в WhatsApp-чате — честное распределение офферов, личные кабинеты и уведомления на почту и в Telegram.

**Стек:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Motion (Framer Motion) · Supabase · Resend · grammY · Vercel

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # заполнить ключи (см. ниже)
npm run dev                  # http://localhost:3000
```

Без ключей Supabase экран входа открывается и анимируется, но войти нельзя: появится подсказка «База данных ещё не подключена».

| Страница | Что там |
|---|---|
| `/login`, `/register` | Вход и регистрация: глобус с маршрутами, magic link |
| `/design` | Витрина дизайн-системы: цвета, кнопки, поля, скелетоны, тост, конфетти |
| `/dashboard` | Временный кабинет (до этапа 3) |

## Подключение Supabase

1. Зарегистрируйтесь на https://supabase.com → **New project**. Регион: Frankfurt (eu-central-1) — ближе всего к Казахстану. Сохраните пароль базы.
2. **Project Settings → API Keys**: скопируйте в `.env.local`
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Secret key → `SUPABASE_SECRET_KEY` (только на сервере, никому не показывать)
3. **SQL Editor → New query**: по очереди выполните все файлы из `supabase/migrations/` (0001, 0002, …) → **Run**.
   Или задайте `SUPABASE_ACCESS_TOKEN` и `SUPABASE_PROJECT_REF` в `.env.local` и запустите `npm run db:run -- supabase/migrations/*.sql`.
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (после деплоя — адрес на Vercel)
   - Redirect URLs: добавьте `http://localhost:3000/auth/callback`
5. Для демо: **Authentication → Sign In / Providers → Email** — выключите *Confirm email*, чтобы входить сразу после регистрации.
   Встроенная почта Supabase шлёт ~2 письма в час; на этапе 7 подключим Resend как SMTP.

## Структура

```
src/
  app/(auth)        экраны входа и регистрации
  app/(app)         кабинет (переходы страниц — template.tsx)
  app/auth/callback обработка ссылок из писем
  components/ui     дизайн-система
  components/globe  глобус (canvas + d3-geo), точки суши — scripts/gen-globe-dots.mjs
  features/         модули по функциональности (auth, offers, allocation, …)
  lib/supabase      клиенты: браузер / сервер / admin / proxy
  i18n/, messages/  переводы (ru; kk и en — добавить файл в messages/)
supabase/migrations SQL-миграции
```

## Уведомления (этап 7)

Каждое событие — в колокольчик на сайте, на почту (Resend) и в Telegram (бот на webhook), по настройкам пользователя.
Очередь доставки `notification_deliveries` с уникальным `dedupe_key` — одно и то же не уйдёт дважды.

| Переменная | Где взять |
|---|---|
| `RESEND_API_KEY` | resend.com → API Keys |
| `EMAIL_OVERRIDE_TO` | Демо без своего домена: все письма уходят на почту владельца Resend (в письме указано, кому оно) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` | @BotFather → /newbot |
| `TELEGRAM_WEBHOOK_SECRET` | любая случайная строка; та же передаётся в `setWebhook` |
| `CRON_SECRET` | случайная строка; в Supabase Vault под именем `cron_secret` |

Webhook бота: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>`.
Крон: `supabase/migrations/0009_cron_schedule.sql` (pg_cron каждые 15 минут → `/api/cron/tick`): закрытие окон, черновики распределения, напоминания за 24 ч и 1 ч, сроки оплат, повтор неудачных доставок.

## Безопасность

- Все ключи только в `.env.local` (в git не попадает). Шаблон — `.env.example`.
- Доступ к данным — через Row Level Security в Postgres.

## Демо

**Сайт:** https://goglobal-kz.vercel.app

| Роль | Email | Пароль |
|---|---|---|
| Студент | student@demo.goglobal.kz | GoGlobal2026! |
| Менеджер (Work and Travel, Camp Counselor) | manager@demo.goglobal.kz | GoGlobal2026! |
| Админ | admin@demo.goglobal.kz | GoGlobal2026! |

Перед показом обновите тестовые данные — окна офферов выставятся относительно текущего времени:

```bash
npm run seed
```

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | локальный сервер |
| `npm run seed` | демо-аккаунты и 10 офферов (A2 — реальный пример, остальные помечены как тестовые) |
| `npm run db:run -- <file.sql>` | выполнить SQL-миграцию через Supabase Management API |
| `npm run db:types` | перегенерировать TypeScript-типы базы |
