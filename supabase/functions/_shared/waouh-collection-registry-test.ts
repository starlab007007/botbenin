import assert from 'node:assert/strict';
import {discoverUrls,extractListing,listingGallery} from './waouh-collection/adapters.ts';
import {registryPatch,catalogAdmin} from './waouh-collection/registry.ts';
import {apiActorInput,apiSiteReader} from './waouh-collection/providers.ts';
import {discoverWeb} from './waouh-collection/web.ts';
import {managedCatalog} from './waouh-collection/managed.ts';
import {siteReader} from './waouh-collection/network.ts';
import {publicNexusResult} from './waouh-public-discovery.ts';
const root=new URL('https://e-benin.bj/annonces/16');
const photos=Array.from({length:12},(_,i)=>`https://e-benin.bj/media/${i}.jpg`);
const html=`<html><head><link rel="canonical" href="${root}"><meta property="og:image" content="${photos[0]}"></head><body><main>
<h1>iPhone 13 à Cotonou</h1><span itemprop="price" content="150000">150 000 FCFA</span>
<time datetime="2026-11-20T09:00:00+01:00"></time><div class="product-gallery">${photos.map(p=>`<img data-original="${p}" src="${p}?w=80">`).join('')}</div>
<div class="listing-description">iPhone 13 en bon état à Cotonou</div><aside><img src="https://e-benin.bj/unrelated.jpg"></aside></main></body></html>`;
Deno.test('the complete listing gallery excludes resized thumbnails, avatars and related offers',()=>{
 assert.deepEqual(listingGallery(html,root),photos);
 const row=extractListing(html,root,{attribution:'E-Bénin',media_reuse_authorized:true});
 assert.equal(row?.price_min,150000);assert.equal(row?.evidence.photos?.length,12);assert.equal(row?.source_url,root.href);assert.equal(row?.evidence.published_at,'2026-11-20T08:00:00.000Z');
 assert.equal((extractListing(html,root,{attribution:'E-Bénin',media_reuse_authorized:false})?.evidence.photos??[]).length,0);
});
Deno.test('discovery retains canonical on-site details and pagination without login or external links',()=>{
 const found=discoverUrls('<a href="/annonces/22?utm_source=x">objet</a><a href="https://other.example/annonces/23">autre</a><a href="/login">connexion</a><a rel="next" href="/annonces?page=2">suivante</a>',new URL('https://e-benin.bj/annonces'));
 assert.deepEqual(found.details,['https://e-benin.bj/annonces/22']);assert.deepEqual(found.indexes,['https://e-benin.bj/annonces?page=2']);
});
const patch={transport:'direct',access_state:'authorized',adapter_key:'classifieds',engine_key:'cheerio',rights_reference:'Agreement reference',attribution:'Example publisher',media_authorized:false,media_hosts:[],discovery_minutes:360,recheck_minutes:1440,daily_page_limit:100};
Deno.test('Bambaad reads the displayed CFA price and keeps a reference without copying descriptions or media',()=>{
 const u=new URL('https://bj.bambaad.com/annonce/abomey-calavi-reparation-123456');
 const row=extractListing('<main><h1>Réparation de télévision</h1><strong class="bambaad-ad-hero-price">15\u202f000\u00a0F\u202fCFA</strong><p class="price">15 000 fra</p><div class="listing-description">Service à Abomey-Calavi</div><div class="product-gallery"><img src="/1.jpg"></div></main>',u,{attribution:'Bambaad',media_reuse_authorized:true,content_use:'search_reference_only'});
 assert.equal(row?.price_min,15000);assert.equal(row?.city,'Abomey-Calavi');assert.equal(row?.raw_text,'');assert.deepEqual(row?.evidence.photos??[],[]);assert.equal(row?.evidence.content_use,'search_reference_only');
});
Deno.test('contradictory source prices remain unselected rather than inventing a low offer',()=>{
 const row=extractListing('<main><h1>Traceur intelligent neuf</h1><div>10 FCFA</div><div class="listing-description">Offre flash : 10 000 FCFA. Ancien prix : 15 000 FCFA. Cotonou</div></main>',root,{attribution:'E-Bénin'});
 assert.equal(row?.price_min,undefined);assert.equal(row?.evidence.price_status,'conflict');assert.deepEqual(row?.evidence.observed_price_candidates,[10,10000,15000]);
});
Deno.test('BazarAfrique recognizes only its local timestamped listing paths',()=>{
 const origin=new URL('https://bj.bazarafrique.com/');
 assert.deepEqual(discoverUrls('<a href="/telephones/1778609345-modele-123">Annonce</a><a href="/about">À propos</a><a href="https://other.example/telephones/1778609345-modele-123">Autre</a>',origin).details,['https://bj.bazarafrique.com/telephones/1778609345-modele-123']);
});
Deno.test('settings require a bounded cadence, hostname list and documented permission',()=>{
 assert.equal(registryPatch(patch).discovery_minutes,360);
 for(const value of [{daily_page_limit:0},{discovery_minutes:1},{recheck_minutes:999999},{media_hosts:['http://127.0.0.1']},{rights_reference:''},{engine_key:'shell'},{transport:'unknown'}])assert.throws(()=>registryPatch({...patch,...value}));
});
Deno.test('source catalog commands are restricted to the administrator gateway',async()=>{
 const db={from:()=>{throw Error('must not query');},rpc:()=>Promise.resolve({data:null,error:null})};
 for(const actor of ['user','internal','none'])await assert.rejects(catalogAdmin(db,{action:'collection.catalog.configure'},{actor}),/catalog_admin_required/);
});
Deno.test('public discovery retains all safe photos and strips private contacts and signed URLs',()=>{
 const row=publicNexusResult({fabric_id:'external:x',evidence:{photos:[...photos,'https://e-benin.bj/private?token=secret'],contact_phone:'+22900000000'}});
 assert.equal((row.public_facts.photos as string[]).length,12);assert.equal((row.public_facts as any).contact_phone,undefined);
});
Deno.test('API actor is bounded, respects robots and never follows arbitrary injected URLs',()=>{
 const p=apiActorInput(new URL('https://bj.coinafrique.com/'),['https://other.example/annonce/x','https://bj.coinafrique.com/annonce/1']);
 assert.equal(p.startUrls.length,2);assert.equal(p.maxPagesPerCrawl,3);assert.equal(p.maxConcurrency,1);assert.equal(p.maxRequestRetries,0);
 assert.equal(p.respectRobotsTxtFile,true);assert.equal(p.proxyConfiguration.useApifyProxy,false);
 assert.match(p.pageFunction,/source_scope_invalid/);
});
Deno.test('a failed API quota reservation cannot issue a paid provider request',async()=>{
 const original=globalThis.fetch;let network=0;
 globalThis.fetch=async()=>{network++;throw Error('must not fetch');};
 const db={from:(name:string)=>{const q:any={};for(const method of ['select','eq'])q[method]=()=>q;
  const data=name==='waouh_radar_api_configs'?{id:'config',api_key:'test-secret',active:true,daily_quota:10,usage_today:0}:{paused:false};
  q.maybeSingle=q.single=async()=>({data,error:null});return q;},rpc:async()=>({data:false,error:null})};
 try{await assert.rejects(apiSiteReader(db,{id:'job',lease_token:'token'},new URL('https://bj.coinafrique.com/'),{collection_transport:'serpapi'}),/provider_quota_exhausted/);assert.equal(network,0);}
 finally{globalThis.fetch=original;}
});

