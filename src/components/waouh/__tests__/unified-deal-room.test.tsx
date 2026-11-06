import {act} from 'react';
import {createRoot,Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {Simulate} from 'react-dom/test-utils';
const mocks=vi.hoisted(()=>({call:vi.fn(),search:vi.fn()}));
vi.mock('@/lib/waouh/dealRoom',()=>({roomCall:mocks.call}));
vi.mock('@/lib/waouh/progressiveDiscovery',()=>({progressiveNexusDiscovery:mocks.search}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'owner'}})}));
vi.mock('@/components/waouh/bot/BotLiveAvatar',()=>({BotLiveAvatar:()=> <span>Avatar WAOUH</span>}));
vi.mock('@/components/waouh/WaouhProductPresentation',()=>({ProductGallery:()=> <span>Photo</span>}));
import guideCases from '../../../../tests/fixtures/waouh-room-guidance.json';
import Page from '@/pages/waouh/WaouhDealRoomPage';
let host:HTMLDivElement,root:Root;
const base={deal_room_id:'room',is_owner:true,title:'Téléphone',price:150000,city:'Cotonou',provider_joined:true,control_mode:'bot',mandate_revision:2,current_offer_version:3,messages:[{id:'one',text:'Bonjour',mine:true,author_kind:'bot'}],allowed_actions:['delegate','takeover','message','propose','accept','reject'],agreement:{version:3,status:'proposed',terms:{amount:145000,scope:'Téléphone',quantity:1,deadline:'Demain',exclusions:'Livraison',expected_result:'Testé',payment:'À la remise'}}};
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;mocks.call.mockReset();mocks.search.mockReset();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
async function mount(path='/?room_id=room'){await act(async()=>root.render(<MemoryRouter initialEntries={[path]}><Page/></MemoryRouter>));}
async function click(text:string){const button=[...host.querySelectorAll('button')].find(b=>b.textContent?.trim()===text);expect(button).toBeTruthy();await act(async()=>button!.click());}
// The receipt confirmation opens a small panel (optional note/photo) before submitting,
// so its submit button shares the same label as the button that opened the panel.
async function confirmReceiptPanel(text:string){const sheet=host.querySelector('.wr-sheet');expect(sheet).toBeTruthy();const button=[...sheet!.querySelectorAll('button')].find(b=>b.textContent?.trim()===text);expect(button).toBeTruthy();await act(async()=>button!.click());}
it('takes over the same room before allowing a manual message, keeping the history',async()=>{
 let current={...base};mocks.call.mockImplementation(async(action)=>{if(action==='takeover')current={...current,control_mode:'manual',mandate_revision:3};return current;});
 await mount();expect(host.querySelector('textarea')).toBeNull();
 await click('Reprendre la main');expect(mocks.call).toHaveBeenCalledWith('takeover',{deal_room_id:'room',mandate_revision:2});
 expect(host.textContent).toContain('Bonjour');const field=host.querySelector('textarea')!;
 await act(async()=>{field.value='Je reprends cet échange';Simulate.change(field);});await click('Envoyer');
 expect(mocks.call).toHaveBeenCalledWith('message',{deal_room_id:'room',text:'Je reprends cet échange'});
});
it('confirms the exact offer version and never infers bilateral agreement',async()=>{
 mocks.call.mockResolvedValue(base);await mount();
 expect(host.textContent).toContain('Accord à confirmer');await click('Confirmer ces conditions');
 expect(mocks.call).toHaveBeenCalledWith('accept',{deal_room_id:'room',version:3});
 expect(host.textContent).not.toContain('Accord confirmé');
});
it('allows the seller to reply while the buyer is represented by Bot',async()=>{
 mocks.call.mockResolvedValue({...base,is_owner:false,mandate:null});await mount();
 expect(host.querySelector('textarea')).not.toBeNull();expect(host.textContent).not.toContain('Reprendre la main');
 expect(host.textContent).toContain('Proposer un prix / des conditions');
});
it('uses the selected search reference for delegation without contacting before confirmation',async()=>{
 mocks.call.mockImplementation(async(action)=>action==='list'?{rooms:[]}:base);
 const offer={fabric_id:'article:selected',subject:'Téléphone',city:'Cotonou',price_min:150000};
 mocks.search.mockImplementation(async(_,indexed)=>{indexed({results:[offer]});return {results:[offer]};});
 await mount('/?q=Téléphone');await click('Rechercher');await click('Confier à Bot');
 expect(mocks.call).toHaveBeenCalledWith('open',expect.objectContaining({fabric_id:'article:selected',confirmed:false}));
 expect(mocks.call.mock.calls.some(c=>c[0]==='delegate')).toBe(false);
});

