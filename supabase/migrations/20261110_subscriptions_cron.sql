-- =============================================================================
-- PORTALMAKER — Tarea diaria de cobro de planes (Supabase pg_cron)
-- Fecha: 2026-11-10
--
-- Por qué en Supabase y no en vercel.json: el plan actual de Vercel permite 2
-- crons y ya están usados (mp-reconcile y shipments). Se reutiliza el mismo
-- mecanismo de turnos (20261107_turnos_cron.sql) y el mismo secreto de Vault
-- 'portalmaker_cron_secret', que ya debe existir. Si no existe, crealo primero:
--
--   select vault.create_secret('PEGAR_ACA_EL_VALOR_DE_CRON_SECRET', 'portalmaker_cron_secret');
--
-- Corre todos los días a las 12:00 UTC (09:00 en Argentina).
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reprogramar sin duplicar: se borra la tarea anterior si existía.
select cron.unschedule(jobid)
from cron.job
where jobname = 'portalmaker-suscripciones';

select cron.schedule(
  'portalmaker-suscripciones',
  '0 12 * * *',
  $job$
    select net.http_get(
      url := 'https://www.portalmaker.ar/api/cron/subscriptions',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'portalmaker_cron_secret')
      ),
      timeout_milliseconds := 55000
    );
  $job$
);
