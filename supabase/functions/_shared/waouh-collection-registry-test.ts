import assert from 'node:assert/strict';
import {discoverUrls,extractListing,listingGallery} from './waouh-collection/adapters.ts';
import {registryPatch,catalogAdmin} from './waouh-collection/registry.ts';
import {apiActorInput,apiSiteReader} from './waouh-collection/providers.ts';
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
