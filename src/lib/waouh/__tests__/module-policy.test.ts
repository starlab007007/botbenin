import {describe,it,expect} from 'vitest';
import {moduleCatalog,moduleForPath,modulesForAction,policyAllows,modulePolicyAllowed} from '../../../../supabase/functions/_shared/waouh-module-policy';
describe('Shared module access contract',()=>{
 it('maps all modules and deep links by longest path',()=>{for(const m of moduleCatalog)for(const path of m.paths)expect(moduleForPath(path)).toBe(m.key);expect(moduleForPath('/app/agents/bi/123')).toBe('bi');expect(moduleForPath('/APP/AGENTS%2FBI/123')).toBe('bi');expect(moduleForPath('/admin/modules')).toBeNull();expect(moduleForPath('/app/auth')).toBeNull();expect(moduleForPath('/app/partner/payments/abc')).toBe('paiements');});
 it('distinguishes hiding from access and automatic actions',()=>{const p=[{module_key:'chat',visible:false,access_enabled:true,automation_enabled:false}];expect(policyAllows(p,['chat'])).toBe(true);expect(policyAllows(p,['chat'],true)).toBe(false);expect(policyAllows([],['chat'])).toBe(false);});
 it('fails closed on unavailable or malformed policy',async()=>{for(const response of [{error:Error(),data:null},{data:null},{data:[]}])expect(await modulePolicyAllowed({rpc:async()=>response},['avatar'],'owner')).toBe(false);});
 it('requires every module needed by an autonomous mission',()=>{const keys=modulesForAction('nexus.mandate.create');expect(keys).toEqual(['nexus','missions','avatar']);expect(policyAllows(keys.map(module_key=>({module_key,visible:true,access_enabled:true,automation_enabled:module_key!=='avatar'})),keys,true)).toBe(false);});
});
