-- Этап 5: заявки и честное распределение.

-- ---------- Заявка знает свою программу: нужно для правила «одна активная заявка на программу» ----------
alter table public.applications add column if not exists program_id uuid references public.programs (id) on delete cascade;
update public.applications a set program_id = o.program_id from public.offers o where o.id = a.offer_id and a.program_id is null;
alter table public.applications alter column program_id set not null;

-- Активная заявка (ждёт распределения или уже получила место) — максимум одна на программу.
-- Проигравший (лист ожидания / отказ / отозвал) может подать на другой оффер.
create unique index if not exists applications_one_active_per_program
  on public.applications (user_id, program_id)
  where status in ('pending', 'selected', 'approved');

alter table public.applications add column if not exists ticket text;        -- хэш жребия (публичный)
alter table public.applications add column if not exists decision_note text; -- комментарий менеджера

-- ---------- Запуски распределения ----------
create table if not exists public.allocation_runs (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  seed text not null,
  params jsonb not null default '{}'::jsonb,
  result jsonb not null,           -- [{application_id, user_id, rank, eligible, match, has_place, ticket, outcome}]
  run_by uuid references public.profiles (id) on delete set null, -- null = система (крон)
  confirmed_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists allocation_runs_offer_idx on public.allocation_runs (offer_id, created_at desc);
alter table public.allocation_runs enable row level security;

drop policy if exists "allocation_runs: персонал программы" on public.allocation_runs;
create policy "allocation_runs: персонал программы" on public.allocation_runs
  for select to authenticated
  using (exists (select 1 from public.offers o where o.id = offer_id and public.manages_program(o.program_id)));
drop policy if exists "allocation_runs: создаёт персонал" on public.allocation_runs;
create policy "allocation_runs: создаёт персонал" on public.allocation_runs
  for insert to authenticated
  with check (confirmed_at is null and exists (select 1 from public.offers o where o.id = offer_id and public.manages_program(o.program_id)));

-- Зерно и билеты подтверждённого распределения — публичны для участников оффера (проверяемость)
create or replace function public.allocation_public(p_offer_id uuid)
returns table (seed text, confirmed_at timestamptz, ranks jsonb)
language sql stable security definer set search_path = ''
as $$
  select r.seed, r.confirmed_at,
         (select jsonb_agg(jsonb_build_object('rank', x->'rank', 'ticket', x->'ticket', 'outcome', x->'outcome',
                                              'me', (x->>'user_id')::uuid = (select auth.uid()))
                           order by (x->>'rank')::int)
            from jsonb_array_elements(r.result) x)
  from public.allocation_runs r
  where r.offer_id = p_offer_id and r.confirmed_at is not null
    and (exists (select 1 from public.applications a where a.offer_id = p_offer_id and a.user_id = (select auth.uid()))
         or exists (select 1 from public.offers o where o.id = p_offer_id and public.manages_program(o.program_id)))
  order by r.confirmed_at desc
  limit 1
$$;

-- ---------- Подача заявки ----------
create or replace function public.apply_to_offer(p_offer_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  o public.offers%rowtype;
  p public.profiles%rowtype;
  v_age int;
  v_levels text[] := array['A1','A2','B1','B2','C1','C2'];
  v_existing public.applications%rowtype;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into o from public.offers where id = p_offer_id;
  if not found then raise exception 'offer_not_found'; end if;
  select * into p from public.profiles where id = v_uid;
  if p.role <> 'student' then raise exception 'only_students'; end if;
  if not exists (select 1 from public.enrollments where user_id = v_uid and program_id = o.program_id) then
    raise exception 'not_enrolled';
  end if;
  if o.status <> 'open' or now() < o.window_opens_at or now() >= o.window_closes_at then
    raise exception 'window_closed';
  end if;
  if o.min_english is not null and (p.english_level is null
      or array_position(v_levels, p.english_level::text) < array_position(v_levels, o.min_english::text)) then
    raise exception 'english_too_low';
  end if;
  v_age := extract(year from age(p.birth_date));
  if (o.min_age is not null and (v_age is null or v_age < o.min_age)) or (o.max_age is not null and (v_age is null or v_age > o.max_age)) then
    raise exception 'age_mismatch';
  end if;
  if exists (select 1 from public.applications where user_id = v_uid and program_id = o.program_id
             and status in ('pending','selected','approved') and offer_id <> p_offer_id) then
    raise exception 'active_application_exists';
  end if;

  select * into v_existing from public.applications where offer_id = p_offer_id and user_id = v_uid;
  if found then
    if v_existing.status in ('pending','selected','approved') then return v_existing.id; end if;
    update public.applications set status = 'pending', decided_by = null, decided_at = null, lottery_rank = null, ticket = null
      where id = v_existing.id returning id into v_id;
  else
    insert into public.applications (offer_id, user_id, program_id) values (p_offer_id, v_uid, o.program_id) returning id into v_id;
  end if;
  perform public.log_action('application.created', 'application', v_id, o.program_id, jsonb_build_object('offer', o.code, 'offer_id', o.id));
  return v_id;
end;
$$;

create or replace function public.withdraw_application(p_application_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.applications%rowtype;
  o public.offers%rowtype;
begin
  select * into a from public.applications where id = p_application_id and user_id = (select auth.uid());
  if not found then raise exception 'not_found'; end if;
  select * into o from public.offers where id = a.offer_id;
  if a.status <> 'pending' or o.status <> 'open' or now() >= o.window_closes_at then raise exception 'window_closed'; end if;
  update public.applications set status = 'withdrawn' where id = a.id;
  perform public.log_action('application.withdrawn', 'application', a.id, a.program_id, jsonb_build_object('offer', o.code));
end;
$$;

-- ---------- Закрытие окна ----------
-- Досрочно (менеджер) или по времени (крон, auth.uid() пуст)
create or replace function public.close_offer_window(p_offer_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare o public.offers%rowtype;
begin
  select * into o from public.offers where id = p_offer_id;
  if not found then raise exception 'offer_not_found'; end if;
  if (select auth.uid()) is not null and not public.manages_program(o.program_id) then raise exception 'forbidden'; end if;
  if o.status <> 'open' then return; end if;
  update public.offers set status = 'closed', window_closes_at = least(window_closes_at, now()) where id = p_offer_id;
end;
$$;

create or replace function public.close_expired_offers()
returns setof uuid
language sql security definer set search_path = ''
as $$
  update public.offers set status = 'closed'
  where status = 'open' and window_closes_at <= now()
  returning id
$$;

-- ---------- Данные для распределения (без раскрытия лишнего) ----------
create or replace function public.allocation_inputs(p_offer_id uuid)
returns table (
  application_id uuid, user_id uuid, full_name text, avatar_path text, english_level text, birth_date date,
  preferences jsonb, enrolled boolean, has_place_elsewhere boolean, status text, created_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare o public.offers%rowtype;
begin
  select * into o from public.offers where id = p_offer_id;
  if not found then raise exception 'offer_not_found'; end if;
  if (select auth.uid()) is not null and not public.manages_program(o.program_id) then raise exception 'forbidden'; end if;
  return query
    select a.id, a.user_id, p.full_name, p.avatar_path, p.english_level::text, p.birth_date, p.preferences,
           exists (select 1 from public.enrollments e where e.user_id = a.user_id and e.program_id = o.program_id),
           exists (select 1 from public.applications x where x.user_id = a.user_id and x.offer_id <> a.offer_id
                   and x.status in ('selected', 'approved')),
           a.status::text, a.created_at
    from public.applications a
    join public.profiles p on p.id = a.user_id
    where a.offer_id = p_offer_id and a.status not in ('withdrawn')
    order by a.created_at;
end;
$$;

-- ---------- Подтверждение распределения (атомарно) ----------
create or replace function public.confirm_allocation(p_run_id uuid, p_selected uuid[], p_note text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r public.allocation_runs%rowtype;
  o public.offers%rowtype;
  v_uid uuid := (select auth.uid());
  v_auto uuid[];
begin
  select * into r from public.allocation_runs where id = p_run_id for update;
  if not found then raise exception 'run_not_found'; end if;
  select * into o from public.offers where id = r.offer_id for update;
  if not public.manages_program(o.program_id) then raise exception 'forbidden'; end if;
  if o.status <> 'closed' then raise exception 'offer_not_closed'; end if;
  if r.confirmed_at is not null then raise exception 'already_confirmed'; end if;
  if coalesce(array_length(p_selected, 1), 0) > o.seats_total then raise exception 'too_many_selected'; end if;
  if exists (select 1 from unnest(p_selected) s where not exists (
      select 1 from public.applications a where a.id = s and a.offer_id = o.id and a.status = 'pending')) then
    raise exception 'invalid_selection';
  end if;

  -- Ранги и билеты из запуска — в заявки
  update public.applications a
     set lottery_rank = (x->>'rank')::int, ticket = x->>'ticket', match_score = (x->>'match')::numeric
    from jsonb_array_elements(r.result) x
   where a.id = (x->>'application_id')::uuid and a.offer_id = o.id;

  update public.applications
     set status = case
           when id = any (p_selected) then 'selected'::public.application_status
           when exists (select 1 from jsonb_array_elements(r.result) x where (x->>'application_id')::uuid = id and (x->>'eligible')::boolean = false)
             then 'ineligible'::public.application_status
           else 'waitlisted'::public.application_status end,
         decided_by = v_uid, decided_at = now()
   where offer_id = o.id and status = 'pending';

  -- Победители переходят на этап «интервью»
  update public.enrollments e set current_stage = 'interview'
    from public.applications a
   where a.id = any (p_selected) and e.user_id = a.user_id and e.program_id = a.program_id and e.current_stage = 'application';

  update public.offers set status = 'allocated' where id = o.id;
  update public.allocation_runs set confirmed_by = v_uid, confirmed_at = now() where id = r.id;

  select array_agg((x->>'application_id')::uuid) into v_auto
    from jsonb_array_elements(r.result) x where x->>'outcome' = 'selected';
  perform public.log_action('allocation.confirmed', 'offer', o.id, o.program_id, jsonb_build_object(
    'run_id', r.id, 'seed', r.seed, 'selected', to_jsonb(p_selected),
    'manual_changes', not (coalesce(v_auto, '{}') @> coalesce(p_selected, '{}') and coalesce(p_selected, '{}') @> coalesce(v_auto, '{}')),
    'note', p_note));
end;
$$;

-- После подтверждения: одобрить / отклонить / дать место из листа ожидания
create or replace function public.decide_application(p_application_id uuid, p_decision text, p_note text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.applications%rowtype;
  o public.offers%rowtype;
  v_taken int;
begin
  select * into a from public.applications where id = p_application_id for update;
  if not found then raise exception 'not_found'; end if;
  select * into o from public.offers where id = a.offer_id for update;
  if not public.manages_program(o.program_id) then raise exception 'forbidden'; end if;
  if o.status not in ('closed', 'allocated') then raise exception 'offer_not_closed'; end if;

  if p_decision = 'approve' then
    if a.status <> 'selected' then raise exception 'invalid_state'; end if;
    update public.applications set status = 'approved', decided_by = auth.uid(), decided_at = now(), decision_note = p_note where id = a.id;
  elsif p_decision = 'reject' then
    if a.status not in ('selected', 'approved', 'pending') then raise exception 'invalid_state'; end if;
    update public.applications set status = 'rejected', decided_by = auth.uid(), decided_at = now(), decision_note = p_note where id = a.id;
  elsif p_decision = 'promote' then
    if a.status not in ('waitlisted', 'rejected', 'pending') then raise exception 'invalid_state'; end if;
    select count(*) into v_taken from public.applications where offer_id = o.id and status in ('selected', 'approved');
    if v_taken >= o.seats_total then raise exception 'no_seats'; end if;
    if exists (select 1 from public.applications where user_id = a.user_id and program_id = a.program_id
               and status in ('pending','selected','approved') and id <> a.id) then
      raise exception 'active_application_exists';
    end if;
    update public.applications set status = 'selected', decided_by = auth.uid(), decided_at = now(), decision_note = p_note where id = a.id;
    update public.enrollments set current_stage = 'interview'
      where user_id = a.user_id and program_id = a.program_id and current_stage = 'application';
  else
    raise exception 'invalid_decision';
  end if;
  perform public.log_action('application.' || p_decision, 'application', a.id, a.program_id,
    jsonb_build_object('offer', o.code, 'offer_id', o.id, 'user_id', a.user_id, 'note', p_note));
end;
$$;

-- ---------- Права на вызов ----------
revoke execute on function public.apply_to_offer(uuid) from public, anon;
revoke execute on function public.withdraw_application(uuid) from public, anon;
revoke execute on function public.close_offer_window(uuid) from public, anon;
revoke execute on function public.close_expired_offers() from public, anon, authenticated;
revoke execute on function public.allocation_inputs(uuid) from public, anon;
revoke execute on function public.confirm_allocation(uuid, uuid[], text) from public, anon;
revoke execute on function public.decide_application(uuid, text, text) from public, anon;
revoke execute on function public.allocation_public(uuid) from public, anon;
grant execute on function public.apply_to_offer(uuid) to authenticated;
grant execute on function public.withdraw_application(uuid) to authenticated;
grant execute on function public.close_offer_window(uuid) to authenticated, service_role;
grant execute on function public.close_expired_offers() to service_role;
grant execute on function public.allocation_inputs(uuid) to authenticated, service_role;
grant execute on function public.confirm_allocation(uuid, uuid[], text) to authenticated;
grant execute on function public.decide_application(uuid, text, text) to authenticated;
grant execute on function public.allocation_public(uuid) to authenticated;
