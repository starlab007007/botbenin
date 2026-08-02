DELETE FROM net._http_response WHERE created < now() - interval '2 days';
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days';
TRUNCATE public.waouh_trace_events;
DELETE FROM public.access_logs WHERE timestamp < now() - interval '7 days';
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.waouh_trace_events; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.access_logs; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.waouh_outbound_queue; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('purge-logs-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('purge-logs-daily','0 3 * * *',$CRON$DELETE FROM net._http_response WHERE created < now() - interval '2 days'; DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days'; DELETE FROM public.access_logs WHERE timestamp < now() - interval '7 days'; DELETE FROM public.waouh_trace_events WHERE created_at < now() - interval '1 day';$CRON$);;
