import type { GuidedKind } from './guidedAsk';
import type { MissionKind } from './guidedDiscovery';
export function offerJourney(kind: GuidedKind | undefined, entity: string): MissionKind {
  if (kind === 'vendre') return 'sale';
  if (entity === 'announcement' || kind === 'opportunite') return 'opportunity';
  if (kind === 'prestation') return 'project';
  if (entity === 'service' || kind === 'service') return 'service';
  return 'purchase';
}
export function journeyCopy(kind: MissionKind, guided?: GuidedKind) {
  if(kind==='sale') return {manual:'Contacter l’acheteur',bot:'Confier la vente',other:'Acheteurs',price:'Budget annoncé'};
  if(kind==='opportunity') return {manual:'Postuler',bot:'Suivre l’opportunité',other:'Opportunités',price:'Conditions'};
  if(kind==='service') return {manual:'Demander un devis',bot:'Confier à Bot',other:'Services',price:'Tarif annoncé'};
  if(kind==='project') return {manual:'Discuter du projet',bot:'Confier à Bot',other:'Prestataires',price:'Devis annoncé'};
  if(guided==='trouver'||guided==='demander') return {manual:'Voir la piste',bot:'Confier à Bot',other:'Autres pistes',price:'Prix annoncé'};
  return {manual:'Je prends',bot:'Confier à Bot',other:'Autres offres',price:'Prix annoncé'};
}
