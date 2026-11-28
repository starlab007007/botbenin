// Real public production browser, no credentials, no writes.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.AUDIT_OUT||'journey-audit/browser';
await mkdir(out,{recursive:true});
const base='https://bot.bj';
const actions={acheter:'/app/avatar/acheter',vendre:'/app/avatar/vendre',trouver:'/app/chat',service:'/app/chat',opportunite:'/app/chat',prestation:'/app/chat'};
const results=[];
// Only the access-policy read is let through: without it the fail-closed gate hides every page.
const READ_ONLY_RPC=new Set(['/rest/v1/rpc/waouh_module_policy']);
const browser=await chromium.launch({headless:true});
function targetOk(url,expected){
 const u=new URL(url);
 if(u.origin!==base)return false;
 if(u.pathname===expected || expected==='/app/chat'&&u.pathname==='/app/chat/waouh')return true;
 const next=u.searchParams.get('next')||'';
 return ['/app/auth','/auth'].includes(u.pathname)&&next.startsWith(expected);
}
async function capture(page,name){
 await page.screenshot({path:out+'/'+name+'.png',timeout:10000,animations:'disabled'});
 return name+'.png';
}
async function state(page){
 return page.evaluate(()=>({path:location.pathname,overflow:document.documentElement.scrollWidth>innerWidth+3,
 fallback:/Une erreur s'est produite|Une erreur s’est produite|Application error/i.test(document.body?.innerText||''),
 auth:!!document.querySelector('input[type="password"]')}));
}
try{
 for(const [device,width,height] of [['desktop',1440,900],['tablet',834,1112],['mobile',390,844]]){
  for(const [action,expected] of Object.entries(actions)){
   const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
   const blocked=[];
   await context.route('**/*',route=>{
    const request=route.request(),method=request.method();
    if(['GET','HEAD','OPTIONS'].includes(method))return route.continue();
    let path='';try{path=new URL(request.url()).pathname;}catch{}
    // Read-only RPCs sent as POST by the client (STABLE functions, verified in the database).
    if(method==='POST'&&READ_ONLY_RPC.has(path))return route.continue();
    blocked.push(method+' '+path);return route.abort();
   });
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',()=>errors.push('pageerror'));
   let entry={device,action,expected,scope:'public_production_read_only',screenshots:[],status:'fail'};
   try{
    const res=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
    if(!res?.ok())throw new Error('HTTP home '+res?.status());
    const button=page.locator('[data-waouh-action="'+action+'"]');
    const t0=Date.now();
    await button.waitFor({state:'visible',timeout:45000});
    entry.entryVisibleMs=Date.now()-t0;
    entry.screenshots.push(await capture(page,device+'-'+action+'-01-entree'));
    await button.click({timeout:10000});
    // Some public actions open the guided prompt first. Capture that state, not a fake result.
    await page.waitForTimeout(1600);
    entry.screenshots.push(await capture(page,device+'-'+action+'-02-action'));
    const after=await state(page);
    entry.path=after.path;entry.auth=after.auth;entry.overflow=after.overflow;entry.pageErrors=errors.length;
    if(after.fallback||after.overflow||errors.length)throw new Error('fallback, overflow or runtime error');
    if(targetOk(page.url(),expected))entry.status='pass';
    else {entry.status='review';entry.reason='Intermediate UI or route differs; inspect screenshot. No authenticated step executed.';}
   }catch(error){
    entry.reason=String(error?.message||error).slice(0,180);
    // Public page diagnosis only (guest view, no account data): what the visitor actually sees.
    try{entry.diagnosis=await page.evaluate(()=>({url:location.pathname+location.search,title:document.title,readyState:document.readyState,
     entryButtons:document.querySelectorAll('[data-waouh-action]').length,status:document.querySelector('[role="status"]')?.textContent?.trim().slice(0,120)||null,
     text:(document.body?.innerText||'').replace(/\s+/g,' ').trim().slice(0,240)}));}catch{}
    try{entry.screenshots.push(await capture(page,device+'-'+action+'-03-erreur'));}catch{}
   }finally{entry.blockedWrites=blocked.length;entry.blockedPaths=[...new Set(blocked)].slice(0,12);results.push(entry);await context.close();}
   console.log(device+' '+action+' '+entry.status+(entry.path?' -> '+entry.path+(entry.auth?' (sign-in form)':''):'')+(entry.reason?' | '+entry.reason.split('\n')[0]:'')+(entry.diagnosis?' | '+JSON.stringify(entry.diagnosis):'')+(entry.entryVisibleMs!=null?' | entry visible after '+entry.entryVisibleMs+' ms':'')+(blocked.length?' | blocked '+JSON.stringify(entry.blockedPaths):''));
   await writeFile(out+'/report.json',JSON.stringify({generated_at:new Date().toISOString(),target:base,scope:'public production read-only; no sign-in, no publication, no negotiation',results},null,2));
  }
 }
}finally{await browser.close();}
const failures=results.filter(x=>x.status!=='pass');
if(results.length!==18||failures.length)process.exitCode=1;
