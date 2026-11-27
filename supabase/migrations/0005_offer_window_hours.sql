-- Длительность окна подачи (в часах): нужна черновикам, у которых окно ещё не началось
alter table public.offers add column if not exists window_hours int not null default 24 check (window_hours between 1 and 720);

-- Настройки приложения (окно по умолчанию и т.п.) — админка на этапе 8
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "app_settings: читают все вошедшие" on public.app_settings;
create policy "app_settings: читают все вошедшие" on public.app_settings for select to authenticated using (true);
drop policy if exists "app_settings: меняет админ" on public.app_settings;
create policy "app_settings: меняет админ" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.app_settings (key, value) values ('default_window_hours', '24') on conflict do nothing;
