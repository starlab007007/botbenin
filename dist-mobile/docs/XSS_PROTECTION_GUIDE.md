# Guide de Protection XSS

## 🔒 Introduction

Ce guide détaille les mesures de protection contre les attaques XSS (Cross-Site Scripting) mises en place sur la plateforme Bot BJ.

## 🎯 Objectifs

1. **Prévenir** les injections de scripts malveillants
2. **Sécuriser** les entrées utilisateurs
3. **Protéger** les données sensibles
4. **Maintenir** un niveau de sécurité élevé

## 🛡️ Mesures de protection

### 1. Sanitization des entrées

```typescript
import DOMPurify from 'dompurify';

// Nettoyer tout HTML suspect
const cleanHtml = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
  ALLOWED_ATTR: []
});
```

### 2. Content Security Policy (CSP)

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';">
```

### 3. Validation côté serveur

```typescript
// Validation stricte des données
const validateInput = (input: string): boolean => {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(input));
};
```

### 4. Échappement des caractères

```typescript
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, m => map[m]);
};
```

## ✅ Checklist de sécurité

- [ ] Tous les inputs utilisateurs sont validés
- [ ] DOMPurify est utilisé pour nettoyer le HTML
- [ ] CSP est configuré correctement
- [ ] Les cookies sont marqués HttpOnly et Secure
- [ ] Les tokens CSRF sont en place
- [ ] Les en-têtes de sécurité sont configurés
- [ ] Les dépendances sont à jour
- [ ] Les tests de sécurité sont automatisés

## 🔍 Tests de sécurité

### Tests manuels

```javascript
// Tester l'injection de script
const testPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror="alert(1)">',
  'javascript:alert(1)',
  '<svg onload="alert(1)">'
];

testPayloads.forEach(payload => {
  // Vérifier que le payload est neutralisé
  const cleaned = sanitizeInput(payload);
  console.assert(!cleaned.includes('<script'));
});
```

### Tests automatisés

```typescript
describe('XSS Protection', () => {
  it('should sanitize malicious scripts', () => {
    const malicious = '<script>alert("hack")</script>';
    const result = DOMPurify.sanitize(malicious);
    expect(result).not.toContain('<script');
  });
  
  it('should escape HTML entities', () => {
    const html = '<div>Test</div>';
    const escaped = escapeHtml(html);
    expect(escaped).toBe('&lt;div&gt;Test&lt;/div&gt;');
  });
});
```

## 📊 Monitoring et alertes

### Logs de sécurité

```typescript
const logSecurityEvent = (event: {
  type: 'XSS_ATTEMPT' | 'VALIDATION_FAILURE';
  payload: string;
  userId?: string;
  timestamp: Date;
}) => {
  // Logger l'événement suspect
  console.warn('[SECURITY]', event);
  
  // Envoyer une alerte si critique
  if (event.type === 'XSS_ATTEMPT') {
    alertSecurityTeam(event);
  }
};
```

## 🚀 Meilleures pratiques

1. **Ne jamais faire confiance aux entrées utilisateurs**
2. **Toujours valider côté serveur**
3. **Utiliser des bibliothèques éprouvées** (DOMPurify, validator.js)
4. **Mettre à jour régulièrement** les dépendances
5. **Former l'équipe** aux bonnes pratiques de sécurité
6. **Effectuer des audits** de sécurité réguliers

## 📚 Ressources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## 🆘 En cas d'incident

1. **Isoler** le système compromis
2. **Analyser** les logs de sécurité
3. **Identifier** la faille
4. **Patcher** immédiatement
5. **Notifier** les utilisateurs si nécessaire
6. **Documenter** l'incident
7. **Renforcer** les protections

---

**Dernière mise à jour** : 2025-01-08
**Contact sécurité** : security@bot.bj
