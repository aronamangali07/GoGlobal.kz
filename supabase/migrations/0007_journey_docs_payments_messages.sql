-- Этап 6: «Мой путь», события/календарь, документы, оплаты, сообщения.

create type public.event_type as enum ('interview', 'embassy', 'deadline', 'flight', 'other');
create type public.doc_status as enum ('pending', 'accepted', 'rework');

-- ---------- История этапов ----------
create table public.stage_history (
  id bigint generated always as identity primary key,
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  from_stage public.journey_stage,
  to_stage public.journey_stage not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.stage_history enable row level security;
create policy "stage_history: своё и персонал" on public.stage_history for select to authenticated
  using (exists (select 1 from public.enrollments e where e.id = enrollment_id
                 and (e.user_id = (select auth.uid()) or public.manages_program(e.program_id))));

create or replace function public.track_stage()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.current_stage is distinct from old.current_stage then
    insert into public.stage_history (enrollment_id, from_stage, to_stage, changed_by)
    values (new.id, case when tg_op = 'UPDATE' then old.current_stage end, new.current_stage, (select auth.uid()));
    if tg_op = 'UPDATE' then
      perform public.log_action('stage.changed', 'enrollment', new.id, new.program_id,
        jsonb_build_object('user_id', new.user_id, 'from', old.current_stage, 'to', new.current_stage));
    end if;
  end if;
  return new;
end;
$$;
create trigger enrollments_track after insert or update on public.enrollments
  for each row execute function public.track_stage();

-- ---------- События (интервью, посольство, дедлайны, вылет) ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  type public.event_type not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  address text not null default '',
  notes text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_user_idx on public.events (user_id, starts_at);
create index events_starts_idx on public.events (starts_at);
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
alter table public.events enable row level security;
create policy "events: свои и персонал" on public.events for select to authenticated
  using (user_id = (select auth.uid()) or public.manages_program(program_id));
create policy "events: создаёт персонал" on public.events for insert to authenticated
  with check (public.manages_program(program_id) and public.manages_student(user_id));
create policy "events: правит персонал" on public.events for update to authenticated
  using (public.manages_program(program_id)) with check (public.manages_program(program_id));
create policy "events: удаляет персонал" on public.events for delete to authenticated
  using (public.manages_program(program_id));

-- Персональная ссылка-подписка на календарь (.ics)
alter table public.profiles add column if not exists calendar_token uuid not null default gen_random_uuid();

-- ---------- Документы ----------
create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null,
  description text not null default '',
  required boolean not null default true,
  sort int not null default 100,
  unique (program_id, name)
);
alter table public.document_types enable row level security;
create policy "document_types: читают все вошедшие" on public.document_types for select to authenticated using (true);
create policy "document_types: правит персонал программы" on public.document_types for all to authenticated
  using (public.manages_program(program_id)) with check (public.manages_program(program_id));

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_type_id uuid not null references public.document_types (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime text not null default '',
  size_bytes int not null default 0,
  status public.doc_status not null default 'pending',
  reviewer_comment text not null default '',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, document_type_id)
);
create index documents_status_idx on public.documents (program_id, status);
create trigger documents_touch before update on public.documents for each row execute function public.touch_updated_at();
alter table public.documents enable row level security;
create policy "documents: свои и персонал" on public.documents for select to authenticated
  using (user_id = (select auth.uid()) or public.manages_program(program_id));
create policy "documents: загрузить свой" on public.documents for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending'
              and exists (select 1 from public.enrollments e where e.user_id = (select auth.uid()) and e.program_id = documents.program_id));
create policy "documents: заменить свой / проверить персоналу" on public.documents for update to authenticated
  using (user_id = (select auth.uid()) or public.manages_program(program_id))
  with check (user_id = (select auth.uid()) or public.manages_program(program_id));

-- Студент при замене файла не может сам поставить «принято»; проверка — журнал
create or replace function public.protect_documents()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) = new.user_id and not public.manages_program(new.program_id) then
    if old.status = 'accepted' then raise exception 'document_locked'; end if;
    new.status := 'pending';
    new.reviewer_comment := old.reviewer_comment;
    new.reviewed_by := null;
    new.reviewed_at := null;
  elsif new.status is distinct from old.status then
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
    perform public.log_action('document.' || new.status, 'document', new.id, new.program_id,
      jsonb_build_object('user_id', new.user_id, 'comment', new.reviewer_comment));
  end if;
  return new;
end;
$$;
create trigger documents_protect before update on public.documents for each row execute function public.protect_documents();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "documents bucket: свои и персонал" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = (select auth.uid())::text
         or public.manages_student(((storage.foldername(name))[1])::uuid)));
