import {describe,expect,it} from 'vitest';
import {termLabel,termValue} from '../dealTerms';

describe('dealTerms',()=>{
 it('traduit les conditions de remise sans exposer le nom interne',()=>{
  expect(termLabel('delivery_address')).toBe('Adresse de livraison');
  expect(termLabel('cle_inconnue')).toBe('Condition');
  expect(termValue('delivery_mode','delivery')).toBe('Livraison par un livreur');
  expect(termValue('delivery_mode','pickup')).toBe('Retrait en main propre');
  expect(termValue('delivery_fee',1500)).toMatch(/^1\s?500 F$/u);
 });
});

import {pollDelay} from '../dealRoom';
describe('pollDelay',()=>{
 it('accélère quand Bot ou un livreur agit et ralentit quand tout est terminé',()=>{
  expect(pollDelay(null)).toBe(10000);
  expect(pollDelay({control_mode:'bot'})).toBe(3000);
  expect(pollDelay({agreement:{status:'accepted',terms:{delivery_mode:'delivery'}},delivery:{status:'assigned'}})).toBe(5000);
  expect(pollDelay({agreement:{status:'accepted',terms:{delivery_mode:'delivery'}},delivery:{status:'delivered'}})).toBe(10000);
  expect(pollDelay({closed:true})).toBe(60000);
 });
});
