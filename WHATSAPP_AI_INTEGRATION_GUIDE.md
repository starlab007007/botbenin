# Guide d'Intégration WhatsApp & Chat IA

## ✅ Fonctionnalités Implémentées

### 1. Chat IA Flottant (FloatingAIChat)
- **Position**: Coin inférieur droit
- **Technologie**: Lovable AI avec Google Gemini 2.5 Flash
- **Fonctionnalités**:
  - Discussion en temps réel avec streaming
  - Interface moderne et responsive
  - Messages persistants pendant la session
  - Gestion des erreurs (rate limits, quotas)

### 2. Bouton WhatsApp Flottant (FloatingWhatsAppButton)
- **Position**: Coin inférieur gauche
- **Fonctionnalité**: Ouvre WhatsApp avec message pré-rempli
- **Icône**: Logo WhatsApp officiel (vert #25D366)

### 3. Liens Directs dans les Cartes de Fonctionnalités
- **Chatbot 24/7**: Bouton "Démarrer sur WhatsApp"
- **Qualification**: Lien vers cas d'usage e-commerce
- **Conversions**: Lien vers témoignages clients

---

## 🔧 Configuration Requise

### 1. Configurer le Numéro WhatsApp

**Fichier**: `src/components/FloatingWhatsAppButton.tsx`

Remplacez le numéro par défaut:
```typescript
phoneNumber = '22900000000' // ← Remplacer par votre numéro
```

**Format du numéro**:
- Inclure l'indicatif pays (229 pour le Bénin)
- Pas d'espaces ni de tirets
- Exemple: `22997123456`

**Fichier**: `src/components/LandingHero.tsx` (ligne ~90)

Remplacez également dans le bouton de la carte:
```typescript
onClick={() => window.open('https://wa.me/22900000000?text=Je%20veux%20créer%20mon%20chatbot', '_blank')}
```

### 2. Message Personnalisé WhatsApp

Modifiez le message pré-rempli dans `FloatingWhatsAppButton.tsx`:
```typescript
message = 'Bonjour, je souhaite en savoir plus sur Bot.BJ'
```

---

## 🤖 Configuration du Chat IA

### Edge Function Déployée
**Fichier**: `supabase/functions/ai-chat/index.ts`

✅ Déjà configuré pour:
- Utiliser `LOVABLE_API_KEY` (automatique avec Lovable Cloud)
- Modèle: `google/gemini-2.5-flash` (gratuit jusqu'au 6 oct 2025)
- Streaming activé
- Gestion des erreurs 429/402

### Personnaliser le Prompt Système

Éditez le prompt dans `supabase/functions/ai-chat/index.ts`:
```typescript
{
  role: "system",
  content: `Tu es l'assistant IA de Bot.BJ...
  
  // Ajoutez vos instructions personnalisées ici
  `
}
```

### Déployer la Fonction Edge

Si la fonction n'est pas déployée automatiquement:

1. **Via Lovable Cloud**:
   - La fonction sera déployée automatiquement
   - Vérifiez dans Settings > Cloud Functions

2. **Via Supabase CLI** (si nécessaire):
```bash
supabase functions deploy ai-chat
```

---

## 🎨 Personnalisation Visuelle

### Couleurs du Chat IA
**Fichier**: `src/components/FloatingAIChat.tsx`

```typescript
// Couleur du bouton flottant
className="... bg-gradient-to-r from-primary to-primary/80"

// Couleur de l'en-tête
className="bg-gradient-to-r from-primary to-primary/80 text-white"
```

### Position des Boutons Flottants

**Chat IA** (bas droite):
```typescript
className="fixed bottom-6 right-6 ..."
```

**WhatsApp** (bas gauche):
```typescript
className="fixed bottom-6 left-6 ..."
```

**Modifier les positions**:
- `bottom-6` → `bottom-20` (plus haut)
- `right-6` → `right-20` (plus à gauche/droite)

---

## 📱 Responsive & Mobile

Les deux boutons flottants sont automatiquement:
- ✅ Visibles sur mobile et desktop
- ✅ Responsive (taille adaptée)
- ✅ Au-dessus de tout le contenu (z-index: 50)
- ✅ Accessibles (aria-labels)

### Masquer sur Mobile (optionnel)

Si vous voulez masquer un bouton sur mobile:
```typescript
className="... hidden md:flex" // Visible seulement sur desktop
className="... md:hidden" // Visible seulement sur mobile
```

---

## 🔐 Sécurité & Limites

### Rate Limits (Lovable AI)
- **Gratuit**: Limité selon votre plan Lovable
- **Erreur 429**: Affiche un message "Trop de requêtes"
- **Erreur 402**: Affiche "Limite d'utilisation atteinte"

### Améliorer les Limites
1. Passer à un plan payant Lovable
2. Contacter support@lovable.dev pour augmenter les quotas

### Sécurité
✅ Déjà configuré:
- `LOVABLE_API_KEY` jamais exposée au client
- CORS configuré
- Validation des entrées
- Streaming sécurisé

---

## 🧪 Tests

### Tester le Chat IA

1. Ouvrez votre site
2. Cliquez sur le bouton bleu (coin bas droit)
3. Tapez: "Comment fonctionne Bot.BJ ?"
4. Vérifiez que la réponse s'affiche progressivement

**Problèmes courants**:
- **Pas de réponse**: Vérifiez que Lovable Cloud est activé
- **Erreur 401**: `LOVABLE_API_KEY` non configurée
- **Erreur 429**: Trop de requêtes, attendez 1 minute

### Tester WhatsApp

1. Cliquez sur le bouton vert (coin bas gauche)
2. WhatsApp Web/App devrait s'ouvrir
3. Le message pré-rempli devrait apparaître

**Problèmes**:
- **Numéro invalide**: Vérifiez le format (+229...)
- **WhatsApp ne s'ouvre pas**: Vérifiez que WhatsApp est installé

---

## 📊 Analytics & Suivi

### Tracking des Interactions

Ajoutez dans `FloatingAIChat.tsx`:
```typescript
import { trackCTAClick } from '@/components/GoogleAnalytics';

// Lors de l'ouverture du chat
trackCTAClick('Open AI Chat', 'Floating Button');

// Lors de l'envoi d'un message
trackCTAClick('Send AI Message', 'Chat Widget');
```

### Tracking WhatsApp

Ajoutez dans `FloatingWhatsAppButton.tsx`:
```typescript
import { trackCTAClick } from '@/components/GoogleAnalytics';

const handleWhatsAppClick = () => {
  trackCTAClick('Open WhatsApp', 'Floating Button');
  // ... reste du code
};
```

---

## 🚀 Optimisations

### Lazy Loading (déjà implémenté)
Les composants sont chargés uniquement quand nécessaires:
- Chat IA: Chargé au clic sur le bouton
- WhatsApp: Aucun chargement lourd

### Performance
- Streaming: Réponses progressives (pas d'attente)
- Compression: Messages gzippés automatiquement
- Cache: Messages gardés en mémoire pendant la session

### SEO
✅ Boutons flottants:
- N'affectent pas le SEO (positions absolues)
- Aria-labels pour l'accessibilité
- Ne bloquent pas le contenu

---

## 📝 Checklist de Déploiement

- [ ] Remplacer le numéro WhatsApp par le vrai
- [ ] Personnaliser le message pré-rempli WhatsApp
- [ ] Tester le chat IA en local
- [ ] Vérifier que Lovable Cloud est activé
- [ ] Déployer et tester en production
- [ ] Configurer Google Analytics pour tracking
- [ ] Tester sur mobile (iOS et Android)
- [ ] Vérifier les rate limits en production

---

## 🆘 Support

### Lovable AI Issues
- Documentation: https://docs.lovable.dev/features/ai
- Support: support@lovable.dev
- Discord: https://discord.com/channels/1119885301872070706

### WhatsApp Business API
- Documentation: https://developers.facebook.com/docs/whatsapp
- Support: Via Facebook Business Manager

---

## 💡 Idées d'Amélioration Futures

1. **Historique de conversation**
   - Sauvegarder dans localStorage
   - Synchroniser avec compte utilisateur

2. **Suggestions rapides**
   - Boutons de questions fréquentes
   - Réponses pré-définies

3. **Notification de nouveaux messages**
   - Badge sur le bouton flottant
   - Push notifications

4. **Multi-langues**
   - Détection automatique de la langue
   - Basculer entre FR/EN

5. **Intégration CRM**
   - Capturer les leads du chat
   - Envoyer à votre CRM