create policy "documents bucket: загрузка в свою папку" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents bucket: удалить своё" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Чек-листы по программам
insert into public.document_types (program_id, name, description, required, sort)
select p.id, d.name, d.description, d.required, d.sort
from public.programs p
join (values
  ('work-and-travel', 'Загранпаспорт', 'Скан разворота с фото, срок действия — не меньше 6 месяцев после возвращения', true, 10),
  ('work-and-travel', 'Справка с места учёбы', 'Очная форма обучения, на английском или с переводом', true, 20),
  ('work-and-travel', 'Фото 5×5 см', 'Белый фон, без очков, сделано не раньше 6 месяцев назад', true, 30),
  ('work-and-travel', 'Job Offer', 'Подписанный оффер от работодателя', true, 40),
  ('work-and-travel', 'Анкета DS-160 (подтверждение)', 'Страница подтверждения с баркодом', true, 50),
  ('work-and-travel', 'Банковская выписка', 'Подтверждение средств, по желанию', false, 60),
  ('au-pair', 'Загранпаспорт', 'Скан разворота с фото', true, 10),
  ('au-pair', 'Диплом / аттестат', 'С переводом', true, 20),
  ('au-pair', 'Справка о несудимости', 'Апостиль', true, 30),
  ('au-pair', 'Медицинская справка', 'Об отсутствии противопоказаний', true, 40),
  ('au-pair', 'Письмо семье', 'Рассказ о себе на английском или немецком', true, 50),
  ('au-pair', 'Водительские права', 'Если есть', false, 60),
  ('internship', 'Загранпаспорт', 'Скан разворота с фото', true, 10),
  ('internship', 'Резюме (CV)', 'На английском', true, 20),
  ('internship', 'Справка с места учёбы', 'Или диплом выпускника', true, 30),
  ('internship', 'Мотивационное письмо', 'До одной страницы', true, 40),
  ('internship', 'Training Plan', 'Подписанный план стажировки', true, 50),
  ('camp-counselor', 'Загранпаспорт', 'Скан разворота с фото', true, 10),
  ('camp-counselor', 'Справка с места учёбы', 'Очная форма', true, 20),
  ('camp-counselor', 'Справка о несудимости', 'Для работы с детьми', true, 30),
  ('camp-counselor', 'Рекомендация', 'От преподавателя или с прошлой работы с детьми', true, 40)
) as d(slug, name, description, required, sort) on d.slug = p.slug
on conflict (program_id, name) do nothing;

-- ---------- Оплаты (в демо вносит менеджер) ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'KZT' check (currency in ('KZT', 'USD', 'EUR')),
  due_date date,
  paid_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id);
alter table public.payments enable row level security;
create policy "payments: свои и персонал" on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or public.manages_program(program_id));
create policy "payments: ведёт персонал" on public.payments for all to authenticated
  using (public.manages_program(program_id)) with check (public.manages_program(program_id) and public.manages_student(user_id));

create or replace function public.audit_payments()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.log_action(
    case when tg_op = 'INSERT' then 'payment.created'
         when new.paid_at is not null and old.paid_at is null then 'payment.paid'
         else 'payment.updated' end,
    'payment', new.id, new.program_id,
    jsonb_build_object('user_id', new.user_id, 'title', new.title, 'amount', new.amount, 'currency', new.currency));
  return new;
end;
$$;
create trigger payments_audit after insert or update on public.payments for each row execute function public.audit_payments();

-- ---------- Сообщения: тред = студент × программа ----------
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (student_id, program_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages (thread_id, created_at);

alter table public.threads enable row level security;
alter table public.messages enable row level security;
create policy "threads: участник" on public.threads for select to authenticated
  using (student_id = (select auth.uid()) or public.manages_program(program_id));
create policy "threads: открыть" on public.threads for insert to authenticated
  with check ((student_id = (select auth.uid()) and exists (select 1 from public.enrollments e where e.user_id = student_id and e.program_id = threads.program_id))
              or public.manages_program(program_id));

create or replace function public.thread_member(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.threads t where t.id = p_thread_id
                 and (t.student_id = (select auth.uid()) or public.manages_program(t.program_id)))
$$;

create policy "messages: участник читает" on public.messages for select to authenticated using (public.thread_member(thread_id));
create policy "messages: участник пишет" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.thread_member(thread_id));

-- Отметить прочитанным может только получатель
create or replace function public.mark_thread_read(p_thread_id uuid)
returns void language sql security definer set search_path = ''
as $$
  update public.messages set read_at = now()
  where thread_id = p_thread_id and read_at is null and sender_id <> (select auth.uid())
    and public.thread_member(p_thread_id)
$$;

create or replace function public.bump_thread()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.threads set last_message_at = new.created_at where id = new.thread_id;
  return new;
end;
$$;
create trigger messages_bump after insert on public.messages for each row execute function public.bump_thread();

-- Realtime для чата
alter publication supabase_realtime add table public.messages;

revoke execute on function public.mark_thread_read(uuid) from public, anon;
grant execute on function public.mark_thread_read(uuid) to authenticated;
