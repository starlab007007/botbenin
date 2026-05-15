-- Make conversation phone_number unique so onConflict upsert works
DELETE FROM waouh_conversations a USING waouh_conversations b WHERE a.id < b.id AND a.phone_number = b.phone_number;
ALTER TABLE public.waouh_conversations ADD CONSTRAINT waouh_conversations_phone_unique UNIQUE (phone_number);