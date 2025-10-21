# Guide de Protection XSS - bot.bj

## ✅ Protection Implémentée

### 1. **SafeText Component** (`src/components/security/SafeText.tsx`)
Composant React pour afficher du contenu utilisateur de manière sécurisée.

```tsx
import { SafeText } from '@/components/security/SafeText';

// Affichage texte simple (échappe HTML)
<SafeText>{message.message_content}</SafeText>

// Affichage avec HTML basique autorisé
<SafeText allowHtml>{message.message_content}</SafeText>

// Avec limite de caractères
<SafeText maxLength={100}>{message.message_content}</SafeText>
```

### 2. **XSSProtection Service** (`src/services/security/xssProtection.ts`)
Service complet de sanitization.

```typescript
import { XSSProtection } from '@/services/security/xssProtection';

// Sanitize texte pur
const safe = XSSProtection.sanitizeText(userInput);

// Sanitize HTML basique
const safeHtml = XSSProtection.sanitizeBasicHtml(userInput);

// Sanitize URL
const safeUrl = XSSProtection.sanitizeUrl(url);

// Détecter XSS
if (XSSProtection.detectXSS(input)) {
  console.warn('XSS détecté!');
}

// Sanitize formulaire complet
const safeData = XSSProtection.sanitizeFormData(formData);
```

### 3. **useSafeInput Hook** (`src/hooks/useSafeInput.ts`)
Hook React pour inputs sécurisés.

```typescript
import { useSafeInput, useSafeForm } from '@/hooks/useSafeInput';

// Pour un input simple
const { value, setValue, error, isValid } = useSafeInput('', {
  maxLength: 500,
  allowHtml: false,
});

// Pour un formulaire complet
const { values, errors, handleChange, sanitizeAll } = useSafeForm({
  name: '',
  email: '',
  message: '',
});
```

## 🎯 Où Appliquer la Protection

### Messages Chat (PRIORITÉ CRITIQUE)
```tsx
// ❌ DANGEREUX
<div>{message.message_content}</div>

// ✅ SÉCURISÉ
<SafeText>{message.message_content}</SafeText>
```

Fichiers à modifier:
- `src/components/BotMessages.tsx`
- `src/components/MessagesOverview.tsx`
- `src/components/ChatInterface.tsx`
- `src/components/bot-conversation/MessageList.tsx`
- Tous les fichiers dans `src/components/bot-conversation/components/`

### Formulaires (PRIORITÉ HAUTE)
```tsx
// ❌ DANGEREUX
const handleSubmit = () => {
  saveMessage(inputValue);
};

// ✅ SÉCURISÉ
const handleSubmit = () => {
  const safe = XSSProtection.sanitizeMessageContent(inputValue);
  saveMessage(safe);
};
```

Fichiers à modifier:
- `src/components/bot-conversation/components/ReplyForm.tsx`
- Tous les formulaires de contact
- Tous les inputs utilisateur

### URLs et Liens (PRIORITÉ HAUTE)
```tsx
// ❌ DANGEREUX
<a href={user.website}>Visit</a>

// ✅ SÉCURISÉ
import { SafeLink } from '@/components/security/SafeText';
<SafeLink href={user.website}>Visit</SafeLink>
```

### Affichage de Données Utilisateur
```tsx
// ❌ DANGEREUX
<div>{user.name}</div>
<div>{prospect.company}</div>

// ✅ SÉCURISÉ
<SafeText>{user.name}</SafeText>
<SafeText>{prospect.company}</SafeText>
```

## 🔒 Patterns de Protection

### Pattern 1: Affichage Simple
```tsx
import { SafeText } from '@/components/security/SafeText';

<SafeText>{untrustedContent}</SafeText>
```

### Pattern 2: Affichage HTML Riche
```tsx
import { SafeText } from '@/components/security/SafeText';

<SafeText allowHtml>{richTextContent}</SafeText>
```

### Pattern 3: Input Contrôlé
```tsx
import { useSafeInput } from '@/hooks/useSafeInput';

const { value, setValue, error } = useSafeInput('', {
  maxLength: 1000,
});

<input
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
{error && <span className="error">{error}</span>}
```

### Pattern 4: Formulaire Complet
```tsx
import { useSafeForm } from '@/hooks/useSafeForm';

const { values, handleChange, sanitizeAll } = useSafeForm({
  name: '',
  email: '',
  message: '',
});

const onSubmit = () => {
  const safeData = sanitizeAll();
  api.post('/submit', safeData);
};
```

### Pattern 5: URL Sanitization
```tsx
import { sanitizeUrl } from '@/services/security/xssProtection';

const safeRedirect = sanitizeUrl(userProvidedUrl);
if (safeRedirect) {
  window.location.href = safeRedirect;
}
```

## ⚠️ Patterns Dangereux à Éviter

### ❌ JAMAIS faire ceci:
```tsx
// Dangereux: Affichage direct
<div>{userInput}</div>

// Dangereux: innerHTML
element.innerHTML = userInput;

// Dangereux: eval
eval(userInput);

// Dangereux: URL non sanitized
<a href={userInput}>Link</a>

// Dangereux: Script injection
<script>var data = {userInput}</script>
```

### ✅ TOUJOURS faire ceci:
```tsx
// Sécurisé: Composant SafeText
<SafeText>{userInput}</SafeText>

// Sécurisé: Hook useSafeInput
const { value } = useSafeInput(userInput);

// Sécurisé: Sanitization manuelle
const safe = XSSProtection.sanitizeText(userInput);
```

## 📋 Checklist de Migration

### Phase 1: Messages et Chat ✅
- [ ] BotMessages.tsx
- [ ] MessagesOverview.tsx
- [ ] ChatInterface.tsx
- [ ] MessageList.tsx
- [ ] MessageItem.tsx
- [ ] ReplyForm.tsx

### Phase 2: Formulaires
- [ ] Tous les inputs de formulaire
- [ ] Tous les textareas
- [ ] Tous les champs éditables

### Phase 3: URLs et Liens
- [ ] Tous les <a href>
- [ ] Tous les window.location
- [ ] Tous les redirects

### Phase 4: Affichage Données
- [ ] Noms utilisateurs
- [ ] Emails
- [ ] Messages de statut
- [ ] Notifications

## 🛡️ Content Security Policy

Headers HTTP recommandés (à configurer côté serveur):
```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## 📊 Tests de Validation

Testez avec ces payloads XSS communs:
```
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
javascript:alert('XSS')
<iframe src="javascript:alert('XSS')">
<svg onload=alert('XSS')>
```

Tous doivent être bloqués ou neutralisés.

## 🎓 Formation Équipe

### Règles d'Or:
1. **JAMAIS** afficher du contenu utilisateur sans sanitization
2. **TOUJOURS** utiliser SafeText pour l'affichage
3. **TOUJOURS** utiliser useSafeInput pour les inputs
4. **TOUJOURS** valider les URLs
5. **JAMAIS** utiliser eval() ou innerHTML avec du contenu utilisateur

### Principe de Base:
> "Tout contenu venant de l'utilisateur est potentiellement dangereux"

Si un utilisateur peut le modifier, il DOIT être sanitizé.
