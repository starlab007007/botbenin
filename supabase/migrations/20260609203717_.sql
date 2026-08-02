UPDATE public.waouh_outbound_queue SET status='pending', attempts=0, last_error=NULL, sent_at=NULL WHERE status='failed' AND last_error LIKE 'lid unresolved%';;
