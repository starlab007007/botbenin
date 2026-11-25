/** Read-only guidance: recommendations never change a collector or its budget. */
export type CollectionSection = 'overview' | 'platforms' | 'search' | 'contacts' | 'settings';
export const providerLabel = (key: string) => ({public_feed:'Collecte publique',apify:'Apify',serpapi:'SerpAPI',firecrawl:'Firecrawl',google_places:'Google Places'}[key] ?? key);
export const engineLabel = (key: string) => ({cheerio:'Cheerio',crawlee:'Crawlee',playwright:'Playwright',scrapy:'Scrapy',beautifulsoup:'Beautiful Soup',crawl4ai:'Crawl4AI'}[key] ?? key);
export const formatDate = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Non vérifié';
export const cadenceLabel = (minutes: number) => minutes >= 1440 && minutes % 1440 === 0 ? `${minutes / 1440} j` : minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`;
export type Guidance = {title:string;detail:string;action:string;section:CollectionSection;platform?:string;tone:'warning'|'info'|'danger'};
const reasons: Record<string, {title:string;detail:string}> = {
 provider_quota_exhausted:{title:'Quota API atteint',detail:'Le nombre d’appels ou le budget réservé du jour est atteint. Consultez les limites du fournisseur avant de relancer.'},
 provider_included_credits_exhausted:{title:'Crédits inclus épuisés',detail:'Les crédits inclus ne suffisent plus. La collecte attend leur renouvellement.'},
 provider_credentials_unavailable:{title:'Connexion API à configurer',detail:'La clé du fournisseur manque ou son accès est désactivé.'},
 provider_access_or_billing_blocked:{title:'Accès au fournisseur refusé',detail:'Vérifiez la connexion et les crédits du fournisseur.'},
 provider_budget_not_configured:{title:'Budget API à renseigner',detail:'Le fournisseur attend un plafond de coût valide.'},
 source_not_ready:{title:'Configuration à compléter',detail:'Vérifiez l’adresse, le format de la source et les informations d’accès.'},
 source_not_found:{title:'Source introuvable',detail:'Vérifiez l’adresse de la rubrique avant de refaire le test.'},
 source_format_changed:{title:'Format de page non reconnu',detail:'L’adresse ou la structure de la page a changé. Vérifiez l’adaptateur et testez à nouveau.'},
 source_robots_disallowed:{title:'Collecte non autorisée par le site',detail:'Le site refuse cette collecte. Utilisez un accès API ou un flux autorisé.'},
 source_permission_missing:{title:'Accès à valider',detail:'Complétez les informations d’accès de cette source avant son raccordement.'},
 provider_paused:{title:'Fournisseur en pause',detail:'Consultez les réglages du fournisseur pour décider de sa reprise.'},
 engine_runtime_unavailable:{title:'Service des moteurs indisponible',detail:'Vérifiez l’installation des moteurs avant de relancer un test.'},
 source_daily_page_limit:{title:'Limite quotidienne de cette source atteinte',detail:'Attendez la réinitialisation ou examinez la cadence dans les réglages de cette source.'},
 collection_daily_page_limit:{title:'Limite commune de collecte atteinte',detail:'Les nouvelles lectures attendent la réinitialisation du quota commun.'},
};
export function explainCollectionReason(code?: string | null) {
 if (!code) return {title:'À vérifier',detail:'Consultez le dernier test et les informations de cette source.'};
 if (reasons[code]) return reasons[code];
 if (/credentials|key_missing/.test(code)) return reasons.provider_credentials_unavailable;
 if (/quota|budget/.test(code)) return reasons.provider_quota_exhausted;
 if (/source_http_(403|429)|rate_limited/.test(code)) return {title:'Lecture temporairement refusée',detail:'Le site limite ou refuse les lectures. Attendez avant de relancer ; consultez les détails du contrôle.'};
 if (/engine|runtime/.test(code)) return reasons.engine_runtime_unavailable;
 return {title:'Contrôle à reprendre',detail:'La dernière tentative n’a pas abouti. Consultez les détails puis testez la source.'};
}
export function platformProgress(platform:any, entries:any[], targets:any[] = [], now=Date.now()) {
 const unique=entries.filter(e=>!e.alias_of);
 const linked=unique.filter(e=>e.target_id);
 const known=linked.map(e=>targets.find(t=>t.id===e.target_id)).filter(Boolean);
 const active=known.filter(t=>t.enabled).length;
 const failed=unique.find(e=>e.test_status==='failed');
 if(platform.access_state==='paused')return {label:'En pause',tone:'muted',stage:0,active,linked:linked.length};
 if(failed)return {label:explainCollectionReason(failed.test_report?.reason).title,tone:'warning',stage:2,active,linked:linked.length};
 if(active)return {label:'Collecte activée',tone:'success',stage:3,active,linked:linked.length};
 if(linked.length&&known.length===linked.length&&known.every(t=>!t.enabled))return {label:'Cible en pause',tone:'muted',stage:2,active,linked:linked.length};
 if(platform.access_state!=='authorized'||platform.adapter_key==='none')return {label:platform.access_state==='unverified'?'Adresse à vérifier':'À configurer',tone:'warning',stage:0,active,linked:linked.length};
 const recent=unique.some(e=>e.test_status==='passed'&&e.test_at&&Date.parse(e.test_at)>now-86400000);
 return {label:recent?'Prête à raccorder':linked.length?'Raccordée · état à vérifier':'Test requis',tone:recent?'info':'warning',stage:recent?2:1,active,linked:linked.length};
}
export function collectionGuidance(collection:any,catalog:any,engines:any):Guidance[] {
 const out:Guidance[]=[];
 for(const p of collection?.policies??[]){
  const used=(collection.usage??[]).filter((u:any)=>u.provider===p.provider).reduce((n:number,u:any)=>n+Number(u.estimated_cost??0),0);
  if(p.estimated_daily_cost_limit!=null&&used>=Number(p.estimated_daily_cost_limit))out.push({title:`${providerLabel(p.provider)} : plafond du jour atteint`,detail:`${used.toFixed(2)} ${p.cost_currency??''} réservés. Une reprise n’augmente pas ce plafond.`,action:'Voir les quotas',section:'settings',tone:'warning'});
  else if(p.paused)out.push({title:`${providerLabel(p.provider)} en pause`,detail:'La pause est conservée jusqu’à votre décision de reprise.',action:'Voir le fournisseur',section:'settings',tone:'info'});
 }
 for(const p of catalog?.platforms??[]){
  const e=(catalog.entries??[]).filter((e:any)=>e.platform_key===p.platform_key&&!e.alias_of);
  const failed=e.find((e:any)=>e.test_status==='failed');
  if(failed){const issue=explainCollectionReason(failed.test_report?.reason);out.push({title:`${p.label} : ${issue.title.toLowerCase()}`,detail:issue.detail,action:'Voir la source',section:'platforms',platform:p.platform_key,tone:'warning'});}
 }
 const unavailable=(engines?.engines??[]).filter((e:any)=>e.enabled&&e.last_check_status==='unavailable');
 if(unavailable.length)out.push({title:`${unavailable.length} moteur(s) indisponible(s)`,detail:'Vérifiez leur installation avant de modifier les sources qui les utilisent.',action:'Voir les moteurs',section:'settings',tone:'danger'});
 if(!out.length&&catalog?.platforms?.some((p:any)=>p.access_state==='review'||p.adapter_key==='none'))out.push({title:'Préparer les prochaines sources',detail:'Choisissez une plateforme, complétez son accès, puis vérifiez une extraction avant de la raccorder.',action:'Configurer une source',section:'platforms',tone:'info'});
 return out;
}
