import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {Switch} from '@/components/ui/switch';
import {Checkbox} from '@/components/ui/checkbox';
import {Link} from 'react-router-dom';
type Row={module_key:string;label:string;enabled:boolean;access_enabled:boolean;automation_enabled:boolean;role_names:string[]};
type Role={name:string;display_name:string};
export function AdminModulesPage(){
 const {user}=useAuth(),owner=user?.id;const generation=useRef(0);
 const [rows,setRows]=useState<Row[]>([]),[roles,setRoles]=useState<Role[]>([]),[audit,setAudit]=useState<Array<{id:string;module_key:string;created_at:string;after_state?:{enabled?:boolean;access_enabled?:boolean;automation_enabled?:boolean}}>>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const load=async(version=generation.current)=>{try{const [a,b,c]=await Promise.all([supabase.rpc('waouh_admin_frontend_modules_state' as never),supabase.from('roles').select('name,display_name'),supabase.from('waouh_frontend_module_audit' as never).select('id,module_key,created_at,after_state').order('created_at',{ascending:false}).limit(15)]);if(version!==generation.current)return;if(a.error||b.error||c.error)throw Error();setRows(a.data as unknown as Row[]);setRoles(b.data as Role[]);setAudit(c.data as unknown as typeof audit);setError('');}catch{if(version===generation.current)setError('Chargement impossible. Réessayez.');}finally{if(version===generation.current)setLoading(false);}};
 useEffect(()=>{const version=++generation.current;setRows([]);setAudit([]);setLoading(true);void load(version);return()=>{generation.current++;};},[owner]);
 const save=async(row:Row,patch:{p_visible?:boolean;p_access?:boolean;p_automation?:boolean;p_role_names?:string[]})=>{
  if(!owner||busy)return;const version=generation.current;
  if(patch.p_access===false&&!window.confirm(`Couper l’accès à « ${row.label} » ? Les données seront conservées.`))return;
  setBusy(row.module_key);setError('');try{const {data}=await supabase.auth.getSession();if(data.session?.user.id!==owner)throw Error();
   const {error}=await supabase.rpc('waouh_admin_update_module' as never,{p_module_key:row.module_key,...patch} as never).setHeader('Authorization',`Bearer ${data.session.access_token}`);if(error)throw Error();await load(version);
  }catch{if(version===generation.current)setError('Modification impossible. Réessayez.');}finally{if(version===generation.current)setBusy('');}
 };
 return <main className="mx-auto max-w-6xl p-4 sm:p-8"><h1 className="text-2xl font-semibold">Modules utilisateurs</h1><p className="mt-2 text-sm text-muted-foreground">Les mêmes règles s’appliquent sur Web et dans l’application. Les données sont conservées.</p><Link className="my-4 inline-block text-sm text-blue-600" to="/admin/waouh?tab=control">Contrôles d’exploitation</Link>
 {error&&<div role="alert" className="mb-4 text-sm text-rose-600">{error}<button className="ml-3 underline" onClick={()=>void load()}>Réessayer</button></div>}
 {loading?<p role="status">Chargement…</p>:<div className="grid gap-4 md:grid-cols-2">{rows.map(row=><section className="rounded-2xl border bg-white p-5" key={row.module_key}><h2 className="font-semibold">{row.label}</h2><p className="mt-1 text-xs text-muted-foreground">{!row.access_enabled?'Accès coupé':!row.enabled?'Masqué · accès autorisé':row.role_names.length?'Réservé aux profils sélectionnés':'Disponible pour tous les profils'}</p>
 <div className="my-4 space-y-3">{([{label:'Afficher',hint:'Menus, onglets et raccourcis',value:row.enabled,field:'p_visible'},{label:'Autoriser l’accès',hint:'Pages et actions du module',value:row.access_enabled,field:'p_access'},{label:'Autoriser les automatisations',hint:'Les actions manuelles restent disponibles',value:row.automation_enabled,field:'p_automation'}] as const).map(x=><label className="flex items-center justify-between gap-4" key={x.field}><span><span className="block text-sm">{x.label}</span><small className="text-muted-foreground">{x.hint}</small></span><Switch aria-label={`${x.label} ${row.label}`} checked={x.value} disabled={!!busy} onCheckedChange={v=>void save(row,{[x.field]:v})}/></label>)}</div>
 <details><summary className="cursor-pointer text-sm">Profils autorisés</summary><p className="my-2 text-xs text-muted-foreground">Aucun profil coché : ouvert à tous, y compris aux visiteurs pour les pages publiques. Pour fermer le module, coupez son accès.</p><div className="flex flex-wrap gap-3">{roles.map(role=><label className="flex items-center gap-2 text-sm" key={role.name}><Checkbox disabled={!!busy} checked={row.role_names.includes(role.name)} onCheckedChange={v=>void save(row,{p_role_names:v===true?[...row.role_names,role.name]:row.role_names.filter(n=>n!==role.name)})}/>{role.display_name||role.name}</label>)}</div></details>
 </section>)}</div>}
 <section className="mt-8"><h2 className="font-semibold">Derniers changements</h2><p className="text-xs text-muted-foreground">Chaque modification conserve un historique réservé à l’administration.</p>{audit.map(a=><p className="border-b py-3 text-sm" key={a.id}>{rows.find(r=>r.module_key===a.module_key)?.label||'Module'} · {new Date(a.created_at).toLocaleString('fr-FR')}<small className="block text-muted-foreground">{a.after_state?.enabled?'Affiché':'Masqué'} · {a.after_state?.access_enabled?'Accès autorisé':'Accès coupé'} · {a.after_state?.automation_enabled?'Automatisations autorisées':'Automatisations suspendues'}</small></p>)}</section></main>;
}
export default AdminModulesPage;
