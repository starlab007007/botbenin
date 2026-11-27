// Compact, source-backed business facts; never infer availability or a price floor.
Map<String,String> livePriorityFacts(Map<String,dynamic> row,String journey,{String? guided}) {
 final e=row['evidence'] is Map ? row['evidence'] as Map : const {};
 String read(List<String> keys){for(final k in keys){final v=row[k]??e[k];if(v is String&&v.trim().isNotEmpty)return v.trim();if(v is num&&v.isFinite)return '$v';if(v is List){final s=v.whereType<String>().join(' · ');if(s.isNotEmpty)return s;}}return '';}
 String money(List<String> keys){final n=num.tryParse(read(keys));return n!=null&&n.isFinite&&n>0?'${n.round()} FCFA':'';}
 String availability(){final s=read(['availability','stock_status','available_at','time_slot']);if(s.isNotEmpty)return s;final b=row['in_stock']??e['in_stock'];return b==true?'En stock':b==false?'Indisponible':'';}
 String source(){final url=Uri.tryParse(read(['source_url']));return url!=null&&url.host.isNotEmpty?url.host:read(['source']);}
 Map<String,String> facts;
 switch(journey){
 case 'sale': facts={'Budget acheteur':money(['price','price_max','price_min']),'Quantité':read(['quantity','requested_quantity']),'Prix plancher':money(['price_floor']),'Localisation':read(['city'])};break;
 case 'opportunity': facts={'Organisme':read(['organization','organizer','provider_name']),'Échéance':read(['deadline','closing_date','expires_at']),'Éligibilité':read(['conditions','eligibility','eligibility_conditions']),'Dossier':read(['required_documents','application_documents','application_requirements'])};break;
 case 'service': facts={'Périmètre':read(['scope','deliverables','service_scope']),'Tarif':money(['price','price_min','price_max']),'Qualifications':read(['qualifications','certifications','experience']),'Garantie':read(['warranty','guarantee'])};break;
 case 'project': facts={'Créneau':availability(),'Délai (jours)':read(['delivery_days','duration_days','delai_jours']),'Livrables':read(['deliverables','scope']),'Lieu':read(['city']),'Coût total':money(['total_cost','total_price'])};break;
 default: facts=guided=='trouver'||guided=='demander'?{'Correspondance':read(['match_verdict','match']),'Localisation':read(['city']),'Source':source(),'Disponibilité':availability()}:{'État':read(['condition']),'Stock':availability(),'Livraison':read(['delivery_mode','delivery','delivery_options']),'Vendeur':read(['seller_name','seller_label','provider_name'])};
 }
 return facts.map((k,v)=>MapEntry(k,v.isEmpty?'À confirmer':v));
}
