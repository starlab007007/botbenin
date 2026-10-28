import {describe,it,expect} from 'vitest';
import {normalizeSaleDraft,saleTextSuggestions,mergeSaleSuggestions,trustedSalePhotos,suggestSalePrice,salePlace} from '../../../../supabase/functions/_shared/waouh-smart-sale';
const root='https://project.supabase.co',owner='owner-a';
const photos=Array.from({length:5},(_,i)=>`${root}/storage/v1/object/public/waouh-uploads/nexus/${owner}/sale/${i}.jpg`);
describe('smart sale',()=>{
 it.each([['Samsung S25 neuf 350 000 FCFA à Cotonou',350000,'new','Cotonou'],['Moto comme neuve 1.250.000 F CFA à Parakou',1250000,'like_new','Parakou'],['iPhone en panne 50 mille FCFA',50000,'poor',undefined]])('extracts supplied facts from %s',(title,price,condition,city)=>{
  expect(saleTextSuggestions(title)).toMatchObject({price:{value:price,observations:0},condition,...(city?{city}:{})});
 });
 it('keeps decimals in bulk quantities and does not invent missing facts',()=>{
  expect(saleTextSuggestions('1,5 tonnes de soja')).toMatchObject({quantity:1.5,unit:'tonne'});
  expect(saleTextSuggestions('Samsung S25')).toEqual({});
 });
 it('keeps manual overrides, even against delayed suggestions',()=>{
  const d=normalizeSaleDraft({title:'Samsung S25',price:300000,condition:'good',city:'Parakou'});
  expect(mergeSaleSuggestions(d,{title:'iPhone',price:{value:350000,low:300000,high:400000,observations:4},condition:'new',city:'Cotonou'},new Set(['title','price','condition','city']))).toEqual(d);
 });
 it('accepts only four owner uploaded images and rejects cross-account and foreign URLs',()=>{
  expect(trustedSalePhotos(photos.slice(0,4),root,owner)).toHaveLength(4);
  for(const input of [photos,[photos[0].replace(owner,'owner-b')],['https://evil.test/photo.jpg'],[photos[0]+'?token=secret'],[photos[0].replace('https:','http:')]])expect(()=>trustedSalePhotos(input,root,owner)).toThrow();
 });
 it('preserves a manually typed district and accepts only paired bounded coordinates',()=>{
  expect(salePlace('Fidjrossè, Cotonou')).toEqual({district:'Fidjrossè',city:'Cotonou'});
  expect(normalizeSaleDraft({location_label:'Fidjrossè, ',latitude:91,longitude:2})).toMatchObject({location_label:'Fidjrossè,',latitude:null,longitude:null});
  expect(normalizeSaleDraft({price:-5,condition:'perfect',latitude:6.3})).toMatchObject({price:null,condition:null,latitude:null,longitude:null});
 });
 it('suggests observed prices only with three equivalent independent references',()=>{
  const d=normalizeSaleDraft({title:'Samsung S25 Ultra 256 Go',condition:'good'});
  const row=(id:string,price:number,patch={})=>({id,title:'Samsung S25 Ultra 256 Go',model:'S25 Ultra',price,condition:'good',currency:'XOF',status:'active',...patch});
  const rows=[row('a',300000),row('b',320000),row('c',340000)];
  expect(suggestSalePrice(d,rows)).toMatchObject({value:320000,observations:3});
  for(const invalid of [rows.slice(0,2),[...rows.slice(0,2),row('d',100,{condition:'new'})],[...rows.slice(0,2),row('d',100,{title:'Samsung S24 Ultra 256 Go',model:'S24 Ultra'})],[...rows.slice(0,2),row('d',100,{title:'Samsung S25 256 Go',model:'S25'})],[...rows.slice(0,2),row('d',100,{title:'Samsung S25 Ultra 128 Go'})],[rows[0],rows[0],rows[1]]])expect(suggestSalePrice(d,invalid)).toBeUndefined();
 });
});