it('opens a new room without an agreement or invented confirmation',async()=>{
 mocks.call.mockResolvedValue({...base,agreement:null,current_offer_version:0});await mount();
 expect(host.textContent).toContain('Le prix et les conditions seront confirmés');
 expect(host.textContent).not.toContain('Accord confirmé');
});

it('keeps buyer closure pending until evidence and the other participant confirm',async()=>{
 let current:any={...base,buyer:true,control_mode:'manual',allowed_actions:['receipt','payment_report'],evidence:{},agreement:{...base.agreement,status:'accepted',owner_accepted_at:'ok',provider_accepted_at:'ok'}};
 mocks.call.mockImplementation(async(action)=>{
  if(action==='receipt')current={...current,evidence:{...current.evidence,receipt_at:'ok'},allowed_actions:['payment_report']};
  if(action==='payment_report')current={...current,evidence:{...current.evidence,payment_reported_at:'ok'},allowed_actions:[]};
  if(action==='complete')current={...current,agreement:{...current.agreement,owner_completed_at:'ok'},allowed_actions:[]};
  return current;
 });
 await mount();expect(host.textContent).not.toContain('Confirmer la clôture');
 await click('Confirmer la réception');await confirmReceiptPanel('Confirmer la réception');await click('J’ai effectué le paiement');
 expect(host.textContent).not.toContain('Confirmer la clôture');
 current={...current,evidence:{...current.evidence,payment_received_at:'ok'},allowed_actions:['complete']};
 await click('Actualiser');await click('Confirmer la clôture');
 expect(mocks.call).toHaveBeenCalledWith('complete',{deal_room_id:'room',version:3});
 expect(host.textContent).not.toContain('Échange clôturé');
 current={...current,agreement:{...current.agreement,status:'completed',provider_completed_at:'ok'},closed:true,allowed_actions:['rating']};
 await click('Actualiser');expect(host.textContent).toContain('Échange clôturé');
 await click('5 ★');expect(mocks.call).toHaveBeenCalledWith('rating',{deal_room_id:'room',rating:5});
});
it('lets the seller confirm receipt of the declared payment and finish bilateral closure',async()=>{
 let current:any={...base,is_owner:false,control_mode:'manual',allowed_actions:['payment_receive'],evidence:{receipt_at:'ok',payment_reported_at:'ok'},agreement:{...base.agreement,status:'accepted',owner_accepted_at:'ok',provider_accepted_at:'ok',owner_completed_at:'ok'}};
 mocks.call.mockImplementation(async(action)=>{
  if(action==='payment_receive')current={...current,evidence:{...current.evidence,payment_received_at:'ok'},allowed_actions:['complete']};
  if(action==='complete')current={...current,agreement:{...current.agreement,status:'completed',provider_completed_at:'ok'},closed:true,allowed_actions:['rating']};
  return current;
 });
 await mount();await click('J’ai reçu le paiement');await click('Confirmer la clôture');
 expect(mocks.call).toHaveBeenCalledWith('payment_receive',{deal_room_id:'room',version:3});
 expect(host.textContent).toContain('Échange clôturé');
});

