do $$
declare v_t uuid:=(select target_id from public.waouh_collection_entries where entry_no=4);
begin
  delete from public.waouh_search_documents d using public.waouh_collection_pages p
   where p.target_id=v_t and p.url ~ '/bj/annonces/categories/' and p.record_id is not null
     and (d.fabric_id::text=p.record_id::text or split_part(d.fabric_id::text,':',2)=p.record_id::text);
  update public.waouh_collection_pages set state='removed',record_id=null where target_id=v_t and url ~ '/bj/annonces/categories/';
  update public.waouh_collection_pages set next_due_at=now() where target_id=v_t and state<>'removed';
  update public.waouh_collection_targets set next_due_at=now() where id=v_t;
end $$;