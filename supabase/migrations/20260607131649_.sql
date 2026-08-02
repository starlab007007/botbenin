DELETE FROM waouh_outbound_queue WHERE payload->>'deal_id' = 'aaaaaaaa-0000-0000-0000-e2e0000001a1';
DELETE FROM waouh_messages WHERE meta->>'deal_id' = 'aaaaaaaa-0000-0000-0000-e2e0000001a1';
DELETE FROM waouh_notifications WHERE payload->>'deal_id' = 'aaaaaaaa-0000-0000-0000-e2e0000001a1';
DELETE FROM waouh_deals WHERE id = 'aaaaaaaa-0000-0000-0000-e2e0000001a1';;
