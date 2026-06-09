## Edge functions à supprimer pour libérer des slots

Basé sur les pages que tu n'utilises plus, voici les fonctions liées qui peuvent être supprimées sans impact sur les flux WAOUH / WhatsApp actuels.

### Catégorie 1 — Production vidéo (`/video-production`, `/video-library`, `/video-assets`, `/video-production/calendar`)
1. `assemble-final-video`
2. `assemble-video`
3. `check-shotstack-status`
4. `render-with-shotstack`
5. `generate-ai-video`
6. `generate-video-description`
7. `generate-video-frames`
8. `merge-audio-tracks`

### Catégorie 2 — Visual Creator / Galeries (`/modules/visual-creator`, `/visual-gallery`, `/yovo-gallery`)
9. `generate-visual-content`
10. `generate-visual-variants`

### Catégorie 3 — Support / Use-case support (`/use-case/support`)
11. `support-chatbot-n1`
12. `support-create-ticket-public`
13. `support-guest-ticket-get`
14. `support-guest-ticket-message`
   *(garder `support-create-ticket` si encore utilisé en interne — à confirmer)*

### Catégorie 4 — Tests paiement (`/admin/payment-tests`)
15. `qosic-check-status` *(à vérifier : utilisé par le flux production ? Sinon supprimable)*

### Catégorie 5 — Promo / Voix promo (souvent liées au visual creator)
16. `generate-promotional-texts`
17. `generate-promotional-voice`

### Recommandation minimale (1 slot)

Tu n'as besoin que **d'un seul slot libre** pour déployer `waouh-e2e-test`. Le candidat le plus sûr et le plus inoffensif :

→ **`assemble-final-video`** (vidéo, code uniquement, pas de webhook entrant, contenu confirmé non utilisé)

### Recommandation propre (nettoyage en lot)

Supprimer le bloc **Catégorie 1 (vidéo)** d'un coup libère **8 slots** d'un coup — futur-proof pour les prochains déploiements WAOUH (partner promote, radar fallback, etc.).

### Ce que je ferai après ton choix

1. Appeler `supabase--delete_edge_functions` avec la liste validée.
2. Supprimer les dossiers correspondants sous `supabase/functions/`.
3. Déployer `waouh-e2e-test`, `waouh-notify-dispatch`, `waouh-buyer-interest`.
4. Vérifier les logs.

### Question

Confirme l'une des options :
- **A.** Supprimer seulement `assemble-final-video` (1 slot, minimum risque).
- **B.** Supprimer toute la Catégorie 1 vidéo (8 slots).
- **C.** Supprimer Catégories 1 + 2 + 5 (10 slots, nettoyage complet visual+vidéo).
- **D.** Une liste personnalisée que tu précises.
