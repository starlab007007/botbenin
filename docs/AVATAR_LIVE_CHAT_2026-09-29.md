# L'avatar écrit dans le chat (2026-09-29)

Décisions validées : (1) fil « Mon avatar » + messages dans les Deal Rooms ; (2) WhatsApp : évènements d'offre actifs par défaut, bilans en option ; (3) accueil raccourci à une phrase quand rien n'a changé.

## Ce qui change
- `waouh-avatar-briefing` écrit **2 à 3 bulles** (`waouh_messages`, `meta.intent='avatar_briefing'`, `meta.avatar_bubble={seq,of,kind}`, `meta.briefing_id`), boutons (`meta.actions`, ≤ 3) sur la dernière. Plus de `meta.avatar_briefing` (carte) pour les nouveaux points ; les anciennes cartes restent lues.
- Ouverture sans nouveauté (même empreinte, rien d'actionnable) : une seule bulle courte. Le premier accueil n'est jamais raccourci.
- Web et Flutter : les bulles en direct apparaissent l'une après l'autre (700 ms, puis +1,1 s par bulle) avec « l'avatar écrit… ». Historique (> 15 s) : affichage immédiat. Sans état partagé : calculé depuis le message.
- Évènements d'offre (`waouh-nexus-followup`) : note dans la Deal Room (déjà en direct) + WhatsApp pour les utilisateurs WhatsApp, sauf `notify_events = false`.
- Bilans réguliers (tick) : WhatsApp seulement si `notify_digest = true` et numéro connu ; jamais à l'ouverture de l'app.
- Réglages « Me joindre sur WhatsApp » (Web : popover ; Flutter : feuille) : `notify_events` (défaut oui), `notify_digest` (défaut non).

## Inchangé
L'avatar n'écrit jamais à un tiers sans tap de l'utilisateur (politique C0–C5). Heures calmes, seuil 30 min, cadence, `off` désactivable.

## Déploiement
Migration additive `20260929180000_waouh_avatar_notify_prefs.sql` (deux colonnes) → puis fonctions `waouh-avatar-briefing` et `waouh-nexus-followup` → puis Web. Ordre important : l'ancienne fonction ignore les nouvelles colonnes, la nouvelle les exige.
