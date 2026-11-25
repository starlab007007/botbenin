import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {beforeEach, afterEach, it, expect} from 'vitest';
import {ProductGallery} from '../WaouhProductPresentation';
let host:HTMLDivElement,root:Root;
const photos=Array.from({length:6},(_,i)=>`https://images.example/product-a-${i}.jpg`);
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('offers the complete gallery with thumbnails, next/previous and correct wrapping',async()=>{
 await act(async()=>root.render(<ProductGallery photos={photos} title="Produit A" detail/>));
 expect(host.querySelector('.wpp-counter')?.textContent).toBe('1 / 6');expect(host.querySelectorAll('[aria-pressed]')).toHaveLength(6);
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Afficher la photo 6"]')!.click());
 expect(host.querySelector('.wpp-counter')?.textContent).toBe('6 / 6');expect(host.querySelector('.wpp-hero img')?.getAttribute('src')).toBe(photos[5]);
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Photo suivante"]')!.click());
 expect(host.querySelector('.wpp-counter')?.textContent).toBe('1 / 6');
});
it('resets the selection when the product changes, without leaking the preceding gallery',async()=>{
 await act(async()=>root.render(<ProductGallery photos={photos} title="Produit A" detail/>));
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Afficher la photo 6"]')!.click());
 await act(async()=>root.render(<ProductGallery photos={['https://images.example/b.jpg']} title="Produit B" detail/>));
 expect(host.querySelector('.wpp-counter')?.textContent).toBe('1 / 1');expect(host.innerHTML).not.toContain('product-a-');
 expect(host.querySelector('.wpp-hero img')?.getAttribute('src')).toBe('https://images.example/b.jpg');
});
it('keeps the other pictures reachable when one picture cannot load',async()=>{
 await act(async()=>root.render(<ProductGallery photos={photos} title="Produit A" detail/>));
 await act(async()=>host.querySelector('.wpp-hero img')!.dispatchEvent(new Event('error')));
 expect(host.textContent).toContain('Photo indisponible');
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Photo suivante"]')!.click());
 expect(host.querySelector('.wpp-hero img')?.getAttribute('src')).toBe(photos[1]);
});