Deno.test('conditional revalidation preserves 304 and enforces robots and source scope',async()=>{
 const original=globalThis.fetch;const calls:{url:string;headers:any}[]=[];
 globalThis.fetch=async(input:any,init:any)=>{const url=String(input);calls.push({url,headers:init?.headers});
  return url.endsWith('/robots.txt')?new Response('User-agent: *\nDisallow: /private'):new Response(null,{status:304});};
 const db={rpc:async()=>({data:true,error:null})};
 try{
  const read=siteReader(db,new URL('https://e-benin.bj/'),{});
  assert.equal((await read(root.href,{etag:'v1',last_modified:'Tue, 24 Nov 2026 00:00:00 GMT'})).status,304);
  assert.equal(calls[1].headers['if-none-match'],'v1');
  await assert.rejects(read('https://e-benin.bj/private'),/source_robots_disallowed/);
  await assert.rejects(read('https://other.example/annonces/1'),/source_scope_invalid/);
  assert.equal(calls.length,2);
 }finally{globalThis.fetch=original;}
});

Deno.test('published WhatsApp routes are extracted only from the listing body',()=>{
 const row=extractListing(html.replace('</main>','<a href="https://wa.me/2290165653468">WhatsApp</a></main><footer><a href="https://wa.me/2290199999999">Site owner</a></footer>'),root,{attribution:'E-Bénin'});
 assert.ok(row?.contacts?.some(c=>c.channel==='whatsapp'&&c.value==='2290165653468'));
 assert.ok(!row?.contacts?.some(c=>c.value==='2290199999999'));
});
Deno.test('CoinAfrique sold listings cannot be republished as available offers',()=>{
 const u=new URL('https://bj.coinafrique.com/annonce/telephones/iphone-123');
 assert.throws(()=>extractListing(`<link rel="canonical" href="${u}"><h1>iPhone 13</h1><span class="listing-status">Vendu</span>`,u,{attribution:'CoinAfrique'}),/listing_closed/);
});

