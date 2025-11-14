export interface VisualVariant {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export const botbjVariants: VisualVariant[] = [
  {
    id: 'variant-a',
    name: 'Variante A - Focus Dashboard',
    description: 'Écran MacBook occupant 80% de l\'image, dashboard ultra-détaillé',
    prompt: `Créez une image marketing professionnelle ultra-réaliste pour BOT.BJ, plateforme béninoise d'automatisation intelligente.

COMPOSITION CENTRALE (FOCUS DASHBOARD - 80% de l'image) :
- MacBook Pro 16" argenté en vue frontale directe, écran occupant 80% de l'image
- Dashboard BOT.BJ ultra-détaillé et bien visible :
  * Header blanc épais avec logo "BOT.BJ" en bleu clair (#5DBBF5) à gauche, taille 48px
  * Sidebar gauche (fond blanc #FFFFFF, 250px de large) :
    - Section NAVIGATION avec 3 items : Home, Chat, Dashboards (icônes + texte en gris #6B7280)
    - Section MODULES IA avec 8 items verticaux, chaque module avec son icône colorée et nom :
      1. Kpakpato (WhatsApp vert #25D366)
      2. Mes Bots (robot bleu #3B82F6)
      3. Prospects (utilisateurs violet #8B5CF6)
      4. IA Business (mallette orange #F59E0B)
      5. IA Marketing (mégaphone rose #EC4899)
      6. IA Gestion (graphique vert #10B981)
      7. IA Citoyen (utilisateur bleu #3B82F6)
      8. IA Creator (palette arc-en-ciel multicolore)
  * Zone principale dashboard (fond gris clair #F3F4F6) :
    - 4 cartes statistiques colorées en haut (largeur 240px chacune) :
      1. "2,500 Leads" (fond bleu #3B82F6, icône utilisateurs)
      2. "1,200 Clients" (fond vert #10B981, icône check)
      3. "45 Campagnes" (fond violet #8B5CF6, icône fusée)
      4. "98% Success" (fond orange #F59E0B, icône étoile)
    - 3 graphiques courbes ascendantes (hauteur 300px) :
      1. Courbe verte #10B981 "Leads" (montée progressive)
      2. Courbe bleue #3B82F6 "Conversions" (montée forte)
      3. Courbe violette #8B5CF6 "Engagement" (montée régulière)
    - Tableau "BOTS ACTIFS" (5 lignes) :
      Colonnes : Nom | Type | Statut | Messages
      Ligne 1 : "Support Bot" | WhatsApp | "🟢 En ligne" | 1,247
      Ligne 2 : "Sales Bot" | Messenger | "🟢 En ligne" | 892
      Ligne 3 : "Marketing Bot" | Email | "🟢 En ligne" | 2,340
      Ligne 4 : "Service Bot" | Web | "🟢 En ligne" | 567
      Ligne 5 : "AI Assistant" | Multi | "🟢 En ligne" | 3,421

ICÔNES FLOTTANTES (petites, discrètes, autour de l'écran) :
- WhatsApp (vert #25D366) - Position : coin supérieur gauche, taille 50px, semi-transparent
- Messenger (bleu #0084FF) - Position : coin supérieur droit, taille 50px, semi-transparent
- Robot IA (violet #8B5CF6) - Position : bas centre, taille 60px, semi-transparent
- Lignes de connexion dorées (#F59E0B) très fines entre les icônes et l'écran

ARRIÈRE-PLAN (minimaliste) :
- Dégradé subtil : centre bleu ciel (#DBEAFE) vers bords bleu moyen (#93C5FD)
- Particules lumineuses blanches très discrètes
- Halo blanc-bleu doux derrière l'écran

TEXTE INTÉGRÉ :
- En haut : "BOT.BJ" en Poppins ExtraBold 80px, blanc avec ombre portée bleue
- Sous le logo : "Automatisation Intelligente Made in Bénin 🇧🇯" en Poppins Medium 26px, blanc
- En bas : Badge "Dashboard Ultra-Performant" en 16px bleu

STYLE VISUEL :
- Rendu 3D photoréaliste 4K, focus sur la lisibilité du dashboard
- Éclairage doux de face pour maximiser la visibilité de l'écran
- Tous les textes et graphiques bien nets et lisibles
- Ambiance : professionnelle, claire, moderne

COULEURS DOMINANTES :
- Bleu clair BOT.BJ (#5DBBF5) - 35%
- Blanc (#FFFFFF) - 30%
- Bleu électrique (#3B82F6) - 15%
- Vert (#10B981) - 10%
- Violet (#8B5CF6) - 10%

Format : 1200x630px | Qualité : 4K, 300 DPI | Style : Dashboard ultra-visible`
  },
  {
    id: 'variant-b',
    name: 'Variante B - Focus Icônes',
    description: 'Icônes 3D volumineuses et nombreuses, écran plus petit',
    prompt: `Créez une image marketing professionnelle ultra-réaliste pour BOT.BJ, plateforme béninoise d'automatisation intelligente.

COMPOSITION CENTRALE (FOCUS ICÔNES) :
- MacBook Pro 16" argenté en vue 3/4, écran occupant seulement 40% de l'image
- Dashboard BOT.BJ visible mais simplifié (aperçu général)

ICÔNES FLOTTANTES 3D (ÉLÉMENTS PRINCIPAUX - 60% de l'image) :
Disposition en constellation dynamique autour du MacBook :

ICÔNES GRANDES (120-150px) :
1. WhatsApp (vert #25D366) - Position : haut gauche, 3D volumétrique, effet néon vert
2. Messenger (bleu #0084FF) - Position : haut droit, 3D brillant, reflets bleus
3. Robot IA (violet #8B5CF6) - Position : centre droit, 3D métallique, yeux lumineux
4. Globe Web (bleu #3B82F6) - Position : milieu gauche, 3D transparent, lignes de latitude
5. Email (rouge #EA4335) - Position : bas gauche, 3D enveloppe ouverte

ICÔNES MOYENNES (80-100px) :
6. Graphique Stats (vert #10B981) - Courbe ascendante 3D
7. Ampoule Innovation (jaune #FCD34D) - Lumière rayonnante
8. Utilisateurs (violet #8B5CF6) - Silhouettes 3D
9. Fusée (orange #F59E0B) - Flammes animées
10. Cible Marketing (rose #EC4899) - Flèche au centre

ICÔNES PETITES (50-60px, nombreuses, en arrière-plan) :
- Étoiles dorées scintillantes
- Particules de données (0101 en bleu)
- Mini-robots assistants
- Bulles de chat
- Notifications (+1, +5, +10)

CONNEXIONS VISUELLES :
- Lignes lumineuses dorées (#F59E0B) épaisses reliant toutes les icônes
- Flux de données animés (particules bleues #3B82F6)
- Halos colorés autour de chaque icône
- Effet de profondeur : icônes avant nettes, arrière légèrement floutées

ARRIÈRE-PLAN :
- Dégradé radial dynamique : centre bleu électrique (#1E40AF) vers violet profond (#5B21B6)
- Particules lumineuses blanches nombreuses (effet galaxie)
- Circuits électroniques abstraits lumineux
- Rayons de lumière partant du MacBook

TEXTE INTÉGRÉ :
- En haut : "BOT.BJ" en Poppins ExtraBold 80px, blanc lumineux avec halo
- Sous le logo : "Automatisation Intelligente Made in Bénin 🇧🇯" en 26px
- En bas : Icônes alignées avec noms : "WhatsApp • Messenger • Web • Email • IA • Marketing" en 20px

STYLE VISUEL :
- Rendu 3D photoréaliste 4K avec effets de lumière spectaculaires
- Icônes ultra-détaillées avec textures réalistes
- Ambiance : dynamique, technologique, futuriste, énergique

COULEURS DOMINANTES :
- Bleu électrique (#3B82F6) - 25%
- Violet (#8B5CF6) - 20%
- Vert WhatsApp (#25D366) - 15%
- Orange (#F59E0B) - 15%
- Blanc lumineux (#FFFFFF) - 15%
- Bleu BOT.BJ (#5DBBF5) - 10%

Format : 1200x630px | Qualité : 4K, 300 DPI | Style : Icônes spectaculaires 3D`
  },
  {
    id: 'variant-c',
    name: 'Variante C - Map Afrique/Bénin',
    description: 'Carte de l\'Afrique avec focus Bénin intégrée dans la composition',
    prompt: `Créez une image marketing professionnelle ultra-réaliste pour BOT.BJ, plateforme béninoise d'automatisation intelligente.

COMPOSITION CENTRALE :
- MacBook Pro 16" argenté en vue 3/4 (40% de l'image, positionné à gauche)
- Dashboard BOT.BJ visible sur l'écran (résumé)

MAP AFRIQUE/BÉNIN (ÉLÉMENT PRINCIPAL - 50% de l'image, côté droit) :
- Carte 3D de l'Afrique en relief, vue légèrement inclinée
- Continent en gris foncé élégant (#374151) avec contours lumineux bleus (#3B82F6)
- BÉNIN mis en évidence :
  * Couleur : vert lumineux (#10B981) brillant
  * Pin géolocalisé rouge (#EF4444) sur Cotonou avec halo pulsant
  * Texte "BÉNIN" en blanc Poppins Bold 32px au-dessus du pays
  * Frontières du Bénin éclairées en or (#F59E0B)
- Lignes de connexion rayonnant depuis le Bénin vers :
  * Nigeria (ligne orange)
  * Togo (ligne verte)
  * Burkina Faso (ligne bleue)
  * Niger (ligne violette)
  * Ghana, Côte d'Ivoire, Sénégal (lignes blanches)
- Points lumineux sur les capitales africaines (Lagos, Accra, Abidjan, Dakar)

INTÉGRATION TECHNOLOGIQUE :
- Flux de données (particules bleues #3B82F6) s'écoulant du MacBook vers la carte
- Hologrammes 3D flottant au-dessus du Bénin :
  * WhatsApp logo (vert #25D366) - taille 60px
  * Robot IA (violet #8B5CF6) - taille 70px
  * Graphique ascendant (vert #10B981) - taille 50px
- Statistiques affichées près du Bénin :
  "2,500+ Utilisateurs" (blanc, 20px)
  "45 Entreprises" (blanc, 20px)
  "98% Satisfaction" (blanc, 20px)

DRAPEAU BÉNIN :
- Mini drapeau 3D planté sur Cotonou (vert, jaune, rouge)
- Effet ondulement subtil

ARRIÈRE-PLAN :
- Dégradé : bas bleu nuit (#1E293B) vers haut bleu ciel (#0284C7)
- Étoiles scintillantes blanches (ambiance spatiale/tech)
- Grille tech futuriste en transparence (#3B82F6, 5% opacité)
- Halo lumineux blanc-bleu autour de la carte

TEXTE INTÉGRÉ :
- En haut : "BOT.BJ" en Poppins ExtraBold 80px, blanc avec ombre portée
- Sous le logo : "Automatisation Intelligente Made in Bénin 🇧🇯" en 26px blanc
- Slogan supplémentaire : "Rayonnant depuis le Bénin vers toute l'Afrique" en 18px bleu clair
- En bas : Badge "Solution Panafricaine" en 16px or sur fond vert

ÉLÉMENTS GÉOGRAPHIQUES :
- Océan Atlantique en bleu foncé (#0C4A6E) avec reflets
- Lignes de latitude/longitude discrètes en pointillés blancs
- Boussole élégante dans le coin (N, S, E, O)

STYLE VISUEL :
- Rendu 3D photoréaliste 4K avec cartographie moderne
- Éclairage : lumière venant du Bénin (symbolique du rayonnement)
- Ambiance : internationale, expansion, connectivité, fierté africaine

COULEURS DOMINANTES :
- Bleu marine (#0284C7) - 30%
- Vert Bénin (#10B981) - 25%
- Gris élégant (#374151) - 20%
- Bleu BOT.BJ (#5DBBF5) - 15%
- Or (#F59E0B) - 10%

Format : 1200x630px | Qualité : 4K, 300 DPI | Style : Cartographie tech moderne`
  }
];

export const getBotBJVariantPrompts = () => {
  return botbjVariants.map(variant => ({
    name: variant.name,
    prompt: variant.prompt
  }));
};
