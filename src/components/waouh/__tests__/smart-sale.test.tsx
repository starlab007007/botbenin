import React from 'react';
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let container:HTMLDivElement,root:Root;
const render=(node:React.ReactNode)=>{container=document.createElement('div');document.body.append(container);root=createRoot(container);act(()=>root.render(node));return{container};};
const cleanup=()=>{if(root)act(()=>root.unmount());container?.remove();};
const screen={getByLabelText:(name:string)=>container.querySelector(`[aria-label="${name}"]`)! as HTMLInputElement,getByText:(text:string)=>Array.from(container.querySelectorAll('button,small,span')).find(e=>e.textContent===text)!};
const fireEvent={click:(node:Element)=>act(()=>node.dispatchEvent(new MouseEvent('click',{bubbles:true}))),change:(node:Element,event:any)=>act(()=>{if(event.target.files)Object.defineProperty(node,'files',{configurable:true,value:event.target.files});else Object.getOwnPropertyDescriptor(node instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value')!.set!.call(node,event.target.value);node.dispatchEvent(new Event(node instanceof HTMLSelectElement?'change':'input',{bubbles:true}));if(event.target.files)node.dispatchEvent(new Event('change',{bubbles:true}));})};
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {WaouhSmartSale} from '../WaouhSmartSale';
import {WaouhCityField} from '../WaouhCityField';
const mocks=vi.hoisted(()=>({analyze:vi.fn(),publish:vi.fn(),upload:vi.fn(),invoke:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'owner-a'}})}));
vi.mock('@/lib/waouh/smartSale',async()=>({...await vi.importActual<any>('@/lib/waouh/smartSale'),analyzeSale:mocks.analyze,publishSale:mocks.publish}));
vi.mock('@/lib/imageOptimize',()=>({compressImage:async(f:File)=>f,uploadOptions:()=>({})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke},storage:{from:()=>({upload:mocks.upload,getPublicUrl:(path:string)=>({data:{publicUrl:'https://project.supabase.co/storage/v1/object/public/waouh-uploads/'+path}})})}}}));
beforeEach(()=>{vi.useFakeTimers();mocks.analyze.mockReset().mockResolvedValue({suggestions:{}});mocks.publish.mockReset();mocks.upload.mockReset().mockResolvedValue({error:null});mocks.invoke.mockReset();});
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('compact sale composer',()=>{
 it('keeps the committed sale when navigation fails and retries navigation without publishing twice',async()=>{
  const done=vi.fn().mockImplementationOnce(()=>{throw new Error('navigation');});
  mocks.publish.mockImplementation(async(_owner,draft)=>({draft,article:{...draft,id:'article-a',article_id:'article-a'}}));
  render(<WaouhSmartSale onPublished={done} initial={{title:'Samsung S25',price:350000,condition:'good',city:'Cotonou'}}/>);
  await act(async()=>{fireEvent.click(screen.getByText('Publier et trouver'));});
  expect(container.textContent).toContain('Annonce publiée');
  expect(container.textContent).not.toContain('Publication non terminée');
  await act(async()=>{fireEvent.click(screen.getByText('Reprendre la recherche'));});
  expect(mocks.publish).toHaveBeenCalledTimes(1);expect(done).toHaveBeenCalledTimes(2);
 });
 it('preserves confirmed price and condition when reopening a published product',async()=>{
  mocks.analyze.mockResolvedValue({suggestions:{condition:'fair',price:{value:100000,low:90000,high:110000,observations:3}}});
  render(<WaouhSmartSale onPublished={()=>{}} initial={{title:'Samsung S25',price:350000,condition:'good',city:'Cotonou'}}/>);
  await act(async()=>{vi.advanceTimersByTime(700);});
  expect(screen.getByLabelText('Prix souhaité').value.replace(/\D/g,'')).toBe('350000');
  expect(screen.getByLabelText('État du produit')).toHaveValue('good');
 });
 it('caps multiple selection at four and publishes the visible facts only on a click',async()=>{
  const done=vi.fn();mocks.publish.mockImplementation(async(_owner,draft)=>({draft,article:{...draft,id:'article-a',article_id:'article-a'}}));
  const {container}=render(<WaouhSmartSale onPublished={done} initial={{title:'Samsung S25',price:350000,condition:'good',city:'Cotonou'}}/>);
  await act(async()=>{fireEvent.change(container.querySelector('input[multiple]')!,{target:{files:Array.from({length:6},(_,i)=>new File(['image'],'p'+i+'.jpg',{type:'image/jpeg'}))}});});
  expect(mocks.upload).toHaveBeenCalledTimes(4);expect(screen.getByText('4 / 4 photos')).toBeTruthy();
  await act(async()=>{vi.advanceTimersByTime(700);});expect(mocks.publish).not.toHaveBeenCalled();
  await act(async()=>{fireEvent.click(screen.getByText('Publier et trouver'));});
  expect(mocks.publish).toHaveBeenCalledWith('owner-a',expect.objectContaining({price:350000,condition:'good',city:'Cotonou',photos:expect.any(Array)}));expect(mocks.publish.mock.calls[0][1].photos).toHaveLength(4);expect(done).toHaveBeenCalledTimes(1);
 });
 it('keeps manual edits against late intelligent suggestions',async()=>{
  let resolve!:(v:any)=>void;mocks.analyze.mockImplementation(()=>new Promise(r=>{resolve=r;}));
  render(<WaouhSmartSale onPublished={()=>{}} initial={{title:'Samsung S25',city:'Cotonou'}}/>);
  await act(async()=>{vi.advanceTimersByTime(700);});
  fireEvent.change(screen.getByLabelText('Prix souhaité'),{target:{value:'300000'}});
  fireEvent.change(screen.getByLabelText('État du produit'),{target:{value:'good'}});
  fireEvent.change(screen.getByLabelText('Ville ou quartier'),{target:{value:'Parakou'}});
  await act(async()=>{vi.advanceTimersByTime(700);});
  await act(async()=>{resolve({suggestions:{condition:'new',city:'Cotonou',price:{value:400000,low:380000,high:410000,observations:3}}});});
  expect((screen.getByLabelText('Prix souhaité') as HTMLInputElement).value.replace(/\D/g,'')).toBe('300000');expect(screen.getByLabelText('État du produit')).toHaveValue('good');expect(screen.getByLabelText('Ville ou quartier')).toHaveValue('Parakou');
 });
 it('clears obsolete inferred facts when the product changes',()=>{
  render(<WaouhSmartSale onPublished={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Produit à vendre'),{target:{value:'Moto neuve 650000 FCFA'}});
  expect(screen.getByLabelText('État du produit')).toHaveValue('new');
  fireEvent.change(screen.getByLabelText('Produit à vendre'),{target:{value:'Samsung S25'}});
  expect(screen.getByLabelText('Prix souhaité')).toHaveValue('');expect(screen.getByLabelText('État du produit')).toHaveValue('');
 });
 it('never replaces a manually chosen place with a delayed GPS result',async()=>{
  let gps!:(v:any)=>void;Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(success:any)=>{gps=success;}}});
  mocks.invoke.mockResolvedValue({data:{city:'Cotonou',district:'Fidjrossè'}});
  const changed=vi.fn(),coords=vi.fn();render(<WaouhCityField value="" onChange={changed} onCoordinatesChange={coords} autoLocate={false}/>);
  fireEvent.click(screen.getByLabelText('Utiliser ma position'));fireEvent.change(screen.getByLabelText('Ville ou quartier'),{target:{value:'Parakou'}});
  await act(async()=>{gps({coords:{latitude:6.37,longitude:2.39}});});
  expect(changed).toHaveBeenCalledTimes(1);expect(changed).toHaveBeenLastCalledWith('Parakou');expect(coords).toHaveBeenLastCalledWith(null);
 });
});