it('lets the publisher answer a transmitted application once, which concludes the opportunity',async()=>{
 let current:any={...base,is_owner:false,kind:'announcement',control_mode:'manual',agreement:null,current_offer_version:0,allowed_actions:['message','application_outcome'],evidence:{application_prepared_at:'ok',application_submitted_at:'ok'}};
 mocks.call.mockImplementation(async(action,p)=>{if(action==='application_outcome')current={...current,allowed_actions:['message'],evidence:{...current.evidence,application_outcome:p.outcome,application_outcome_note:p.text}};return current;});
 await mount();await click('Répondre au dossier');
 const note=host.querySelector('.wr-sheet textarea') as HTMLTextAreaElement;await act(async()=>{note.value='Entretien lundi';Simulate.change(note);});
 await click('Retenir ce dossier');
 expect(mocks.call).toHaveBeenCalledWith('application_outcome',{deal_room_id:'room',outcome:'retained',text:'Entretien lundi'});
 expect(host.querySelector('.wr-sheet')).toBeNull();
 expect(host.textContent).toContain('✓ Candidature retenue — Entretien lundi');
 expect([...host.querySelectorAll('button')].some(b=>b.textContent?.trim()==='Répondre au dossier')).toBe(false);
});

it('opens the price proposal on arrival from “Intéressé”, only when the other party can receive it',async()=>{
 mocks.call.mockResolvedValue({...base,control_mode:'manual',agreement:null,current_offer_version:0});
 await mount('/?room_id=room&offer=145000');
 expect(host.querySelector('[role=dialog]')?.getAttribute('aria-label')).toBe('Proposition');
 expect((host.querySelector('.wr-sheet input[type=number]') as HTMLInputElement).value).toBe('145000');
 await act(async()=>root.unmount());root=createRoot(host);
 mocks.call.mockResolvedValue({...base,control_mode:'manual',agreement:null,current_offer_version:0,provider_joined:false,allowed_actions:['invite']});
 await mount('/?room_id=room&propose=1');
 expect(host.querySelector('[role=dialog]')).toBeNull();
});

it('shows one primary task at a time from the server receipt and closure snapshots',async()=>{
 const state=(name:string)=>{const f=guideCases.find(f=>f.name===name)!;return {...base,buyer:true,...f.room,title:'Téléphone',current_offer_version:(f.room as any).agreement?.version??0,guidance:f.guidance};};
 let current=state('receipt');
 mocks.call.mockImplementation(async(action)=>{if(action==='receipt')current=state('payment_report');if(action==='payment_report')current=state('wait_payment');return current;});
 await mount();expect(host.querySelector('.wr-guide-task')?.textContent).toContain('Confirmer la réception');
 expect([...host.querySelectorAll('button')].filter(b=>b.textContent?.trim()==='Confirmer la réception')).toHaveLength(1);
 await click('Confirmer la réception');await confirmReceiptPanel('Confirmer la réception');expect(host.querySelector('.wr-guide-task')?.textContent).toContain('Déclarer le paiement effectué');
 await click('J’ai effectué le paiement');expect(host.querySelector('.wr-guide-task')?.textContent).toContain('Confirmation du paiement attendue');
 expect(host.querySelector('.wr-guide-action')).toBeNull();expect(host.textContent).not.toContain('Parcours terminé');
 current=state('completed');await click('Actualiser');expect(host.textContent).toContain('Parcours terminé');
});

it('freezes the reviewed version and requires another review if the server conditions change',async()=>{
 const fixture=guideCases.find(f=>f.name==='review')!;
 let current:any={...base,...fixture.room,title:'Téléphone',current_offer_version:2,guidance:fixture.guidance};
 mocks.call.mockImplementation(async()=>current);
 await mount();await click('Relire les conditions');
 expect(host.querySelector('[aria-label="Relire les conditions"]')?.textContent).toContain('Version 2');
 expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Confirmer ces conditions')!.disabled).toBe(false);
 current={...current,current_offer_version:3,agreement:{...current.agreement,version:3,terms:{amount:147000}}};
 await click('Actualiser');
 const confirm=[...host.querySelectorAll('button')].find(b=>b.textContent==='Confirmer ces conditions')!;
 expect(confirm.disabled).toBe(true);expect(host.textContent).toContain('Les conditions ont changé');
 expect(mocks.call.mock.calls.some(c=>c[0]==='accept')).toBe(false);
});
