## Module Partenaire mobile — simplification du parcours

### 1. Bypass des écrans "Devenir Partenaire" et "Espace Partenaire"
Auto-créer silencieusement un enregistrement `waouh_partners` minimal dès qu'un utilisateur authentifié arrive sur `/app/partner`, puis rediriger immédiatement vers `/app/partner/businesses`.

**Fichier : `src/app-mobile/screens/partner/PartnerHomeScreen.tsx`** (réécriture minimale)
- Supprimer tout le formulaire d'enrôlement (Nom, Téléphone, WhatsApp, Ville, Mobile Money) et tout le dashboard (badges, stats, activité, tuile "Mes entreprises").
- Nouveau comportement :
  - Si `authLoading || loading` → spinner plein écran.
  - Si pas de `partner` → appeler `apply({ nom: user.email || 'Partenaire', ville: '—', telephone: '', mobile_money_operator: 'MTN', mobile_money_number: '' })` une seule fois, puis `navigate('/app/partner/businesses', { replace: true })`.
  - Si `partner` existe → `navigate('/app/partner/businesses', { replace: true })`.

**Fichier : `src/lib/validation/waouh.ts`**
- Assouplir `partnerEnrollmentSchema` pour permettre la création auto :
  - `telephone` : passer de `phoneRequired` à `phoneOptional`.
  - `mobile_money_number` : passer de `phoneRequired` à `phoneOptional`.
  - `mobile_money_operator` : `.optional().default('MTN')`.
  - `ville` : `.optional().default('')`.
- (Le `useWaouhPartner.apply` insère directement, donc le schéma n'est plus appelé côté mobile — l'assouplissement reste utile pour éviter les régressions web et n'affecte pas la version web qui valide en amont.)
- Si on préfère ne pas toucher la version web, alternative : ne pas modifier le schéma et faire l'insert directement sans validation dans le nouveau `PartnerHomeScreen`.

### 2. Formulaire entreprise — retirer 3 champs

**Fichier : `src/app-mobile/screens/partner/BusinessFormNativeScreen.tsx`**
- Retirer du JSX et du state :
  - `<NativePhoneInput label="Téléphone" />`
  - `<NativeSelectSheet label="Opérateur Mobile Money" />`
  - `<NativePhoneInput label="Numéro Mobile Money" />`
- Garder `whatsapp` (seul champ contact conservé).
- Nettoyer `BusinessFormState` (retirer `telephone`, `mobile_money_number`, `mobile_money_operator`), `empty`, et le `useEffect` d'initialisation.
- Retirer l'import `MOMO_OPERATORS` et `NativeSelectSheet` devenus inutiles.

### 3. Fix "Détecter ma position" sur mobile natif

**Fichier : `src/app-mobile/screens/partner/BusinessFormNativeScreen.tsx`** — fonction `detectLocation`
- Détecter Capacitor via `Capacitor.isNativePlatform()`.
- Sur natif : utiliser `@capacitor/geolocation` (déjà installé) :
  ```ts
  import { Geolocation } from '@capacitor/geolocation';
  const perm = await Geolocation.requestPermissions();
  if (perm.location !== 'granted') { toast(...); return; }
  const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
  ```
- Sur web : garder `navigator.geolocation.getCurrentPosition` actuel.
- Unifier le traitement post-position (set state + appel `ai.run('reverse_geocode', …)`) dans une fonction interne `applyPosition(lat, lng)`.
- Ajouter un état `gpsLoading` pour désactiver le bouton et afficher le spinner pendant toute la durée (permission + position + reverse geocode).
- Toasts d'erreur explicites : permission refusée, timeout, GPS désactivé.

### Détails techniques
- Aucune migration DB nécessaire (les colonnes Mobile Money/téléphone du partenaire et de l'entreprise restent dans la base, simplement non remplies depuis le mobile).
- `index.mobile.html` / `capacitor.config.ts` : la permission `ACCESS_FINE_LOCATION` doit être déclarée. Le plugin `@capacitor/geolocation` l'ajoute automatiquement via gradle — rien à patcher.
- Web (route `/partner`) : aucun changement, conserve le flux complet existant.
