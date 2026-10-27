import { useEffect,useRef,useState,type ReactNode } from 'react';
import { BellRing,Check,ChevronRight,Clock3,Hand,LockKeyhole,Pause,Play,ShieldCheck,SlidersHorizontal,Sparkles } from 'lucide-react';
import { Sheet,SheetContent,SheetTitle,SheetDescription } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { BotLiveAvatar } from './bot/BotLiveAvatar';
import { DEFAULT_AVATAR_AUTONOMY,avatarAutonomyError,loadAvatarAutonomy,saveAvatarAutonomy,type AvatarAutonomySettings } from '@/lib/waouh/avatarAutonomy';
import './minimal-premium.css';

export function WaouhAutonomySettings({appearance,name='Bot'}:{appearance?:ReactNode;name?:string}) {
  const {user}=useAuth();
  const account=useRef(user?.id);account.current=user?.id;
  const [rules,setRules]=useState<AvatarAutonomySettings>({...DEFAULT_AVATAR_AUTONOMY});
  const [draft,setDraft]=useState<AvatarAutonomySettings>({...DEFAULT_AVATAR_AUTONOMY});
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [section,setSection]=useState(''),[reload,setReload]=useState(0),[loadFailed,setLoadFailed]=useState(false);
  useEffect(()=>{let active=true;setRules({...DEFAULT_AVATAR_AUTONOMY});setSection('');setNotice('');setLoading(true);setError('');setLoadFailed(false);if(!user){setLoading(false);return;}loadAvatarAutonomy().then(r=>{if(active)setRules(r);}).catch(()=>{if(active){setLoadFailed(true);setError('Chargement impossible. Réessayez.');}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[user?.id,reload]);
  const open=(id:string)=>{setDraft({...rules});setError('');setSection(id);};
  const patch=(p:Partial<AvatarAutonomySettings>)=>setDraft(r=>({...r,...p}));
  const field=(key:keyof AvatarAutonomySettings,label:string,type='text')=><label className="wmn-field"><span>{label}</span><input type={type} value={String(draft[key]??'')} onChange={e=>patch({[key]:type==='number'?(e.target.value?Number(e.target.value):null):e.target.value})} min={type==='number'?1:undefined} max={type==='number'?1e9:undefined} maxLength={1000}/></label>;
  const select=(key:keyof AvatarAutonomySettings,label:string,options:Array<[string|number,string]>)=><label className="wmn-field"><span>{label}</span><select value={String(draft[key])} onChange={e=>patch({[key]:typeof draft[key]==='number'?Number(e.target.value):e.target.value})}>{options.map(([value,text])=><option value={value} key={value}>{text}</option>)}</select></label>;
  const toggle=(key:keyof AvatarAutonomySettings,label:string)=><label className="wmn-switch"><span>{label}</span><input type="checkbox" role="switch" checked={draft[key]===true} onChange={e=>patch({[key]:e.target.checked,...(key==='allow_contact'&&!e.target.checked?{allow_negotiate:false}:{})})}/></label>;
  const store=async(value=draft)=>{const message=avatarAutonomyError(value);if(message){setError(message);return;}const id=user?.id;setSaving(true);setError('');try{const next=await saveAvatarAutonomy(value);if(account.current!==id)return;setRules(next);setSection('');setNotice(value.paused?'Bot est en pause.':'Règles enregistrées.');}catch{if(account.current===id)setError('Enregistrement impossible. Réessayez.');}finally{if(account.current===id)setSaving(false);}};
  const row=(id:string,title:string,summary:string,Icon:typeof Clock3)=><button type="button" className="wmn-setting" onClick={()=>open(id)}><Icon/><span className="wmn-grow"><strong>{title}</strong><small>{summary}</small></span><ChevronRight className="wmn-chevron"/></button>;
  const modeName={assisted:'Assisté',semi_autonomous:'Délégué',autonomous:'Automatique'};
  const titles:Record<string,string>={mode:'Comment Bot agit',timing:'Disponibilité',limits:'Mes limites',permissions:'Autorisations',appearance:'Mon avatar'};
  return <section className="wmn" data-waouh-ui="avatar-premium-settings">
    <header className="wmn-head"><h1>Mon avatar</h1></header>
    {!user?<p className="wmn-description">Connectez-vous pour régler votre avatar.</p>:loading?<p role="status">Chargement…</p>:loadFailed?<><p className="wmn-error" role="alert">{error}</p><button type="button" className="wmn-primary" onClick={()=>setReload(v=>v+1)}>Réessayer</button></>:<>
      <div className="wmn-profile"><button type="button" aria-label="Personnaliser mon avatar" onClick={()=>open('appearance')} disabled={!appearance}><BotLiveAvatar size={64}/></button><h2>{name}</h2><span className="wmn-status"><span className="wmn-dot"/>{rules.paused?'En pause':'Actif'}</span></div>
      <button type="button" className="wmn-mode" onClick={()=>open('mode')}><span className="wmn-mode-icon"><Sparkles/></span><span className="wmn-grow"><strong>{modeName[rules.mode]}</strong><small>{rules.mode==='autonomous'?'Recherche, compare et suit':rules.mode==='assisted'?'Vous propose, vous décidez':'Prépare les actions pour vous'}</small></span><ChevronRight className="wmn-chevron"/></button>
      <div className="wmn-settings">
        {row('timing','Disponibilité',`${rules.active_start}–${rules.active_end} · ${rules.duration_hours===168?'7 jours':rules.duration_hours+' h'}`,Clock3)}
        {row('limits','Limites',`${rules.budget_max?new Intl.NumberFormat('fr-FR').format(rules.budget_max)+' F':'Budget à définir'}${rules.city?' · '+rules.city:''}`,SlidersHorizontal)}
        {row('permissions','Autorisations',rules.allow_contact?`Contacts autorisés${rules.allow_negotiate?' · Négociation':''}`:'Contacts à valider',ShieldCheck)}
      </div>
      <p className="wmn-reassurance"><LockKeyhole/>Accords et paiements à valider</p>
      <button type="button" className="wmn-secondary" disabled={saving} onClick={()=>void store({...rules,paused:!rules.paused})}>{rules.paused?<Play/>:<Pause/>}{saving?'Enregistrement…':rules.paused?'Réactiver Bot':'Mettre Bot en pause'}</button>
      {notice&&<p className="wmn-notice" role="status">{notice}</p>}{error&&!section&&<p className="wmn-error" role="alert">{error}</p>}
    </>}
    <Sheet open={!!section} onOpenChange={v=>{if(!v&&!saving)setSection('');}}><SheetContent side="bottom" className="wmn-sheet" aria-describedby="wmn-rules-desc"><SheetTitle>{titles[section]||'Mon avatar'}</SheetTitle><SheetDescription id="wmn-rules-desc" className="sr-only">Réglages de votre avatar. Les limites s’appliquent aux prochaines missions.</SheetDescription><div className="wmn">
      {section==='mode'&&<>{([['assisted','Assisté','Bot propose, vous faites.',Hand],['semi_autonomous','Délégué','Bot prépare, vous approuvez.',Check],['autonomous','Automatique','Bot agit dans vos limites.',Sparkles]] as const).map(([value,label,description,Icon])=><button type="button" className="wmn-mode-choice" key={value} aria-pressed={draft.mode===value} onClick={()=>patch({mode:value})}><Icon/><span className="wmn-grow"><strong>{label}</strong><small>{description}</small></span>{draft.mode===value&&<Check/>}</button>)}<p className="wmn-description">Accords et paiements : toujours votre validation.</p></>}
      {section==='limits'&&<>{field('goal','Besoin habituel')}{field('city','Zone')}{field('budget_max','Budget maximum · F CFA','number')}<details className="wmn-accordion"><summary>Autres limites</summary>{field('price_floor','Prix plancher de vente · F CFA','number')}{select('radius_km','Rayon autorisé',[[10,'10 km'],[25,'25 km'],[50,'50 km'],[0,'Tout le Bénin']])}<p className="wmn-description">Sans position précise, Bot reste dans la ville choisie.</p>{select('max_contacts','Contacts maximum',[[3,'3'],[5,'5'],[10,'10']])}{select('no_match','Si aucune offre ne convient',[['ask','Me demander avant d’élargir'],['stop','Arrêter et me faire le point']])}</details><p className="wmn-description">Pour les prochaines missions.</p></>}
      {section==='timing'&&<><div className="wmn-grid">{field('active_start','À partir de','time')}{field('active_end','Jusqu’à','time')}</div>{select('duration_hours','Durée d’une mission',[[24,'24 heures'],[48,'48 heures'],[168,'7 jours']])}{select('followup_hours','Relancer sans réponse',[[6,'Après 6 heures'],[24,'Après 24 heures']])}<details className="wmn-accordion"><summary>Autres horaires</summary>{select('start','Démarrage',[['now','Dès maintenant'],['tomorrow','Demain à l’ouverture']])}{select('scan_interval_minutes','Vérifier les nouveautés',[[30,'Toutes les 30 minutes'],[60,'Toutes les heures'],[360,'Toutes les 6 heures']])}{select('max_followups','Relances par contact',[[0,'Aucune'],[1,'1'],[2,'2']])}</details><p className="wmn-description">Heure du Bénin. Reprise à la prochaine ouverture.</p></>}
      {section==='permissions'&&<>{toggle('allow_contact','Contacter en mon nom')}{toggle('allow_negotiate','Négocier dans mes limites')}{toggle('allow_whatsapp','Autoriser WhatsApp')}<details className="wmn-accordion"><summary className="flex items-center gap-2"><BellRing size={15}/>Suivi et alertes</summary>{toggle('notify_reply','Une réponse arrive')}{toggle('notify_offer','Une meilleure offre apparaît')}{toggle('digest_only','Un récapitulatif quotidien')}</details><p className="wmn-description">Un canal indisponible reste signalé. Tout engagement attend votre accord.</p></>}
      {section==='appearance'?appearance:<><button type="button" className="wmn-primary" disabled={saving} onClick={()=>void store()}>{saving?'Enregistrement…':'Enregistrer'}</button>{error&&<p className="wmn-error" role="alert">{error}</p>}</>}
    </div></SheetContent></Sheet>
  </section>;
}
