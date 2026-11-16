import { describe, expect, it } from 'vitest';
import { matchVerdict, needDomain, signalDomain } from '../../../../supabase/functions/_shared/waouh-need-domain';
import { briefMatch, chatMarketBrief, plausiblePrices } from '../chatMarketBrief';

const phone = { subject: 'Galaxy S25 - Cell Phones - Cotonou, Benin', category: 'Smartphone', brand: 'Samsung', model: 'S25' };

describe('domaine du besoin : un emploi n’est pas un téléphone', () => {
  it('reconnaît le domaine à partir des mots', () => {
    expect(needDomain('un travail de secrétaire')).toBe('job');
    expect(needDomain('maison à louer')).toBe('property');
    expect(needDomain('moto occasion')).toBe('vehicle');
    expect(needDomain('plombier pour une fuite')).toBe('service');
    expect(signalDomain(phone)).toBe('goods');
  });

  it('refuse les rapprochements entre domaines différents', () => {
    expect(matchVerdict('Je cherche une opportunité : un travail de secrétaire', phone).acceptable).toBe(false);
    expect(matchVerdict('Je vends : ventilateur', { subject: 'gommage corps et visage' }).acceptable).toBe(false);
    expect(matchVerdict('Je vends : ventilateur', { subject: 'Je cherche un travail de secrétaire' }).acceptable).toBe(false);
  });

  it('garde les vrais rapprochements et distingue le modèle demandé', () => {
    expect(matchVerdict('Je cherche un Galaxy S25', phone).exact).toBe(true);
    expect(matchVerdict('iPhone 13', { subject: 'iphone 11' }).exact).toBe(false);
    expect(matchVerdict('plombier à Cotonou', { subject: 'Plomberie et dépannage' }).acceptable).toBe(true);
  });
});

describe('repère de prix', () => {
  it('écarte un prix isolé manifestement faux', () => {
    expect(plausiblePrices([1, 24000, 25000, 26000])).toEqual([24000, 25000, 26000]);
    expect(plausiblePrices([24000, 25000])).toEqual([24000, 25000]);
  });

  it('ne présente pas une offre hors sujet comme proche', () => {
    const card = (id: string, title: string, price: number) => ({ id, fabric_id: id, title, price, city: 'Cotonou' }) as never;
    const brief = chatMarketBrief([card('a', 'Galaxy S25', 25000)], { query: 'un travail de secrétaire' });
    expect(briefMatch(card('a', 'Galaxy S25', 25000), 'un travail de secrétaire')).toBe('near');
    expect(brief.exact).toBe(0);
  });
});

describe('mots de gabarit', () => {
  it('« opportunité » venu de la phrase générée ne rapproche rien', () => {
    expect(matchVerdict('Je cherche une opportunité : un travail de secrétaire à Abomey-Calavi', {
      subject: 'Galaxy S25 - Cell Phones', raw_text: "ventes achats et opportunités d'affaires au Bénin",
    }).acceptable).toBe(false);
    expect(matchVerdict('Je cherche une opportunité : un stage en informatique', { subject: 'Stage informatique · assistant' }).acceptable).toBe(true);
  });
});

describe('la ville ne prouve rien', () => {
  it('une annonce de la même ville ne répond pas pour autant au besoin', () => {
    const place = 'Abomey-Calavi';
    expect(matchVerdict('Je cherche une opportunité : un travail de secrétaire à Abomey-Calavi',
      { subject: 'Galaxy S25 - Cell Phones - Cotonou, Benin', city: place }, { place }).acceptable).toBe(false);
    expect(matchVerdict('Je cherche une opportunité : un poste de secrétaire à Abomey-Calavi',
      { subject: 'Secrétaire administrative', city: place }, { place }).acceptable).toBe(true);
    expect(matchVerdict('Je cherche un Galaxy S25 à Cotonou',
      { subject: 'Galaxy S25 - Cell Phones', city: 'Cotonou' }, { place: 'Cotonou' }).acceptable).toBe(true);
  });
});
