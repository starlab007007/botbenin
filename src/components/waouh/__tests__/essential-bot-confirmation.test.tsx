import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
const api=vi.hoisted(()=>({create:vi.fn(),start:vi.fn()}));
vi.mock('@/lib/waouh/nexus',()=>({createNexusMandate:api.create,startNexusOpportunity:api.start,listNexusOwnedArticles:vi.fn()}));
import { WaouhBotNextStep } from '../WaouhBotNextStep';
it('opening the setup and pressing launch do not send anything before explicit confirmation',async()=>{
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;api.create.mockReset();api.start.mockReset();api.create.mockResolvedValue({mandate:{id:'mandate'}});api.start.mockResolvedValue({journey:{id:'journey'}});
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try{
    await act(async()=>root.render(<MemoryRouter><WaouhBotNextStep mode="buy" goal="Stylo" results={[{fabric_id:'original:a'} as any]} originSurface="test"/></MemoryRouter>));
    const click=async(label:string)=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent?.trim().startsWith(label));expect(b).toBeTruthy();await act(async()=>b!.click());};
    expect(document.body.textContent).not.toContain('Réglages avancés');await click('Confier à Bot');expect(api.create).not.toHaveBeenCalled();
    await click('Lancer la démarche');expect(api.create).not.toHaveBeenCalled();expect(api.start).not.toHaveBeenCalled();
    await click('Confirmer : 1 contact max');expect(api.create).toHaveBeenCalledWith(expect.objectContaining({max_contacts:1,allow_whatsapp:false}));expect(api.start).toHaveBeenCalledWith('original:a','buy','mandate');
  }finally{await act(async()=>root.unmount());host.remove();}
});

it('never shows success when every offer fails, and reuses the mandate on retry',async()=>{
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;api.create.mockReset();api.start.mockReset();
  api.create.mockResolvedValue({mandate:{id:'mandate'}});api.start.mockRejectedValue(new Error('offline'));
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  const click=async(label:string)=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent?.trim().startsWith(label));expect(b).toBeTruthy();await act(async()=>b!.click());};
  try {
    await act(async()=>root.render(<MemoryRouter><WaouhBotNextStep mode="buy" goal="Stylo" results={[{fabric_id:'original:a'} as any]} originSurface="test"/></MemoryRouter>));
    await click('Confier à Bot');await click('Lancer la démarche');await click('Confirmer : 1 contact max');
    expect(document.querySelector('[aria-label="Bot est lancé"]')).toBeNull();
    expect(document.body.textContent).toContain('Aucune offre n’a pu être prise en charge');
    api.start.mockResolvedValue({journey:{id:'journey'}});
    await click('Lancer la démarche');await click('Confirmer : 1 contact max');
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[aria-label="Bot est lancé"]')).not.toBeNull();
  } finally {await act(async()=>root.unmount());host.remove();}
});

it('reports partial success and rejects malformed successful responses',async()=>{
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;api.create.mockReset();api.start.mockReset();
  api.create.mockResolvedValue({mandate:{id:'mandate'}});
  api.start.mockResolvedValueOnce({journey:{id:'journey'}}).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  const click=async(label:string)=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent?.trim().startsWith(label));expect(b).toBeTruthy();await act(async()=>b!.click());};
  try {
    await act(async()=>root.render(<MemoryRouter><WaouhBotNextStep mode="buy" goal="Stylo" results={['a','b','c'].map(id=>({fabric_id:id}) as any)} originSurface="test"/></MemoryRouter>));
    await click('Confier à Bot');await click('Lancer la démarche');await click('Confirmer : 3 contacts max');
    expect(document.body.textContent).toContain('1 offre prise en charge');
    expect(document.body.textContent).toContain('2 offre(s) non prise(s) en charge');
  } finally {await act(async()=>root.unmount());host.remove();}
});
