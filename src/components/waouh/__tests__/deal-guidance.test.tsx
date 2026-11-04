import {act} from 'react';
import {createRoot,Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import cases from '../../../../tests/fixtures/waouh-room-guidance.json';
import {WaouhDealGuidance,searchGuidance} from '../WaouhDealGuidance';
let host:HTMLDivElement,root:Root;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
for(const fixture of cases)it(`renders canonical server guidance: ${fixture.name}`,async()=>{
 const callback=vi.fn(),g=fixture.guidance;
 await act(async()=>root.render(<WaouhDealGuidance guide={g} onAction={callback}/>));
 expect(host.querySelector('h2')?.textContent).toBe(g.title);
 expect(host.querySelectorAll('li[data-state=complete]')).toHaveLength(g.steps.filter(s=>s.state==='complete').length);
 expect(host.querySelectorAll('[aria-current=step]')).toHaveLength(g.steps.some(s=>['current','blocked'].includes(s.state))?1:0);
 if(g.action){await act(async()=>host.querySelector<HTMLButtonElement>('.wr-guide-action')!.click());expect(callback).toHaveBeenCalledWith(g.action);}
 else expect(host.querySelector('.wr-guide-action')).toBeNull();
 if(g.status!=='completed')expect(host.textContent).not.toContain('Parcours terminé');
});
it('keeps alternative payment confirmation available before receipt without fabricating completion',async()=>{
 const callback=vi.fn();await act(async()=>root.render(<WaouhDealGuidance guide={cases.find(f=>f.name==='receipt')!.guidance} onAction={callback}/>));
 const alt=host.querySelector<HTMLButtonElement>('.wr-guide-alternatives button')!;
 expect(alt.textContent).toBe('J’ai effectué le paiement');await act(async()=>alt.click());expect(callback).toHaveBeenCalledWith('payment_report');
});
it('disables task actions while a request is pending',async()=>{
 const callback=vi.fn();await act(async()=>root.render(<WaouhDealGuidance guide={cases.find(f=>f.name==='closure')!.guidance} busy onAction={callback}/>));
 await act(async()=>host.querySelector<HTMLButtonElement>('.wr-guide-action')!.click());expect(callback).not.toHaveBeenCalled();
});
it('shows a search in progress without ticking an offer that is not selected',async()=>{
 await act(async()=>root.render(<WaouhDealGuidance guide={searchGuidance(true,false)}/>));
 expect(host.textContent).toContain('Recherche en cours');expect(host.querySelectorAll('[data-state=complete]')).toHaveLength(0);
});
