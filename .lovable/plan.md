
## Objectif

Côté **vendeur**, dans la fenêtre ouverte depuis la notification produit :
1. Ajouter la **date + heure** directement visible sur la ligne de notification (capture 2).
2. **Supprimer** le bloc texte brut `📩 Nouvel acheteur intéressé … Répondez OUI / NON / Je propose …` qui se duplique dans la fenêtre (capture 3).
3. **Conserver** le bloc `✅ Annonce publiée` ainsi que tout le flux de négociation dans cette même fenêtre (notifications d'intérêt entrantes + contre-offres + accord), sans rien casser côté acheteur.

## Constats techniques

- `src/components/waouh/WaouhMatchChatList.tsx` — la ligne "Annonce / WAOUH-VEN-…" n'affiche que titre + label, sans horodatage. `MatchItem.last_at` est déjà disponible.
- `src/components/waouh/WaouhMatchChatWindow.tsx` lignes 560-567 — affiche `seedNotif.text` (le message brut "📩 Nouvel acheteur intéressé …"). C'est ce qui apparaît en double sous la bannière jaune dans la capture 3.
- La bannière jaune (lignes 537-558) reprend déjà titre, photo, prix, ville et date → suffisant comme en-tête.
- La fenêtre reçoit déjà les messages réalisme (`waouh_messages`), composer + send sont en place → la négociation se poursuit naturellement dans la même fenêtre.

## Modifications

### 1. `src/components/waouh/WaouhMatchChatList.tsx` (renderRow)
Ajouter, à droite ou sous le label, une petite date courte basée sur `it.last_at` :

```tsx
<span className="text-[10px] text-muted-foreground shrink-0">
  {new Date(it.last_at).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  })}
</span>
```

Placée sous le badge `WAOUH-VEN-…` (deuxième ligne de la zone droite) pour rester lisible sans casser le layout.

### 2. `src/components/waouh/WaouhMatchChatWindow.tsx`
Supprimer le rendu du bloc brut **uniquement côté vendeur** (le côté acheteur conserve le texte original utile à la recherche/radar) :

```tsx
{seedNotif?.text && match.kind !== "seller" && (
  <div className="mr-auto …">…</div>
)}
```

Aucune autre suppression : la bannière jaune (titre + photo + prix + ville + date) reste, le message `✅ Annonce publiée` (envoyé séparément dans `waouh_messages`) continue de s'afficher dans le fil normal, et toutes les notifications d'intérêt suivantes + contre-offres arrivent déjà dans cette même fenêtre via le canal realtime existant.

## Hors scope

- Aucune modification d'edge function ni de format de message.
- Pas de changement côté acheteur.
- Pas de refonte du composer ni de la logique de négociation (déjà fonctionnelle dans cette fenêtre).
