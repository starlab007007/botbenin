## Objectif

Remplacer le parcours actuel (intérêt → négociation → paiement escrow) par :

**Intéressé X → notif vendeur → négociation libre prix (OUI / NON / contre‑offre) → accord → échange automatique des contacts vendeur ↔ acheteur → fin.**

Plus aucun paiement Mobile Money / escrow / commission n'est déclenché.
La présentation des messages web chat devient professionnelle (couleurs, séparateurs, en‑tête, signature WAOUH), affiche toutes les photos avec légendes, géolocalisation en live et analyse marché IA réelle.

---

## 1. Fichiers à modifier

### Backend (edge functions)

- `supabase/functions/waouh-webhook/index.ts`
  - Bloc `MATCH` (lignes ~587–656) : retirer **nom vendeur**, **contact**, **whatsapp partenaire** du listing initial. Conserver titre, prix, ville/quartier, condition, # photos, badge ✅/🏪/🛰️.
  - Bloc `CONFIRM` (lignes ~685–828) : ne plus créer de `waouh_transactions`, supprimer `paymentCard`, garder uniquement `waouh_negotiations` (état `proposed`), prix de référence = `askPrice`, notif vendeur "Nouvel acheteur intéressé" avec **photo + distance live**.
  - Bloc `NEGOTIATE` (lignes ~829–874) : ne plus toucher `waouh_transactions`. Mettre à jour uniquement `last_offer_price`, push contre‑offre au pair.
  - Bloc `PAY` / `CONFIRM_RECEIVED` (lignes 875–940) : supprimer totalement (intent retiré).
  - Bloc `HELP` (ligne 942) : retirer "Je paye".
  - Helpers `paymentCard`, `payInstructions` (lignes 272–273) : supprimer.
  - Nouvelle fonction `buildSearchResultBlock(p, idx, distKm, photos)` qui formate un produit avec séparateur `━━━━━━━━` et `📍 à X,X km de vous`.
  - Nouvelle fonction `buildContactExchange(buyer, seller, article, finalPrice)` qui produit la synthèse finale + carte contact (sans liens, juste texte).
  - Calcul distance live (Haversine) à partir de `lat/lng` acheteur (passé par `waouh-channel-in`) et `geo_location` vendeur déjà stocké.

- `supabase/functions/waouh-negotiation-router/index.ts`
  - Cas `kind === "yes"` (lignes 110–141) : remplacer toute la logique paiement par :
    1. `state = "accepted"`, `closed_at = now()`
    2. Charger acheteur + vendeur (`waouh_users` : phone, name, city, geo) + article (title, price, photos)
    3. Envoyer à l'acheteur la **carte contact vendeur** (nom, téléphone, ville, distance) + synthèse + signature WAOUH
    4. Envoyer au vendeur la **carte contact acheteur** + synthèse
    5. Retirer `paymentCard`, `payInstructions`
  - Cas `kind === "no"` et `kind === "price"` : conserver (déjà sans paiement).

- `supabase/functions/waouh-channel-in/index.ts`
  - Passer `lat`/`lng` acheteur jusqu'à `waouh-webhook` (déjà fait pour `geo.lat/lng`, vérifier qu'ils arrivent intacts dans `body.lat/lng`).

- Nouveau helper `supabase/functions/_shared/waouh-format.ts`
  - `formatHeader(title)` → "━━━━━━━━━━━━━━━━━━\n*🎯 {title}*\n━━━━━━━━━━━━━━━━━━"
  - `formatFooter()` → "━━━━━━━━━━━━━━━━━━\n_✨ WAOUH — Achetez, vendez, négociez en confiance_"
  - `formatPriceBadge(price)`, `formatDistance(km)`, `formatProductCard({...})`
  - `marketAnalysis(title, price, min, max, city)` : appel Gemini synthétique (1–2 phrases factuelles, ex. "Prix dans la fourchette basse marché Cotonou. Bonne affaire si état neuf.").

### Frontend

- `src/components/waouh/WaouhWebChat.tsx`
  - Améliorer le rendu Markdown : composants `ReactMarkdown` custom (h2 bleu, hr coloré, blockquote vert pour synthèse, strong en couleur primaire).
  - Galerie photos : ne plus limiter à 2 par produit côté affichage — afficher **toutes** les photos transmises dans `attachments` avec légende (alt = caption). Grid 2/3 colonnes selon nombre.
  - Caption visible sous chaque image (overlay bas, fond noir/50, texte blanc) à partir du champ `caption` ajouté à `Att`.
  - Adresse vendeur en bloc encadré (Card border-l-4 emerald) inline dans le message au lieu d'un lien.
  - Badge "📍 à X km" stylé (pill emerald).

- `src/components/waouh/WaouhTransactionCard.tsx`
  - Plus utilisé après accord → conditionner l'affichage : si `meta.intent === "contact_exchange"`, afficher une **Card contact** (nom, téléphone cliquable `tel:`, WhatsApp `wa.me/`, ville, distance).
  - Sinon (négociation en cours) garder un mini résumé prix sans bouton "Payer".

