import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
const api=vi.hoisted(()=>({create:vi.fn(),start:vi.fn()}));
vi.mock('@/lib/waouh/nexus',()=>({createNexusMandate:api.create,startNexusOpportunity:api.start,listNexusOwnedArticles:vi.fn()}));
import { WaouhBotNextStep } from '../WaouhBotNextStep';
it('opening the setup and pressing launch do not send anything before explicit confirmation',async()=>{
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;api.create.mockResolvedValue({mandate:{id:'mandate'}});api.start.mockResolvedValue({});
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try{
    await act(async()=>root.render(<MemoryRouter><WaouhBotNextStep mode="buy" goal="Stylo" results={[{fabric_id:'original:a'} as any]} originSurface="test"/></MemoryRouter>));
    const click=async(label:string)=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent?.trim().startsWith(label));expect(b).toBeTruthy();await act(async()=>b!.click());};
    expect(document.body.textContent).not.toContain('Réglages avancés');await click('Confier à Bot');expect(api.create).not.toHaveBeenCalled();
    await click('Lancer la démarche');expect(api.create).not.toHaveBeenCalled();expect(api.start).not.toHaveBeenCalled();
    await click('Confirmer : 1 contact max');expect(api.create).toHaveBeenCalledWith(expect.objectContaining({max_contacts:1,allow_whatsapp:false}));expect(api.start).toHaveBeenCalledWith('original:a','buy','mandate');
  }finally{await act(async()=>root.unmount());host.remove();}
});
