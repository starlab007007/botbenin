-- Keep public listing reads available while reserving direct WhatsApp contact data for authorized server code.
revoke select on public.waouh_articles from public, anon, authenticated;
revoke select (contact_whatsapp) on public.waouh_articles from public, anon, authenticated;
grant select (id, seller_id, title, description, category, brand, model, condition, price, currency, photos, location, city, address_description, radius_km, status, market_price_min, market_price_max, views_count, interests_count, expires_at, created_at, updated_at, origin, origin_signal_id, source_channel, partner_id, ai_canonical_key, ai_attributes, ai_quality_score, last_verified_at, gtin, barcode_type, ai_visual_fingerprint)
  on public.waouh_articles to anon, authenticated;
notify pgrst, 'reload schema';
