-- Этап 3: программы, менеджеры программ, участие студентов в программах, аватары.

create type public.journey_stage as enum
  ('application', 'interview', 'offer', 'documents', 'embassy', 'visa', 'departure');

-- ---------- Программы ----------
-- offer_schema — список полей оффера этой программы:
-- [{ "key": "employer", "label": "Работодатель", "type": "text|textarea|number|money|date|select|boolean",
--    "unit": "$/час", "options": ["..."], "required": true, "group": "main" }]
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  tagline text not null default '',
  description text not null default '',
  color text not null default '#3552f2',
  icon text not null default 'globe',
  offer_schema jsonb not null default '[]'::jsonb,
  translations jsonb not null default '{}'::jsonb, -- { "kk": { "name": ..., "tagline": ... }, "en": {...} }
  is_active boolean not null default true,
  sort int not null default 100,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.program_managers (
  program_id uuid not null references public.programs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (program_id, user_id)
);

-- Участие студента в программе = его «Мой путь» по ней
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  current_stage public.journey_stage not null default 'application',
  stage_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, program_id)
);
create index enrollments_program_idx on public.enrollments (program_id);

-- ---------- Хелперы ----------
create or replace function public.manages_program(p_program_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.program_managers
    where program_id = p_program_id and user_id = (select auth.uid())
  )
$$;

create or replace function public.manages_student(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.enrollments e
    join public.program_managers pm on pm.program_id = e.program_id
    where e.user_id = p_user_id and pm.user_id = (select auth.uid())
  )
$$;

-- Студент не может сам передвинуть себе этап
create or replace function public.protect_enrollment_stage()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null and not public.manages_program(new.program_id) then
      new.current_stage := 'application';
    end if;
  elsif new.current_stage is distinct from old.current_stage then
    new.stage_updated_at := now();
  end if;
  return new;
end;
$$;

create trigger enrollments_protect
  before insert or update on public.enrollments
  for each row execute function public.protect_enrollment_stage();

-- ---------- RLS ----------
alter table public.programs enable row level security;
alter table public.program_managers enable row level security;
alter table public.enrollments enable row level security;

create policy "programs: активные видят все" on public.programs
  for select to authenticated using (is_active or public.is_staff());
create policy "programs: админ создаёт" on public.programs
  for insert to authenticated with check (public.is_admin());
create policy "programs: менеджер правит свои, админ все" on public.programs
  for update to authenticated using (public.manages_program(id)) with check (public.manages_program(id));
create policy "programs: удаляет только админ" on public.programs
  for delete to authenticated using (public.is_admin());

create policy "program_managers: видят свои назначения" on public.program_managers
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "program_managers: назначает админ" on public.program_managers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "enrollments: свои" on public.enrollments
  for select to authenticated using (user_id = (select auth.uid()) or public.manages_program(program_id));
create policy "enrollments: записаться самому" on public.enrollments
  for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and exists (select 1 from public.programs p where p.id = program_id and p.is_active))
    or public.manages_program(program_id)
  );
create policy "enrollments: этап меняет менеджер" on public.enrollments
  for update to authenticated using (public.manages_program(program_id)) with check (public.manages_program(program_id));
create policy "enrollments: выйти можно до интервью" on public.enrollments
  for delete to authenticated
  using ((user_id = (select auth.uid()) and current_stage = 'application') or public.is_admin());

-- Менеджер видит профили студентов своих программ
create policy "profiles: менеджер видит своих студентов" on public.profiles
  for select to authenticated using (public.manages_student(id));

