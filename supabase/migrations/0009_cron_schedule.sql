-- Крон каждые 15 минут: pg_cron вызывает /api/cron/tick через pg_net.
-- Секрет берётся из Supabase Vault (создаётся отдельно, в репозиторий не попадает):
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
select cron.unschedule(jobid) from cron.job where jobname = 'goglobal-tick';
select cron.schedule(
  'goglobal-tick',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://goglobal-kz.vercel.app/api/cron/tick',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    timeout_milliseconds := 55000
  );
  $$
);
