// Données statiques Bénin pour autocomplete ville/quartier + listes intelligentes
export type CityData = { ville: string; quartiers: string[] };

export const BENIN_CITIES: CityData[] = [
  { ville: 'Cotonou', quartiers: ['Cadjèhoun', 'Akpakpa', 'Fidjrossè', 'Gbégamey', 'Sainte-Rita', 'Ganhi', 'Jéricho', 'Cocotomey', 'Vodjè', 'Agla', 'Houéyiho', 'Zongo', 'Dantokpa', 'Missebo', 'Sègbéya', 'Mènontin', 'Sikècodji', 'Tokpa-Hoho', 'Akogbato', 'Vèdoko'] },
  { ville: 'Abomey-Calavi', quartiers: ['Godomey', 'Kpota', 'Zogbadjè', 'Tankpè', 'Aïbatin', 'Calavi-Centre', 'Tokan', 'Hêvié', 'Akassato', 'Cocotomey', 'Womey', 'Glo-Djigbé'] },
  { ville: 'Porto-Novo', quartiers: ['Akron', 'Djassin', 'Houinmè', 'Tokpota', 'Ouando', 'Avassa', 'Dowa', 'Kandèvié', 'Catchi', 'Foun-Foun'] },
  { ville: 'Parakou', quartiers: ['Banikanni', 'Titirou', 'Zongo', 'Wansirou', 'Tourou', 'Kpébié', 'Ladji-Farani'] },
  { ville: 'Djougou', quartiers: ['Centre', 'Bariénou', 'Sérou', 'Pélébina'] },
  { ville: 'Bohicon', quartiers: ['Centre', 'Agbangnizoun', 'Zakpota'] },
  { ville: 'Lokossa', quartiers: ['Centre', 'Athiémé', 'Houin'] },
  { ville: 'Kandi', quartiers: ['Centre', 'Sam', 'Angaradébou'] },
  { ville: 'Natitingou', quartiers: ['Centre', 'Pèporiyakou', 'Kouandata'] },
  { ville: 'Ouidah', quartiers: ['Centre', 'Tovè', 'Pahou', 'Avlékété'] },
  { ville: 'Abomey', quartiers: ['Centre', 'Djèkpota', 'Vidolè'] },
  { ville: 'Sèmè-Kpodji', quartiers: ['Sèmè', 'Kpodji', 'Ekpè', 'Agblangandan'] },
  { ville: 'Allada', quartiers: ['Centre', 'Sékou', 'Lissègazoun'] },
  { ville: 'Comè', quartiers: ['Centre', 'Akodéha'] },
  { ville: 'Aplahoué', quartiers: ['Centre', 'Azovè'] },
  { ville: 'Dassa-Zoumè', quartiers: ['Centre', 'Paouignan'] },
  { ville: 'Savalou', quartiers: ['Centre', 'Logozohè'] },
  { ville: 'Savè', quartiers: ['Centre', 'Adido'] },
  { ville: 'Tchaourou', quartiers: ['Centre', 'Alafiarou'] },
  { ville: 'Nikki', quartiers: ['Centre', 'Sérékali'] },
  { ville: 'Malanville', quartiers: ['Centre', 'Garou'] },
  { ville: 'Tanguiéta', quartiers: ['Centre', 'Cotiakou'] },
  { ville: 'Banikoara', quartiers: ['Centre'] },
  { ville: 'Pobè', quartiers: ['Centre', 'Issaba'] },
  { ville: 'Sakété', quartiers: ['Centre', 'Itassoumba'] },
  { ville: 'Adjarra', quartiers: ['Centre'] },
  { ville: 'Aguégués', quartiers: ['Avagbodji', 'Zoungamè'] },
  { ville: 'Grand-Popo', quartiers: ['Centre', 'Hêvé'] },
  { ville: 'Athiémé', quartiers: ['Centre'] },
];

export const BENIN_CITY_NAMES = BENIN_CITIES.map(c => c.ville);
export const BENIN_CITY_INDEX = new Map(BENIN_CITIES.map(c => [c.ville.toLowerCase(), c]));

export function getQuartiersForCity(ville: string): string[] {
  const c = BENIN_CITY_INDEX.get((ville || '').toLowerCase());
  return c?.quartiers || [];
}

export const BUSINESS_CATEGORIES = [
  'Maquis', 'Restaurant', 'Bar / Buvette', 'Pâtisserie', 'Boulangerie',
  'Boutique mode', 'Boutique cosmétiques', 'Boutique électronique',
  'Salon de coiffure', 'Salon de beauté', 'Spa / Massage',
  'Supérette / Alimentation', 'Boucherie', 'Poissonnerie',
  'Pharmacie', 'Clinique / Cabinet', 'Quincaillerie', 'Matériaux de construction',
  'Garage / Mécanique', 'Lavage auto', 'Station-service',
  'Hôtel', 'Auberge', 'Location de voitures', 'Transport / Taxi',
  'Atelier couture', 'Cordonnerie', 'Menuiserie', 'Soudure / Métallerie',
  'Imprimerie', 'Photo / Vidéo', 'Cyber-café',
  'École / Formation', 'Crèche / Garderie',
  'Agence immobilière', 'Agence de voyage', 'Bureau de change',
  'Marché / Grossiste', 'Vendeur ambulant', 'Autre commerce',
];

export const PRODUCT_UNITS = [
  'pièce', 'unité', 'kg', 'g', 'sac', 'sachet', 'paquet', 'carton',
  'litre', 'cl', 'bouteille', 'canette', 'verre',
  'plat', 'assiette', 'portion', 'menu',
  'mètre', 'm²', 'rouleau', 'lot', 'douzaine', 'demi-douzaine',
  'heure', 'jour', 'séance', 'forfait',
];

export const MOMO_OPERATORS = [
  { value: 'MTN', label: 'MTN Mobile Money', color: '#FFCC00' },
  { value: 'Moov', label: 'Moov Money', color: '#009FE3' },
  { value: 'Celtiis', label: 'Celtiis Cash', color: '#E30613' },
];