function managedDb(pages:any[]){
 const updates:any[]=[];
 return {updates,rpc:async()=>({data:true,error:null}),from:(table:string)=>{
  let operation='select',patch:any,filters:((r:any)=>boolean)[]=[],maximum=100;
  const q:any={select:()=>q,upsert:()=>{operation='upsert';return q;},update:(v:any)=>{operation='update';patch=v;return q;},insert:()=>{operation='insert';return q;},
   eq:(k:string,v:any)=>{filters.push(r=>r[k]===v);return q;},neq:(k:string,v:any)=>{filters.push(r=>r[k]!==v);return q;},
   lte:()=>q,order:()=>q,limit:(n:number)=>{maximum=n;return q;},
   single:async()=>({data:table==='waouh_collection_targets'?{engine_key:'cheerio'}:{enabled:true,max_document_kb:1200},error:null}),
   then:(resolve:any)=>{const rows=pages.filter(r=>filters.every(f=>f(r))).slice(0,maximum);
    if(operation==='update'){updates.push({table,patch,ids:rows.map(r=>r.id)});rows.forEach(r=>Object.assign(r,patch));}
    return Promise.resolve({data:operation==='select'?rows:[],error:null}).then(resolve);}};return q;
 }};
}
Deno.test('a changed index cannot prevent known detail revalidation and partial publication',async()=>{
 const original=globalThis.fetch;
 const pages:any[]=[{id:'index',target_id:'target',kind:'index',state:'active',url:'https://e-benin.bj/annonces'},
  {id:'bad',target_id:'target',kind:'detail',state:'active',url:'https://e-benin.bj/annonces/17'},
  {id:'good',target_id:'target',kind:'detail',state:'active',url:root.href}];
 globalThis.fetch=async(input:any)=>String(input).endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /'):
  String(input).endsWith('/17')?new Response('Temporary outage',{status:502,headers:{'content-type':'text/html'}}):
  new Response(String(input)===root.href?html:'<h1>Index changed</h1>',{headers:{'content-type':'text/html'}});
 try{
  const db=managedDb(pages),rows=await managedCatalog(db,{id:'job',lease_token:'token',target_id:'target',max_items:3},new URL('https://e-benin.bj/annonces'),{attribution:'E-Bénin'});
  assert.equal(rows.length,1);assert.equal(rows[0].source_url,root.href);
  assert.deepEqual(rows.issues,['source_format_changed','source_http_502']);
  assert.equal(pages[0].last_error,'source_format_changed');assert.equal(pages[1].state,'unreachable');
 }finally{globalThis.fetch=original;}
});
Deno.test('an entirely failed discovery pass remains a visible failure',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('<h1>Changed</h1>',{headers:{'content-type':'text/html'}});
 try{await assert.rejects(managedCatalog(managedDb([{id:'index',target_id:'target',kind:'index',state:'active',url:'https://e-benin.bj/annonces'}]),
  {id:'job',lease_token:'token',target_id:'target',max_items:3},new URL('https://e-benin.bj/annonces'),{attribution:'E-Bénin'}),/source_format_changed/);
 }finally{globalThis.fetch=original;}
});
Deno.test('forbidden optional pagination is never fetched and cannot block allowed detail revalidation',async()=>{
 const original=globalThis.fetch,calls:string[]=[];
 const pages:any[]=[{id:'pagination',target_id:'target',kind:'index',state:'active',url:'https://e-benin.bj/annonces?page=2'},
  {id:'detail',target_id:'target',kind:'detail',state:'active',url:root.href}];
 globalThis.fetch=async(input:any)=>{const u=String(input);calls.push(u);return u.endsWith('/robots.txt')?new Response('User-agent: *\nDisallow: /annonces?*'):
  new Response(html,{headers:{'content-type':'text/html'}});};
 try{
  const rows=await managedCatalog(managedDb(pages),{id:'job',lease_token:'token',target_id:'target',max_items:3},new URL('https://e-benin.bj/annonces'),{attribution:'E-Bénin'});
  assert.equal(rows.length,1);assert.equal(pages[0].state,'removed');assert.ok(!calls.some(u=>u.includes('?page=2')));
  await assert.rejects(managedCatalog(managedDb([{id:'index',target_id:'target',kind:'index',state:'active',url:'https://e-benin.bj/annonces?page=2'}]),
   {id:'job',lease_token:'token',target_id:'target',max_items:3},new URL('https://e-benin.bj/annonces?page=2'),{attribution:'E-Bénin'}),/source_robots_disallowed/);
 }finally{globalThis.fetch=original;}
});

