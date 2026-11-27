-- Этап 8: настройки распределения по умолчанию
insert into public.app_settings (key, value)
values ('allocation', '{"country": 0.5, "work": 0.5, "noPlacePriority": true}')
on conflict (key) do nothing;

-- Журнал изменения настроек
create or replace function public.audit_settings()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.log_action('settings.updated', 'settings', null, null, jsonb_build_object('key', new.key, 'value', new.value));
  return new;
end;
$$;
drop trigger if exists app_settings_audit on public.app_settings;
create trigger app_settings_audit after insert or update on public.app_settings for each row execute function public.audit_settings();

-- Журнал смены ролей и назначения менеджеров
create or replace function public.audit_roles()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    perform public.log_action('user.role_changed', 'user', new.id, null, jsonb_build_object('email', new.email, 'from', old.role, 'to', new.role));
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_audit_roles on public.profiles;
create trigger profiles_audit_roles after update on public.profiles for each row execute function public.audit_roles();

create or replace function public.audit_program_managers()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.log_action(case when tg_op = 'INSERT' then 'manager.assigned' else 'manager.unassigned' end,
    'user', coalesce(new.user_id, old.user_id), coalesce(new.program_id, old.program_id), '{}'::jsonb);
  return coalesce(new, old);
end;
$$;
drop trigger if exists program_managers_audit on public.program_managers;
create trigger program_managers_audit after insert or delete on public.program_managers for each row execute function public.audit_program_managers();

create or replace function public.audit_programs()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.log_action(
    case when tg_op = 'INSERT' then 'program.created'
         when new.is_active is distinct from old.is_active then case when new.is_active then 'program.reopened' else 'program.closed' end
         else 'program.updated' end,
    'program', new.id, new.id, jsonb_build_object('name', new.name));
  return new;
end;
$$;
drop trigger if exists programs_audit on public.programs;
create trigger programs_audit after insert or update on public.programs for each row execute function public.audit_programs();
