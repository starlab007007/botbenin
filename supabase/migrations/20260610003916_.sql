-- Cleanup: cancel miroir negotiation where seller_user_id and buyer_user_id correspond to the same person
-- (vendeur ayant ouvert une néga sur son propre article via son LID WhatsApp).
UPDATE public.waouh_deals SET status='cancelled' WHERE id='e9739a2a-7254-44e7-9c73-add246de80ea';
UPDATE public.waouh_negotiations SET state='closed', closed_at=now() WHERE id='bc649d8c-9285-4215-a826-66fa17d0e536';
-- Réouvrir la vraie néga si elle a été marquée accepted à tort
UPDATE public.waouh_negotiations SET state='countered' WHERE id='45d2461a-3704-469d-9ec5-a694e6d3390a' AND state IN ('accepted','closed');
-- Remettre l'article en vente
UPDATE public.waouh_articles SET status='active' WHERE id='c1da3c91-f8f0-48e3-ae63-a084655a0ff6' AND status='sold';;