- `src/components/waouh/WaouhQuickActions.tsx`
  - Retirer l'action "pay" du `QUICK_PROMPTS` dans `WaouhWebChat.tsx` (ligne 49–53).

- `src/hooks/useWaouhMatchNotifications.ts`
  - Ajouter template `contact_exchange` → titre "🎉 Accord conclu — contact partagé".
  - Retirer `payment_link`.

- `src/components/waouh/WaouhPaymentDialog.tsx` et `WaouhPaymentForm.tsx`
  - Conserver en place mais ne plus être ouverts (mort code toléré pour rollback rapide). Pas de suppression de fichier.

### Géolocalisation (vérification)

- `src/hooks/useWaouhGeolocation.ts` : vérifier `watchPosition` actif (sinon le passer à watch) pour rester live.
- `supabase/functions/waouh-channel-in/index.ts` : confirmer écriture `lat/lng` dans `waouh_users.geo_location` à chaque message.
- Côté vendeur : à la publication "Je vends", `waouh-webhook` doit déjà persister la position vendeur sur `waouh_articles.geo_location` (à vérifier dans bloc SELL).

### Base de données

Migration légère (non destructive) :

```sql
-- Marquer les négociations conclues sans paiement
ALTER TABLE public.waouh_negotiations
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_shared_at TIMESTAMPTZ;
```

Aucune suppression de table : `waouh_transactions` reste pour l'historique, simplement plus alimenté.

---

## 2. Nouveau format des messages (web chat)

### Annonce trouvée (liste Top N)

```
━━━━━━━━━━━━━━━━━━
*🎯 Top 3 annonces trouvées*
━━━━━━━━━━━━━━━━━━

*1. Honda Civic 2018*
💰 *3 200 000 FCFA*
📍 Cotonou · Cadjèhoun
📏 *à 2,4 km de vous*
📸 4 photos
🧠 Prix correct vs marché local (3,0–3,6 M)

━━━━━━━━━━━━━━━━━━

*2. ...*

━━━━━━━━━━━━━━━━━━

💡 Pour discuter avec un vendeur : *intéressé 1*, *intéressé 2*…

_✨ WAOUH_
```

Pas de nom / téléphone / nom d'entreprise visibles.

### Notification vendeur (après "intéressé X")

```
━━━━━━━━━━━━━━━━━━
*📩 Nouvel acheteur intéressé*
━━━━━━━━━━━━━━━━━━

📦 *Honda Civic 2018*
💰 *Prix demandé : 3 200 000 FCFA*
📏 *Acheteur à 2,4 km de vous*
🏙️ Cotonou

Répondez :
• *OUI* pour accepter
• *NON* pour refuser
• *Je propose 2 900 000 FCFA* pour contre‑offrir

_✨ WAOUH_
```

### Accord conclu (envoyé aux deux parties)

```
━━━━━━━━━━━━━━━━━━
*🎉 Accord conclu !*
━━━━━━━━━━━━━━━━━━

📦 *Honda Civic 2018*
💰 *Prix final : 3 000 000 FCFA*

📇 *Contact {vendeur|acheteur}*
👤 Komlan A.
📞 +229 01 65 65 34 68
🟢 WhatsApp : +229 01 65 65 34 68
🏙️ Cotonou · Cadjèhoun
📏 à 2,4 km

Vous pouvez maintenant convenir directement de la livraison et du paiement.

_Merci d'avoir utilisé WAOUH ✨_
```

---

## 3. Analyse marché IA (réelle)

Implémenter `marketAnalysis()` dans `_shared/waouh-format.ts` :
- Appel `google/gemini-2.5-flash` via `LOVABLE_API_KEY`
- Prompt synthétique :
  > "Tu es analyste marché Bénin. Donne en 1 phrase (max 25 mots) une appréciation factuelle : prix vs fourchette, contexte ville, conseil. Pas de bla‑bla."
- Cache mémoire 10 min par (titre, ville, fourchette) pour éviter répétition.

---

## 4. Hors‑scope (non touché)

- `.github/`, `Dockerfile`, `docker-compose.yml`, `vite.config.ts` : **inchangés**.
- `waouh-payment*`, `qosic-*`, `mtn-momo-*` : conservés mais non appelés.
- Authentification, profils, partenaires : aucun changement.

---

## 5. Vérification end‑to‑end

1. `/waouh-chat` : "Je cherche une voiture" → liste sans nom ni contact, distance affichée, photos visibles, analyse IA présente.
2. "intéressé 1" → vendeur (autre session) reçoit notif avec photo + distance.
3. Vendeur "Je propose 2 900 000" → acheteur reçoit contre‑offre.
4. Acheteur "OUI" → les deux parties reçoivent la carte contact de l'autre, état `accepted`, `contact_shared_at` rempli.
5. Aucune transaction `payment_pending` créée pendant le parcours.
