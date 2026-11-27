-- Этап 2: профили и роли. Остальные таблицы — в следующих миграциях.

create type public.user_role as enum ('student', 'manager', 'admin');
create type public.english_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'student',
  email text not null,
  full_name text,
  birth_date date,
  university text,
  english_level public.english_level,
  avatar_path text,
  preferences jsonb not null default '{}'::jsonb,
  locale text not null default 'ru',
  telegram_chat_id bigint unique,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Хелперы для RLS (security definer: не рекурсируют через политики) ----------
create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select role = 'admin' from public.profiles where id = (select auth.uid())), false) $$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select role in ('manager', 'admin') from public.profiles where id = (select auth.uid())), false) $$;

-- ---------- Автосоздание профиля при регистрации ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Защита: роль, email и telegram меняет только админ / сервер ----------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- auth.uid() пуст для service role (крон, бот, seed) — им можно всё
  if (select auth.uid()) is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.email is distinct from old.email
       or new.telegram_chat_id is distinct from old.telegram_chat_id then
      raise exception 'Недостаточно прав для изменения этих полей' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------- RLS ----------
alter table public.profiles enable row level security;

create policy "profiles: свой профиль" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "profiles: админ видит всех" on public.profiles
  for select to authenticated using (public.is_admin());
-- Политика «менеджер видит студентов своих программ» появится вместе с таблицей программ (этап 3–4).

create policy "profiles: правка своего" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- Вставка только триггером, удаление — каскадом из auth.users (админ, этап 8).
