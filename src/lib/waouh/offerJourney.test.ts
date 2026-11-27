import {describe,it,expect} from 'vitest';
import {offerJourney,journeyCopy} from './offerJourney';
describe('six guided journeys',()=>{
 it('distinguishes all six entry points',()=>{expect(journeyCopy(offerJourney('acheter','product')).manual).toBe('Je prends');expect(offerJourney('vendre','product')).toBe('sale');expect(journeyCopy(offerJourney('trouver','product'),'trouver').manual).toBe('Voir la piste');expect(offerJourney('opportunite','announcement')).toBe('opportunity');expect(offerJourney('service','service')).toBe('service');expect(offerJourney('prestation','service')).toBe('project');});
 it('uses the real entity for mixed search',()=>{expect(offerJourney('trouver','announcement')).toBe('opportunity');expect(offerJourney('trouver','service')).toBe('service');});
});
