-- Этап 7: уведомления (in-app + email + Telegram), очередь доставки, объявления, Telegram-привязка, крон.

-- ---------- In-app уведомления (колокольчик) ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text not null default '/dashboard',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "notifications: свои" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: прочитать свои" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter publication supabase_realtime add table public.notifications;

-- Пометить прочитанными можно только read_at
create or replace function public.protect_notifications()
returns trigger language plpgsql as $$
begin
  if (select auth.uid()) is not null then
    new.user_id := old.user_id; new.type := old.type; new.title := old.title; new.body := old.body;
    new.link := old.link; new.data := old.data; new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
create trigger notifications_protect before update on public.notifications for each row execute function public.protect_notifications();

-- ---------- Очередь/журнал доставки: не отправляем дважды (dedupe_key) ----------
create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('email', 'telegram')),
  dedupe_key text not null unique,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  error text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index deliveries_status_idx on public.notification_deliveries (status, created_at);
alter table public.notification_deliveries enable row level security;
create policy "deliveries: админ" on public.notification_deliveries for select to authenticated using (public.is_admin());

-- Ключи напоминаний, отправленных без in-app записи (на случай повторов крона)
-- Настройки уведомлений: {"offers":{"email":true,"telegram":true}, ...}; по умолчанию всё включено
alter table public.profiles add column if not exists notification_prefs jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists telegram_username text;

-- ---------- Привязка Telegram: одноразовые токены (храним только хэш) ----------
create table public.telegram_link_tokens (
  token_hash text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.telegram_link_tokens enable row level security; -- доступ только сервером

-- ---------- Объявления агентства ----------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs (id) on delete cascade, -- null = всем
  title text not null check (char_length(title) between 2 and 200),
  body text not null check (char_length(body) between 2 and 4000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "announcements: читают участники" on public.announcements for select to authenticated
  using (program_id is null or public.manages_program(program_id)
         or exists (select 1 from public.enrollments e where e.program_id = announcements.program_id and e.user_id = (select auth.uid())));
create policy "announcements: публикует персонал" on public.announcements for insert to authenticated
  with check (created_by = (select auth.uid()) and (
    (program_id is null and public.is_admin()) or (program_id is not null and public.manages_program(program_id))));

create or replace function public.audit_announcements()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.log_action('announcement.created', 'announcement', new.id, new.program_id, jsonb_build_object('title', new.title));
  return new;
end;
$$;
create trigger announcements_audit after insert on public.announcements for each row execute function public.audit_announcements();

-- ---------- Крон каждые 15 минут: pg_cron + pg_net вызывают /api/cron/tick ----------
create extension if not exists pg_cron;
create extension if not exists pg_net;
