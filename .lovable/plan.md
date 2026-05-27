## Redesign — Écran d'accueil Auth (WaouhApp)

Direction choisie : **Piliers empilés sobres** (v1).

### Fichier modifié
- `src/app-mobile/screens/auth/AuthHomeScreen.tsx`

### Changements
1. **Conserver à l'identique** : bouton vert "Continuer avec WhatsApp", bouton blanc "Continuer avec Email", mention légale "En continuant, vous acceptez nos conditions d'utilisation.", palette verte `hsl(165 91% 18%) → hsl(165 91% 25%)`.
2. **Ajouter au-dessus des CTA** :
   - Logo bulle de chat + titre "WaouhApp" (police serif).
   - Tagline éditoriale : « **Envoie un message.** *Le monde achète.* » + sous-ligne multilingue (FR / Fon / Yoruba).
   - 3 cartes piliers empilées (glass) : **Vendre** (vert, sac), **Acheter** (bleu, loupe), **Négocier** (orange, poignée de main) — chacune avec icône colorée + titre serif + sous-titre.
3. **Ambiance** : deux halos émeraude flous en arrière-plan, animations `animate-fade-in` en cascade (0/120/240 ms), micro-hover sur les cartes.
4. **Mobile-first** : largeur max 400px, padding compact, `min-h-[100dvh]`.

### Détails techniques
- Icônes via `lucide-react` (`ShoppingBag`, `Search`, `Handshake`, `MessageCircle`, `Mail`) — pas de nouvelle dépendance.
- Animation `animate-fade-in` déjà disponible dans `tailwind.config.ts` du projet.
- Aucune logique métier touchée (navigation `/app/auth/whatsapp` et `/app/auth/email` inchangée).
- Pas de changement de routes, hooks, ou store.
