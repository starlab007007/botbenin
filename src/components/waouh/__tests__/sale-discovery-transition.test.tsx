import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {WaouhGlobalDiscoveryPanel} from '../WaouhGlobalDiscoveryPanel';
import {newSaleDraft, saleSearchPath} from '@/lib/waouh/smartSale';

const mocks = vi.hoisted(() => ({search: vi.fn(), follow: vi.fn(), publish: vi.fn()}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: {id:'owner-a'}})}));
vi.mock('../bot/BotLiveAvatar', () => ({BotLiveAvatar: () => <span>Bot</span>}));
vi.mock('@/integrations/supabase/client', () => ({supabase:{functions:{invoke:vi.fn()}}}));
vi.mock('@/lib/waouh/nexus', async () => ({...await vi.importActual<any>('@/lib/waouh/nexus'),getNexusSources:async()=>({registry:[]})}));
vi.mock('@/lib/waouh/avatarAutonomy', () => ({loadAvatarAutonomy:async()=>({})}));
vi.mock('@/lib/waouh/automaticMission', async () => ({...await vi.importActual<any>('@/lib/waouh/automaticMission'),followAutomaticSearch:mocks.follow}));
vi.mock('@/lib/waouh/progressiveDiscovery', () => ({progressiveNexusDiscovery:mocks.search}));
vi.mock('@/lib/waouh/smartSale', async () => ({...await vi.importActual<any>('@/lib/waouh/smartSale'),analyzeSale:async()=>({suggestions:{}}),publishSale:mocks.publish}));
let host:HTMLDivElement,root:Root;
const sale = {draft:newSaleDraft({title:'Samsung S25',price:350000,condition:'good',city:'Cotonou',quantity:1.5,unit:'pièce'}),article:{id:'article-a',article_id:'article-a',title:'Samsung S25',price:350000,photos:[],city:'Cotonou'}};
beforeEach(()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);
 mocks.follow.mockReset().mockResolvedValue({skipped:'approval_required'});
 mocks.publish.mockReset().mockResolvedValue(sale);
 mocks.search.mockReset().mockResolvedValue({results:[],mode:'find_buyers',source_mix:{}});
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();sessionStorage.clear();});
it('opens a published sale, renders the product and starts the buyer search with its identity',async()=>{
 const path=saleSearchPath('owner-a',sale);
 await act(async()=>root.render(<MemoryRouter initialEntries={[path]}><WaouhGlobalDiscoveryPanel/></MemoryRouter>));
 expect(host.textContent).toContain('Mon article à vendre');
 expect(host.textContent).toContain('Samsung S25');
 expect(mocks.search).toHaveBeenCalledOnce();
 expect(mocks.search.mock.calls[0][0]).toMatchObject({query:'Samsung S25',mode:'find_buyers',mission_context:{quantity:1.5,unit:'pièce'}});
 expect(mocks.follow).toHaveBeenCalledWith('owner-a',expect.objectContaining({article_id:'article-a',discovery_kind:'sale'}));
});
it('keeps the published product available when the buyer search fails',async()=>{
 mocks.search.mockRejectedValue(new Error('network'));
 await act(async()=>root.render(<MemoryRouter initialEntries={[saleSearchPath('owner-a',sale)]}><WaouhGlobalDiscoveryPanel/></MemoryRouter>));
 expect(host.textContent).toContain('Samsung S25');
 expect(host.textContent).toContain('Recherche interrompue');
 expect(host.querySelector('[data-product-summary]')).not.toBeNull();
 expect(mocks.publish).not.toHaveBeenCalled();
});
it('still registers follow-up after a transient external failure, without republishing',async()=>{
 mocks.search.mockImplementation(async(_,onIndexed)=>{onIndexed({results:[],mode:'find_buyers'});throw new Error('quota');});
 await act(async()=>root.render(<MemoryRouter initialEntries={[saleSearchPath('owner-a',sale)]}><WaouhGlobalDiscoveryPanel/></MemoryRouter>));
 expect(host.textContent).toContain('Recherche externe indisponible');
 expect(mocks.follow).toHaveBeenCalledWith('owner-a',expect.objectContaining({article_id:'article-a'}));
 expect(mocks.publish).not.toHaveBeenCalled();
});