-- ---------- Хранилище: аватары (приватно, путь {user_id}/файл) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "avatars: читать своё и персоналу" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));
create policy "avatars: загружать в свою папку" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: менять своё" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: удалять своё" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- Четыре базовые программы ----------
insert into public.programs (slug, name, tagline, description, color, icon, sort, offer_schema) values
('work-and-travel', 'Work and Travel', 'Лето в США: работа + путешествия',
 'Летняя программа для студентов очной формы: официальная работа в США на 3–4 месяца и время на путешествия.',
 '#ff7a2f', 'sun', 10,
 '[
   {"key":"code","label":"Код оффера","type":"text","required":true,"group":"main"},
   {"key":"employer","label":"Работодатель","type":"text","required":true,"group":"main"},
   {"key":"city","label":"Город","type":"text","required":true,"group":"main"},
   {"key":"state","label":"Штат","type":"text","required":true,"group":"main"},
   {"key":"position","label":"Должность","type":"text","required":true,"group":"main"},
   {"key":"start_dates","label":"Даты старта","type":"text","group":"dates"},
   {"key":"hourly_rate","label":"Ставка","type":"money","unit":"$/час","required":true,"group":"money"},
   {"key":"tips","label":"Чаевые","type":"boolean","group":"money"},
   {"key":"rate_note","label":"Комментарий к оплате","type":"text","group":"money"},
   {"key":"hours_min","label":"Часов в неделю (от)","type":"number","unit":"ч","group":"money"},
   {"key":"hours_max","label":"Часов в неделю (до)","type":"number","unit":"ч","group":"money"},
   {"key":"housing_cost","label":"Жильё","type":"money","unit":"$/мес","group":"money"},
   {"key":"housing_note","label":"Про жильё","type":"textarea","group":"extra"}
 ]'::jsonb),
('au-pair', 'Au Pair', 'Живи в семье и заботься о детях',
 'Проживание в принимающей семье, помощь с детьми, карманные деньги и языковые курсы.',
 '#e64980', 'baby', 20,
 '[
   {"key":"country","label":"Страна","type":"text","required":true,"group":"main"},
   {"key":"city","label":"Город","type":"text","required":true,"group":"main"},
   {"key":"family","label":"Семья","type":"text","group":"main"},
   {"key":"kids_count","label":"Количество детей","type":"number","group":"main"},
   {"key":"kids_ages","label":"Возраст детей","type":"text","group":"main"},
   {"key":"pocket_money","label":"Карманные деньги","type":"money","unit":"€/мес","group":"money"},
   {"key":"duration","label":"Срок","type":"text","unit":"мес","group":"dates"},
   {"key":"driving_license","label":"Нужны права","type":"boolean","group":"requirements"},
   {"key":"childcare_experience","label":"Опыт с детьми","type":"text","group":"requirements"}
 ]'::jsonb),
('internship', 'Internship / Trainee', 'Стажировка по специальности',
 'Профессиональная практика в международной компании по вашей специальности.',
 '#3552f2', 'briefcase', 30,
 '[
   {"key":"company","label":"Компания","type":"text","required":true,"group":"main"},
   {"key":"country","label":"Страна","type":"text","required":true,"group":"main"},
   {"key":"city","label":"Город","type":"text","group":"main"},
   {"key":"field","label":"Сфера","type":"select","options":["IT","Финансы","Маркетинг","Гостиничный бизнес","Инженерия","Туризм","Другое"],"group":"main"},
   {"key":"specialty","label":"Специальность","type":"text","group":"main"},
   {"key":"paid","label":"Оплачиваемая","type":"boolean","group":"money"},
   {"key":"stipend","label":"Стипендия","type":"money","unit":"$/мес","group":"money"},
   {"key":"duration","label":"Длительность","type":"text","group":"dates"}
 ]'::jsonb),
('camp-counselor', 'Camp Counselor', 'Вожатый в летнем лагере',
 'Работа в летнем лагере в США: вожатый, спортивный инструктор или персонал кухни.',
 '#12a150', 'tent', 40,
 '[
   {"key":"camp","label":"Лагерь","type":"text","required":true,"group":"main"},
   {"key":"state","label":"Штат","type":"text","required":true,"group":"main"},
   {"key":"role","label":"Роль","type":"select","options":["Вожатый","Спорт","Кухня","Творчество","Водные виды спорта"],"required":true,"group":"main"},
   {"key":"dates","label":"Даты","type":"text","group":"dates"},
   {"key":"salary","label":"Оплата за сезон","type":"money","unit":"$","group":"money"}
 ]'::jsonb);
