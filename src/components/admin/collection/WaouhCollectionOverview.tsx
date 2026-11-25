import React from 'react';
import {Activity,ArrowRight,CheckCircle2,Database,Layers3,ShieldCheck,Sparkles,TriangleAlert,Workflow} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {collectionGuidance,explainCollectionReason,formatDate,providerLabel,type CollectionSection} from '@/lib/admin/collectionControl';
import {useCollectionControl} from './CollectionControlContext';
export type CollectionNavigate=(section:CollectionSection,platform?:string,setting?:string)=>void;
export default function WaouhCollectionOverview({onNavigate}:{onNavigate:CollectionNavigate}){
 const control=useCollectionControl()!;
 const {collection,catalog,engines}=control.resources;
 const c=collection.data,s=catalog.data,e=engines.data;
 const issues=collectionGuidance(c,s,e),failed=Object.values(control.resources).some(r=>!!r.error);
 const active=c?.targets.filter((t:any)=>t.enabled).length;
 const readyEngines=e?.engines.filter((e:any)=>e.enabled&&e.last_check_status==='available'&&e.last_test_status==='passed').length;
 const quality=c?.quality;
 const cards=[
  {label:'Fiches dans la recherche',value:s?.indexed_documents,detail:'Base commune à toutes les sources',icon:Database,section:'search'},
  {label:'Collecteurs activés',value:active,detail:c?`Sur ${c.targets.length} collecteurs configurés`:'État à charger',icon:Activity,section:'settings'},
  {label:'Plateformes référencées',value:s?.platforms.length,detail:s?`${s.entries.length} entrées, rubriques partagées incluses`:'Registre des sources',icon:Layers3,section:'platforms'},
  {label:'Moteurs prêts',value:readyEngines,detail:e?`Sur ${e.engines.length} moteurs · installation et test vérifiés`:'Installation et test à vérifier',icon:Workflow,section:'settings'},
 ];
 return <div className="wcc-overview">
  <section className="wcc-hero">
   <div><span className="wcc-eyebrow"><Sparkles size={14}/>Contrôle guidé</span><h2>La bonne action,<br/>au bon endroit.</h2><p>Repérez ce qui demande votre attention, puis pilotez chaque source en quelques étapes.</p>
    <Button className="mt-4 gap-2" onClick={()=>onNavigate('platforms')}>Gérer mes sources<ArrowRight size={16}/></Button>
   </div>
   <div className="wcc-hero-status"><div className="wcc-status-orbit"><Activity size={32}/></div><strong>{failed?'Données partielles':issues.length?`${issues.length} point${issues.length>1?'s':''} à examiner`:'Suivi disponible'}</strong><span>{c?`Dernier relevé ${formatDate(c.checked_at)}`:'Lecture des données en cours'}</span><small>Actualisation du tableau uniquement.<br/>Aucune collecte n’est lancée à l’ouverture.</small></div>
  </section>
  {failed&&<div className="wcc-notice" role="alert"><TriangleAlert size={18}/><div><strong>Une partie des données n’a pas pu être actualisée.</strong><p>Les derniers relevés disponibles sont conservés et peuvent être anciens.</p></div><Button variant="outline" size="sm" onClick={()=>void control.refresh()}>Réessayer</Button></div>}
  <div className="wcc-kpis">{cards.map(({label,value,detail,icon:Icon,section})=><button key={label} className="wcc-kpi" onClick={()=>onNavigate(section as CollectionSection,undefined,label==='Moteurs prêts'?'engines':undefined)}><span className="wcc-kpi-icon"><Icon size={19}/></span><span className="wcc-kpi-label">{label}</span>{value===undefined?<Skeleton className="h-9 w-16"/>:<strong>{Number(value).toLocaleString('fr-FR')}</strong>}<small>{detail}</small><ArrowRight className="wcc-kpi-arrow" size={16}/></button>)}</div>
  <div className="wcc-overview-grid">
   <section className="wcc-surface"><div className="wcc-section-heading"><div><h3>À votre attention</h3><p>Suggestions fondées sur les derniers contrôles.</p></div><span className="wcc-chip">{issues.length} point{issues.length>1?'s':''}</span></div>
    {!c&&!s&&!e?<div className="space-y-3" aria-label="Chargement du suivi"><Skeleton className="h-20 w-full"/><Skeleton className="h-20 w-full"/></div>:issues.length?issues.slice(0,4).map((issue,i)=><div className="wcc-recommendation" key={`${issue.title}-${i}`}><span className={`wcc-signal wcc-signal-${issue.tone}`}><TriangleAlert size={17}/></span><div><strong>{issue.title}</strong><p>{issue.detail}</p><button onClick={()=>onNavigate(issue.section,issue.platform,issue.title.includes('moteur')?'engines':'policies')}>{issue.action}<ArrowRight size={14}/></button></div></div>):<div className="wcc-empty"><CheckCircle2 size={25}/><strong>Aucun blocage signalé dans les relevés disponibles.</strong><span>Une source référencée peut encore nécessiter un raccordement.</span></div>}
   </section>
   <section className="wcc-surface"><div className="wcc-section-heading"><div><h3>Qualité des fiches</h3><p>{quality?`Échantillon : ${quality.sample_size} fiches récemment contrôlées`:'Lecture du dernier échantillon'}</p></div><ShieldCheck size={20}/></div>
    {quality?<><div className="wcc-quality-score"><strong>{quality.sample_size?Math.round(100*quality.complete/quality.sample_size):'—'}<small>{quality.sample_size?' %':''}</small></strong><span>avec photo, prix et contact<br/>dans cet échantillon</span></div>
     <div className="wcc-meter" role="meter" aria-label="Fiches complètes dans l’échantillon" aria-valuemin={0} aria-valuemax={100} aria-valuenow={quality.sample_size?Math.round(100*quality.complete/quality.sample_size):0}><span style={{width:`${quality.sample_size?100*quality.complete/quality.sample_size:0}%`}}/></div>
     <dl className="wcc-quality-list"><div><dt>Photo manquante</dt><dd>{quality.missing_photo}</dd></div><div><dt>Prix à compléter</dt><dd>{quality.missing_price}</dd></div><div><dt>Contact manquant</dt><dd>{quality.missing_contact}</dd></div></dl>
     <p className="wcc-help">Un prix peut rester à demander pour une prestation. Ces chiffres ne représentent pas toute la base.</p><button className="wcc-text-action" onClick={()=>onNavigate('search')}>Examiner les fiches<ArrowRight size={14}/></button>
    </>:<Skeleton className="h-48 w-full"/>}
   </section>
  </div>
  <section className="wcc-surface"><div className="wcc-section-heading"><div><h3>Derniers passages</h3><p>Collecte, actualisation et contrôles récents.</p></div><button className="wcc-text-action" onClick={()=>onNavigate('settings')}>Tout le suivi<ArrowRight size={14}/></button></div>
   {c?.jobs?.length?<div className="wcc-job-list">{c.jobs.slice(0,5).map((j:any)=><div className="wcc-job" key={j.id}><span className={`wcc-dot ${j.status==='succeeded'?'wcc-dot-success':j.status==='blocked'||j.status==='failed'?'wcc-dot-warning':''}`}/><div><strong>{providerLabel(j.provider)}</strong><span>{j.report?.reason?explainCollectionReason(j.report.reason).title:({succeeded:'Passage terminé',empty:'Aucune nouvelle fiche',running:'En cours',queued:'En attente',blocked:'Bloqué',failed:'Échec',partial:'Passage partiel'}[j.status]??'Passage enregistré')}</span></div><time>{formatDate(j.created_at)}</time></div>)}</div>:<p className="wcc-help">{collection.loading?'Chargement des passages…':'Aucun passage disponible dans le dernier relevé.'}</p>}
  </section>
 </div>;
}
