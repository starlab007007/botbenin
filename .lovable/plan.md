## Objectifs

1. Ajouter des **boutons d'action rapide (payload buttons)** dans le chat — Vendre, Acheter, Négocier, Payer.
2. Le bouton **Vendre** lance un mini-assistant qui collecte : *quoi*, *prix*, *photos (1–2)* avant d'envoyer la fiche complète au système. La photo doit apparaître dans le **récapitulatif** et dans les messages système (WhatsApp + web).
3. Rendre le chat **vraiment responsive sur mobile** (textarea adaptable, bulles qui ne débordent pas, input toujours visible, safe-area iOS).
4. Permettre à l'option d'ajout d'image de **prendre une photo en direct** (caméra) ou **choisir depuis la galerie**.
5. Afficher un **badge rouge avec le nombre de notifications non lues** sur l'icône cloche, avec un panneau pour consulter le contenu.
6. Remplacer le bouton **"Administration"** (header desktop) et la flèche retour mobile par un bouton **"Fermer"** qui ramène à la page d'accueil `/`.

## Modifications front-end (aucune logique backend ne change)

### A. Nouveau composant `WaouhQuickActions.tsx`
Barre horizontale au-dessus de l'input du chat, style identique à la capture jointe (pills arrondies avec icônes Vendre/Acheter/Négocier/Payer).
- **Acheter / Négocier / Payer** : insèrent un texte d'amorce dans le champ input (ex. « Je cherche … » / « Je propose … FCFA pour … » / « Je paye en Mobile Money … ») et placent le focus.
- **Vendre** : ouvre le mini-assistant (étape suivante).

### B. Nouveau composant `WaouhSellWizard.tsx` (Dialog)
Petit formulaire 1 écran, 3 champs + uploader :
- **Quoi vendre ?** (input texte)
- **Prix (FCFA)** (input number)
- **Ville** (pré-remplie depuis `useWaouhGeolocation`)
- **Photos (1–2)** réutilise le bucket `waouh-uploads` (même logique que `handleFile` actuel) avec `accept="image/*"` + `capture="environment"` (permet *prendre photo* OU *choisir depuis la galerie*).

À la validation : compose un message structuré
```
Je vends : <quoi>
Prix : <prix> FCFA
Ville : <ville>
```
puis appelle la fonction `send()` exposée par `WaouhWebChat` avec les `attachments` déjà uploadés. La fiche apparaîtra ensuite dans la conversation avec **les photos affichées** (déjà supporté par le rendu actuel `m.attachments`).

### C. `WaouhWebChat.tsx` — Responsive mobile + intégration
- Passer `<Input>` à un `<Textarea>` auto-grow (1–4 lignes) pour mobile, `text-[16px]` pour empêcher le zoom iOS.
- Ajouter `pb-[env(safe-area-inset-bottom)]` à la zone form (déjà fait sur la Card en fullscreen, à propager sur l'input row).
- Bulles : `break-words` + `max-w-[80%]` ; grille photos `grid-cols-2 gap-1` reste, mais `aspect-square object-cover`.
- Exposer une ref/callback `onExternalSend(text, attachments)` pour que le wizard envoie sans manipuler le state interne.
- Insérer `<WaouhQuickActions />` juste au-dessus de la zone `pendingAtts` / form.

### D. Compteur de notifications
- Étendre `useWaouhMatchNotifications` pour exposer `unreadCount`, `notifications[]`, `markAllRead()`.
- Stocker localement (state + `localStorage`) la liste des dernières notifs reçues via Realtime.
- Sur la cloche dans `WaouhChatPage` : si `unreadCount > 0`, afficher un **petit cercle rouge** en absolute (top-right de l'icône) avec le nombre (`99+` au-delà). Tap/click → ouvre un `Popover` (desktop) ou `Sheet` (mobile) listant les notifications, et appelle `markAllRead()`.

### E. Bouton "Fermer" → accueil
- **Desktop header** : remplacer le lien `Administration` par `<Link to="/"><Button>Fermer</Button></Link>` (icône `X`). L'accès admin reste disponible via `/admin/waouh` (menu user).
- **Mobile header** : remplacer la flèche `navigate(-1)` par `navigate("/")` et libellé/aria « Fermer » (icône `X`).

## Hors-scope (inchangé)
- Pas de modification d'edge functions, de base de données, ni des flux Realtime existants.
- Le rendu des photos dans WhatsApp est déjà géré par `waouh-outbound-dispatch` (sendImage si `photos[0]`).

## Fichiers touchés
- **Créés** : `src/components/waouh/WaouhQuickActions.tsx`, `src/components/waouh/WaouhSellWizard.tsx`, `src/components/waouh/WaouhNotificationsBell.tsx`
- **Modifiés** : `src/components/waouh/WaouhWebChat.tsx`, `src/pages/waouh/WaouhChatPage.tsx`, `src/hooks/useWaouhMatchNotifications.ts`
