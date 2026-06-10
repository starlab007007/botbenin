Diagnostic confirmé

- L’erreur utilisateur "Cet article ne peut pas être négocié..." vient encore de la promotion catalogue vers article, mais la cause actuelle n’est plus le rate-limit.
- Les logs `waouh-webhook` montrent : `waouh_articles_category_check`.
- Exemple réel en base : `categorie = "Mode & Vêtements"` dans `waouh_unified_catalog`, alors que `waouh_articles.category` n’accepte que : `smartphone`, `ordinateur`, `vetement`, `vehicule`, `electromenager`, `meuble`, `autre`.
- Le helper partagé `promoteCatalogToArticle` insère actuellement `cat.categorie` tel quel, sans normalisation, donc la promotion échoue et la négociation n’est pas créée.
- Les numéros `229264284`, `229263532`, etc. viennent des tests E2E automatiques : ils créent des téléphones comme `229E2ECS64284`; la normalisation retire les lettres et fabrique un faux numéro `229264284`, puis l’envoie dans la queue WA.

Plan de correction

1. Corriger la promotion catalogue vers article
   - Modifier `supabase/functions/_shared/waouh-promote.ts`.
   - Ajouter une normalisation stricte de catégorie dans le helper partagé.
   - Convertir notamment :
     - `Mode & Vêtements`, `vêtement`, `chaussure`, `mode` → `vetement`
     - `Téléphone`, `smartphone`, `iphone`, `android` → `smartphone`
     - `PC`, `ordinateur`, `laptop` → `ordinateur`
     - autres valeurs inconnues → `autre`
   - Utiliser cette catégorie normalisée pour toutes les promotions `partner` et `radar`.

2. Bloquer les faux numéros WhatsApp
   - Durcir `normalizeBeninPhone` dans :
     - `supabase/functions/_shared/waouh-phone.ts`
     - `supabase/functions/_shared/waouhContact.ts`
     - `supabase/functions/waouh-outbound-dispatch/index.ts`
   - Pour les numéros Bénin, accepter uniquement :
     - ancien format : `229` + 8 chiffres locaux
     - nouveau format : `22901` + 8 chiffres locaux
     - `@lid` déjà connu
   - Refuser les valeurs alphanumériques/fake comme `229E2E...` au lieu de les transformer en pseudo-numéros.

3. Empêcher les tests E2E automatiques de polluer la vraie queue WhatsApp
   - Modifier `supabase/functions/waouh-e2e-test/index.ts` en mode auto.
   - Quand les tests utilisent des faux numéros, appeler `waouh-notify-dispatch` avec `skip_whatsapp: true` ou éviter l’enqueue WA.
   - Garder le mode `whatsapp_full` inchangé pour les vrais numéros saisis dans l’interface.

4. Nettoyer les lignes de queue invalides récentes
   - Ajouter une migration légère qui marque comme invalides/archivées les entrées `waouh_outbound_queue` récentes dont `to_phone` correspond aux faux numéros E2E (`229E2E...` normalisé trop court comme `229264284`).
   - Ne pas toucher aux messages réels déjà envoyés.

5. Tester après correction
   - Déployer les fonctions concernées : `waouh-webhook`, `waouh-notify-dispatch`, `waouh-outbound-dispatch`, `waouh-e2e-test`.
   - Vérifier en base qu’un catalogue avec `Mode & Vêtements` se promeut bien en article `category = vetement`.
   - Vérifier scénario B réel : acheteur WA envoie `intéressé`, négociation créée, vendeur App reçoit une seule notification miroir app/WA selon son numéro réel.
   - Vérifier que les prochains tests auto ne créent plus de `to_phone` comme `229264284`.