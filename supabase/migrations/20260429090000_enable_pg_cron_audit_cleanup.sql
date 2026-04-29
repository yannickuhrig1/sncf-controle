-- Active pg_cron et programme le nettoyage quotidien de l'audit log
-- à 3h du matin (UTC). La fonction supprime les entrées > 30 jours.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Idempotent : retire l'éventuel job existant avant de le recréer.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'cleanup-audit-log-daily';

SELECT cron.schedule(
  'cleanup-audit-log-daily',
  '0 3 * * *',
  $$ SELECT public.cleanup_audit_log(); $$
);
