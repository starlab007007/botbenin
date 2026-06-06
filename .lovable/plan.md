Le bouton **Allow** ne peut pas être cliqué par moi directement : c’est une validation de sécurité dans ton interface Lovable. S’il paraît inactif ou ne réagit pas, la cause probable est que la migration actuelle tente de créer le bucket avec `INSERT INTO storage.buckets`, alors que Supabase Storage doit être géré via l’API Storage, pas via une migration SQL directe.

Plan de correction :

1. **Remplacer la migration bloquée**
   - Ne plus utiliser `INSERT INTO storage.buckets`.
   - Créer le bucket `waouh-statuses` avec le mécanisme Supabase Storage approprié.
   - Configurer le bucket pour accepter uniquement les images, jusqu’à 50 MB.

2. **Garder uniquement les policies nécessaires en SQL**
   - Lecture publique des fichiers du bucket `waouh-statuses`.
   - Upload autorisé uniquement aux utilisateurs connectés.
   - Modification/suppression autorisée uniquement dans le dossier de l’utilisateur connecté.

3. **Vérifier la base et le stockage**
   - Confirmer que le bucket existe.
   - Confirmer que les policies Storage sont présentes.
   - Vérifier que la table `waouh_statuses` reste accessible selon ses règles actuelles.

4. **Tester le flux de bout en bout**
   - Publier un statut avec photo.
   - Vérifier que l’image est uploadée sans erreur “Bucket not found”.
   - Vérifier que le statut apparaît dans l’onglet mobile `Statuts · 24h` et dans la section au-dessus du chat WAOUH.

Après approbation de ce plan, je lancerai la correction proprement sans te demander de cliquer sur cette migration bloquée.