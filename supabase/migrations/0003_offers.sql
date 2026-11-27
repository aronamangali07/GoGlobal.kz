-- Этап 4: офферы, избранное, заявки (структура), журнал действий.

create type public.offer_status as enum ('draft', 'open', 'closed', 'allocated', 'archived');
create type public.allocation_mode as enum ('lottery', 'manual');
create type public.application_status as enum
  ('pending', 'ineligible', 'selected', 'waitlisted', 'approved', 'rejected', 'withdrawn');

-- Страна в полях Au Pair / Internship — код из справочника, чтобы работали флаги и фильтры
update public.programs
set offer_schema = (
  select jsonb_agg(
    case when f->>'key' = 'country' then f || '{"type":"country"}'::jsonb else f end
    order by ord
  )
  from jsonb_array_elements(offer_schema) with ordinality as e(f, ord)
)
where slug in ('au-pair', 'internship');

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete restrict,
  code text,
  -- Заголовок/подзаголовок/локация вычисляются из fields при сохранении (см. features/offers/display.ts)
  title text not null,
  subtitle text not null default '',
  country text not null default '',          -- код страны: us, de, uk…
  city text not null default '',
  fields jsonb not null default '{}'::jsonb, -- значения по offer_schema программы
  seats_total int not null check (seats_total between 1 and 500),
  min_english public.english_level,
  min_age int check (min_age between 14 and 60),
  max_age int check (max_age between 14 and 60),
  interview_at timestamptz,
  interview_note text not null default '',
  window_opens_at timestamptz,
  window_closes_at timestamptz,
  allocation_mode public.allocation_mode not null default 'lottery',
  status public.offer_status not null default 'draft',
  is_test boolean not null default false,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_age is null or max_age is null or min_age <= max_age),
  check (window_closes_at is null or window_opens_at is null or window_closes_at > window_opens_at),
  check (status = 'draft' or (window_opens_at is not null and window_closes_at is not null))
);
create index offers_program_status_idx on public.offers (program_id, status);
create index offers_window_idx on public.offers (window_closes_at) where status = 'open';

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  offer_id uuid not null references public.offers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, offer_id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.application_status not null default 'pending',
  match_score numeric(5, 3),
  lottery_rank int,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id, user_id)
);
create index applications_user_idx on public.applications (user_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  program_id uuid references public.programs (id) on delete set null,
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ---------- updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger offers_touch before update on public.offers for each row execute function public.touch_updated_at();
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();

-- ---------- Журнал: пишет только сервер/триггеры; править и удалять нельзя никому ----------
create or replace function public.log_action(
  p_action text, p_entity_type text, p_entity_id uuid, p_program_id uuid, p_diff jsonb default '{}'::jsonb
) returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, program_id, diff)
  values ((select auth.uid()), p_action, p_entity_type, p_entity_id, p_program_id, coalesce(p_diff, '{}'::jsonb))
$$;

-- Автоматический журнал по офферам: создание, публикация, архив, правки
create or replace function public.audit_offers()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := case when new.status = 'open' then 'offer.published' else 'offer.created' end;
  elsif new.status is distinct from old.status then
    v_action := case new.status
      when 'open' then 'offer.published'
      when 'archived' then 'offer.archived'
      when 'draft' then 'offer.unpublished'
      else 'offer.status.' || new.status end;
  else
    v_action := 'offer.updated';
  end if;
  perform public.log_action(v_action, 'offer', new.id, new.program_id,
    jsonb_build_object('code', new.code, 'title', new.title, 'status', new.status));
  return new;
end;
$$;
create trigger offers_audit after insert or update on public.offers
  for each row execute function public.audit_offers();

-- ---------- Счётчики мест: студент не видит чужих заявок, только числа ----------
create or replace function public.offer_counts(p_offer_ids uuid[])
returns table (offer_id uuid, applicants int, taken int)
language sql stable security definer set search_path = ''
as $$
  select o.id,
         count(a.id) filter (where a.status not in ('withdrawn', 'ineligible'))::int,
         count(a.id) filter (where a.status in ('selected', 'approved'))::int
  from public.offers o
  left join public.applications a on a.offer_id = o.id
  where o.id = any (p_offer_ids)
    and (
      public.manages_program(o.program_id)
      or (o.status in ('open', 'closed', 'allocated') and exists (
        select 1 from public.enrollments e where e.program_id = o.program_id and e.user_id = (select auth.uid())))
    )
  group by o.id
$$;

-- ---------- RLS ----------
alter table public.offers enable row level security;
alter table public.favorites enable row level security;
alter table public.applications enable row level security;
alter table public.audit_log enable row level security;

create policy "offers: студент видит опубликованные по своим программам" on public.offers
  for select to authenticated
  using (
    public.manages_program(program_id)
    or (status in ('open', 'closed', 'allocated') and exists (
      select 1 from public.enrollments e where e.program_id = offers.program_id and e.user_id = (select auth.uid())))
  );
create policy "offers: менеджер создаёт в своих программах" on public.offers
  for insert to authenticated with check (public.manages_program(program_id));
create policy "offers: менеджер правит свои" on public.offers
  for update to authenticated using (public.manages_program(program_id)) with check (public.manages_program(program_id));
create policy "offers: окончательно удаляет только админ" on public.offers
  for delete to authenticated using (public.is_admin());

create policy "favorites: свои" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "favorites: добавить" on public.favorites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "favorites: убрать" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));

-- Подача заявки — через RPC на этапе 5; здесь только чтение
create policy "applications: свои и по своим программам" on public.applications
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.offers o where o.id = offer_id and public.manages_program(o.program_id))
  );

create policy "audit_log: админ всё, менеджер свои программы" on public.audit_log
  for select to authenticated
  using (public.is_admin() or (program_id is not null and public.manages_program(program_id)));

-- log_action вызывается только из триггеров и серверного кода, не напрямую клиентами
revoke execute on function public.log_action(text, text, uuid, uuid, jsonb) from public, anon, authenticated;
