import type {ReactNode} from 'react';import {useLocation} from 'react-router-dom';
import {useFrontendModules} from '@/hooks/useFrontendModules';
import {moduleForPath} from '../../../supabase/functions/_shared/waouh-module-policy';
export function WaouhModuleAccessGate({children}:{children:ReactNode}){
 const {pathname}=useLocation(),key=moduleForPath(pathname),p=useFrontendModules();
 if(!key)return <>{children}</>;
 if(p.loading)return <main className="p-8 text-center" role="status">Chargement de votre espace…</main>;
 if(p.error||!p.canAccess(key))return <main className="mx-auto max-w-md p-8 text-center"><h1 className="text-xl font-semibold">{p.error?'Accès momentanément indisponible':'Module indisponible'}</h1><p className="my-4 text-sm text-slate-500">{p.error?'Vérifiez votre connexion et réessayez.':'Ce module n’est pas accessible à votre compte.'}</p><button className="rounded-xl border px-4 py-3" onClick={p.reload}>Réessayer</button><a className="ml-4 text-sm" href="/app/profile">Mon compte</a></main>;
 return <>{children}</>;
}
