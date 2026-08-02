delete from waouh_unified_catalog where source_ref_id in (select id from waouh_articles where title ilike '%Zorblax7777%');
delete from waouh_articles where title ilike '%Zorblax7777%';;
