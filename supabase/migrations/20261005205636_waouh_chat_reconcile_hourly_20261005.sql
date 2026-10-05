-- Reduce report-only chat reconciliation load.
select cron.alter_job(
  (select jobid from cron.job where jobname='waouh-chat-reconcile-tick' limit 1),
  schedule := '7 * * * *'
);
