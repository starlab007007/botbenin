-- Prevent schema metadata cache reload failures under transient database load.
-- Keep application query limits bounded, including the service role that used
-- to inherit the authenticator's 8s setting.
alter role authenticator set statement_timeout = '60s';
alter role authenticator set jit = off;
alter role service_role set statement_timeout = '8s';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
