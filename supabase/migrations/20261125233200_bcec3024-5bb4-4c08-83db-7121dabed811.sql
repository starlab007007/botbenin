do $$
declare v_t uuid;
begin
  update public.waouh_collection_entries set test_status='passed',test_at=now(),test_config_hash='niosso-manual-20261126',
    test_report=jsonb_build_object('mode','lecture réelle des pages publiques','index','https://niosso.com/bj','annonces_trouvees',40,'fiches_lues',6,'fiches_avec_prix',5,
      'exemples',jsonb_build_array('Toyota FJ cruiser — 8 000 000 FCFA','Teinte cheveux DARK & LOVELY — 10 000 FCFA','La fibre optique — 19 900 FCFA'))
   where entry_no=4;
  v_t:=public.waouh_collection_connect_entry(4,'niosso-manual-20261126');
  update public.waouh_collection_entries set alias_of=4 where entry_no=41 and alias_of is null;
  update public.waouh_collection_targets set next_due_at=now() where id=v_t;
  insert into public.waouh_collection_admin_events(action,details) values('catalog.connect',jsonb_build_object('entry_no',4,'target_id',v_t,'note','Niosso raccordé après lecture réelle'));
end $$;