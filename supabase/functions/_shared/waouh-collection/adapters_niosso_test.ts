import {assertEquals} from 'jsr:@std/assert@1';
import {detailUrl} from './adapters.ts';
Deno.test('Niosso: une annonce est une fiche, une page de catégorie non',()=>{
  assertEquals(detailUrl(new URL('https://niosso.com/bj/annonces/cotonou/toyota-fj-cruiser-1770')),true);
  assertEquals(detailUrl(new URL('https://niosso.com/bj/annonces/categories/vehicule-13')),false);
});
