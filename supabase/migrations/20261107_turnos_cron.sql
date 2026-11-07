-- =============================================================================
-- PORTALMAKER — Tarea programada de turnos cada 10 minutos (Supabase pg_cron)
-- Fecha: 2026-11-07
--
-- Por qué en Supabase y no en Vercel: los crons de Vercel del plan actual
-- corren una vez por día, y los recordatorios ("mañana a las 10") y el
-- vencimiento de señas sin pagar necesitan correr cada pocos minutos.
-- pg_cron llama a /api/cron/turnos con el mismo CRON_SECRET de Vercel.
--
-- ANTES DE EJECUTAR ESTE ARCHIVO (una sola vez), guardá el secreto en Vault.
-- Copiá el valor de CRON_SECRET desde Vercel y ejecutá, reemplazando el texto:
--
--   select vault.create_secret('PEGAR_ACA_EL_VALOR_DE_CRON_SECRET', 'portalmaker_cron_secret');
--
-- (Si alguna vez cambiás CRON_SECRET en Vercel, actualizalo con
--  vault.update_secret, o borrá y volvé a crear el secreto.)
--
-- Si "create extension" da error de permisos, activá pg_cron y pg_net desde
-- Supabase → Database → Extensions y volvé a ejecutar el resto.
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reprogramar sin duplicar: se borra la tarea anterior si existía.
select cron.unschedule(jobid)
from cron.job
where jobname = 'portalmaker-turnos';

select cron.schedule(
  'portalmaker-turnos',
  '*/10 * * * *',
  $job$
    select net.http_get(
      url := 'https://www.portalmaker.ar/api/cron/turnos',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'portalmaker_cron_secret')
      ),
      timeout_milliseconds := 30000
    );
  $job$
);
