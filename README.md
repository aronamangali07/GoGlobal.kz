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
3. **SQL Editor → New query**: вставьте содержимое `supabase/migrations/0001_profiles.sql` → **Run**.
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

## Безопасность

- Все ключи только в `.env.local` (в git не попадает). Шаблон — `.env.example`.
- Доступ к данным — через Row Level Security в Postgres.

## Тестовые аккаунты

Появятся на этапе 9 (seed).