function discoveryDb(reserve=true){
 const writes:any[]=[];return {writes,rpc:async()=>({data:reserve,error:null}),from:(table:string)=>{
  let mutation=false;const q:any={select:()=>q,eq:()=>q,update:(v:any)=>{mutation=true;writes.push({table,value:v});return q;},upsert:(v:any)=>{mutation=true;writes.push({table,value:v});return q;},
   single:async()=>({data:{query:'iphone 13 Cotonou',enabled:true,provider:'serpapi'},error:null}),
   maybeSingle:async()=>({data:{id:'config',active:true,api_key:'fake-key',daily_quota:50,usage_today:0},error:null}),
   then:(resolve:any)=>Promise.resolve({data:mutation?[]:table==='waouh_radar_sources'?[{id:'source',identifier:'https://e-benin.bj/annonces',config:{automation_authorized:true,managed_catalog:true}}]:[{id:'destination',radar_source_id:'source',enabled:true}],error:null}).then(resolve)};return q;
 }};
}
Deno.test('Web discovery uses the atomic quota and queues publisher URLs without publishing snippets',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({organic_results:[{link:root.href,title:'unverified title',price:1,thumbnail:'https://e-benin.bj/thumb.jpg'},{link:'https://foreign.com/annonce/12'},{link:root.href}]});};
 try{const db=discoveryDb(),report=await discoverWeb(db,{id:'job',lease_token:'token',target_id:'web',max_items:6});
  assert.equal(calls,1);assert.equal(report.routed,1);assert.equal(report.inserted,0);assert.equal(report.qualified,0);
  const page=db.writes.find(w=>w.table==='waouh_collection_pages');assert.deepEqual(page.value,{target_id:'destination',url:root.href,kind:'detail'});
  assert.ok(!db.writes.some(w=>/signals|listings/.test(w.table)));
 }finally{globalThis.fetch=original;}
});
Deno.test('Web discovery cannot call SerpAPI after a rejected reservation',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected');};
 try{await assert.rejects(discoverWeb(discoveryDb(false),{id:'job',lease_token:'token',target_id:'web',max_items:6}),/provider_quota_exhausted/);assert.equal(calls,0);}
 finally{globalThis.fetch=original;}
});
