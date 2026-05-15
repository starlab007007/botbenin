
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN
  ('waouh-radar-process-tick','waouh-outbound-dispatch-tick','waouh-serpapi-tick','waouh-apify-tick');

SELECT cron.schedule('waouh-radar-process-tick','*/5 * * * *', $$
  SELECT net.http_post(
    url:='https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-radar-process',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8"}'::jsonb,
    body:='{}'::jsonb);
$$);

SELECT cron.schedule('waouh-outbound-dispatch-tick','*/5 * * * *', $$
  SELECT net.http_post(
    url:='https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-outbound-dispatch',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8"}'::jsonb,
    body:='{}'::jsonb);
$$);

SELECT cron.schedule('waouh-serpapi-tick','*/30 * * * *', $$
  SELECT net.http_post(
    url:='https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-serpapi-scout',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8"}'::jsonb,
    body:='{}'::jsonb);
$$);

SELECT cron.schedule('waouh-apify-tick','*/30 * * * *', $$
  SELECT net.http_post(
    url:='https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-radar-apify',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8"}'::jsonb,
    body:='{}'::jsonb);
$$);
