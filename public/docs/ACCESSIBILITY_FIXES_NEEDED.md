# ♿ Corrections d'Accessibilité Nécessaires

## 📋 Vue d'ensemble

Ce document liste toutes les corrections nécessaires pour améliorer l'accessibilité de la plateforme Bot BJ selon les standards WCAG 2.1 niveau AA.

**Statut actuel** : 72/100 (Lighthouse)  
**Objectif** : 95/100  
**Priorité** : Haute

## 🎯 Standards Visés

### WCAG 2.1 Niveau AA

Les critères principaux :
1. **Perceptible** : L'information et les composants de l'interface utilisateur doivent être présentables
2. **Utilisable** : Les composants de l'interface utilisateur et la navigation doivent être utilisables
3. **Compréhensible** : L'information et l'utilisation de l'interface utilisateur doivent être compréhensibles
4. **Robuste** : Le contenu doit être suffisamment robuste pour être interprété de manière fiable

## 🔴 Problèmes Critiques

### 1. Contraste des couleurs insuffisant

**Problème** :
- Texte gris sur fond blanc : ratio 2.8:1 (min requis: 4.5:1)
- Boutons secondaires : ratio 3.2:1
- Liens dans le footer : ratio 3.5:1

**Localisation** :
```
- src/components/ui/button.tsx (variant="ghost")
- src/components/navigation/Footer.tsx
- src/pages/Dashboard.tsx (statistiques)
```

**Solution** :
```css
/* Avant */
.text-muted { color: #9CA3AF; } /* Ratio 2.8:1 ❌ */

/* Après */
.text-muted { color: #6B7280; } /* Ratio 4.6:1 ✅ */
```

**Impact** : Affects 1,000+ éléments

### 2. Images sans texte alternatif

**Problème** :
- 45 images sans attribut `alt`
- 12 images avec `alt=""`  vide pour images informatives
- 8 images décoratives non marquées avec `role="presentation"`

**Exemples** :
```jsx
// ❌ Mauvais
<img src="/dashboard-chart.png" />

// ✅ Bon
<img 
  src="/dashboard-chart.png" 
  alt="Graphique montrant l'évolution des conversations sur les 7 derniers jours"
/>

// ✅ Image décorative
<img 
  src="/decoration.svg" 
  alt=""
  role="presentation"
/>
```

**Fichiers concernés** :
- `src/pages/Dashboard.tsx`
- `src/components/marketing/*`
- `src/pages/HomePage.tsx`

### 3. Focus non visible

**Problème** :
- Outline supprimé globalement
- Pas d'indicateur focus personnalisé
- Impossible de naviguer au clavier

**Solution** :
```css
/* Ne JAMAIS faire */
* { outline: none !important; }

/* Solution recommandée */
*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}

button:focus-visible {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}
```

**Fichiers à modifier** :
- `src/index.css` (supprimer outline: none)
- Tous les composants UI

## 🟡 Problèmes Majeurs

### 4. Structure de heading incorrecte

**Problème** :
- H1 manquant sur plusieurs pages
- Saut de niveaux (H1 → H3)
- Plusieurs H1 sur la même page

**Structure actuelle** (Dashboard) :
```
<div>Dashboard</div>  ❌ Pas de heading
<h3>Statistiques</h3> ❌ Pas de H2
<h4>Messages</h4>
<h2>Activité</h2>     ❌ Après H4
```

**Structure correcte** :
```
<h1>Dashboard</h1>
  <h2>Statistiques</h2>
    <h3>Messages</h3>
    <h3>Utilisateurs</h3>
  <h2>Activité Récente</h2>
```

**Impact** : 15 pages concernées

### 5. Labels manquants sur les formulaires

**Problème** :
- Inputs avec placeholder mais sans label
- Labels non associés (pas de `for`)
- ARIA labels manquants

**Exemples incorrects** :
```jsx
// ❌ Mauvais
<input placeholder="Votre email" />

// ❌ Label non associé
<label>Email</label>
<input />

// ✅ Correct
<label htmlFor="email">Email</label>
<input id="email" name="email" type="email" />

// ✅ Ou avec ARIA
<input 
  type="email"
  aria-label="Adresse email"
  placeholder="exemple@email.com"
/>
```

**Formulaires à corriger** :
- Login / Signup forms
- Bot configuration
- Profile settings
- Search inputs

### 6. Boutons non accessibles

**Problème** :
- `<div>` utilisés comme boutons
- Pas de nom accessible
- Pas de gestion clavier

**Code problématique** :
```jsx
// ❌ Mauvais
<div onClick={handleClick}>
  <Icon name="trash" />
</div>

// ✅ Correct
<button 
  onClick={handleClick}
  aria-label="Supprimer la conversation"
>
  <Icon name="trash" aria-hidden="true" />
</button>
```

**Localisation** :
- `src/components/chat/MessageActions.tsx`
- `src/components/bots/BotCard.tsx`
- Toutes les icônes cliquables

## 🟢 Problèmes Mineurs

### 7. Langue de la page non déclarée

**Problème** :
```html
<!DOCTYPE html>
<html> <!-- ❌ Pas de lang -->
```

**Solution** :
```html
<!DOCTYPE html>
<html lang="fr">
```

**Fichier** : `index.html`

### 8. Landmarks ARIA manquants

**Problème** :
Structure sémantique insuffisante

**Avant** :
```jsx
<div className="header">...</div>
<div className="main">...</div>
<div className="sidebar">...</div>
<div className="footer">...</div>
```

**Après** :
```jsx
<header role="banner">...</header>
<main role="main">...</main>
<aside role="complementary" aria-label="Navigation">...</aside>
<footer role="contentinfo">...</footer>
```

### 9. Liens non descriptifs

**Problème** :
```jsx
// ❌ Mauvais
<a href="/docs">Cliquez ici</a>
<a href="/about">En savoir plus</a>

// ✅ Bon
<a href="/docs">Consulter la documentation complète</a>
<a href="/about">En savoir plus sur Bot BJ</a>
```

**Pages concernées** :
- Toutes les landing pages
- Blog posts
- Navigation footer

### 10. Vidéos sans sous-titres

**Problème** :
- Tutoriels vidéo sans captions
- Pas de transcription textuelle
- Contrôles non accessibles clavier

**Solution requise** :
```jsx
<video controls>
  <source src="tutorial.mp4" type="video/mp4" />
  <track 
    kind="captions" 
    src="tutorial-fr.vtt" 
    srclang="fr" 
    label="Français"
    default
  />
  <track 
    kind="descriptions"
    src="tutorial-desc.vtt"
    srclang="fr"
    label="Descriptions audio"
  />
</video>
```

## 🛠️ Plan de Correction

### Phase 1 : Critiques (Semaine 1-2)

**Priorité immédiate** :
- [ ] Corriger tous les contrastes < 4.5:1
- [ ] Ajouter alt text sur toutes les images
- [ ] Restaurer focus visible
- [ ] Ajouter labels sur tous les inputs

**Estimation** : 40 heures
**Impact** : Score +15 points

### Phase 2 : Majeurs (Semaine 3-4)

**Importantes mais moins urgentes** :
- [ ] Restructurer headings
- [ ] Convertir `<div>` boutons en `<button>`
- [ ] Ajouter ARIA labels manquants
- [ ] Navigation clavier complète

**Estimation** : 30 heures
**Impact** : Score +8 points

### Phase 3 : Mineurs (Semaine 5-6)

**Finitions** :
- [ ] Landmarks ARIA
- [ ] Liens descriptifs
- [ ] Langue déclarée
- [ ] Sous-titres vidéos
- [ ] Skip links

**Estimation** : 20 heures
**Impact** : Score +5 points

## ✅ Checklist par Composant

### Boutons
- [ ] Utilisent `<button>` ou `<a>` (pas `<div>`)
- [ ] Ont un nom accessible (texte ou aria-label)
- [ ] Focus visible
- [ ] Taille minimum 44x44px (touch target)
- [ ] Contraste suffisant (tous les états)

### Formulaires
- [ ] Tous les inputs ont un label associé
- [ ] Messages d'erreur accessibles (aria-describedby)
- [ ] Required fields indiqués
- [ ] Autocomplete attributes
- [ ] Validation côté client accessible

### Images
- [ ] Alt text descriptif
- [ ] Images décoratives avec alt="" et role="presentation"
- [ ] Pas de texte important dans les images
- [ ] Logos ont un texte alternatif court

### Navigation
- [ ] Structure landmark claire
- [ ] Skip to main content link
- [ ] Menu accessible clavier
- [ ] Current page indiquée (aria-current)
- [ ] Breadcrumbs si applicable

### Tableaux
- [ ] Caption présent
- [ ] Headers (`<th>`) avec scope
- [ ] Données complexes : associations explicites
- [ ] Responsive (pas de scroll horizontal)

### Modales/Dialogs
- [ ] Focus trapped
- [ ] ESC pour fermer
- [ ] Focus retourné après fermeture
- [ ] role="dialog" et aria-labelledby
- [ ] Backdrop click pour fermer (optionnel)

## 🧪 Tests Recommandés

### Outils automatisés
1. **axe DevTools** : Scan automatique
2. **WAVE** : Validation visuelle
3. **Lighthouse** : Score global
4. **Pa11y** : Tests CI/CD

### Tests manuels
1. **Navigation clavier** :
   - Tab à travers tous les éléments
   - Vérifier focus visible
   - Tester raccourcis clavier

2. **Screen reader** :
   - NVDA (Windows)
   - JAWS (Windows)
   - VoiceOver (macOS/iOS)
   - TalkBack (Android)

3. **Zoom** :
   - Tester jusqu'à 200% zoom
   - Pas de scroll horizontal
   - Texte lisible

4. **Contraste** :
   - Vérifier tous les états (hover, focus, disabled)
   - Mode sombre aussi
   - Tester avec simulateur daltonisme

## 📚 Ressources

### Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Outils
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)

### Formation
- [Web Accessibility by Google](https://web.dev/accessibility/)
- [A11ycasts by Google Chrome](https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g)

## 💰 Estimation Budget

### Développement
- Phase 1 (Critiques) : 40h × $50/h = **$2,000**
- Phase 2 (Majeurs) : 30h × $50/h = **$1,500**
- Phase 3 (Mineurs) : 20h × $50/h = **$1,000**
- **Total dev** : **$4,500**

### Audit externe (optionnel)
- Audit complet : **$2,000-5,000**
- Certification WCAG : **$3,000-8,000**

### Formation équipe
- Workshop 1 jour : **$1,000**
- Documentation interne : **$500**

**Budget total estimé** : **$6,000-19,000**

## 📈 ROI Attendu

### Bénéfices
1. **Marché élargi** : +15% utilisateurs potentiels
2. **SEO** : Meilleur ranking Google
3. **Légal** : Conformité réglementaire
4. **Réputation** : Image inclusive
5. **UX** : Meilleure expérience pour tous

### Risques si non corrigé
- Exclusion d'utilisateurs
- Poursuites légales possibles
- Pénalités SEO
- Mauvaise réputation

---

**Dernière mise à jour** : 2025-01-08  
**Responsable** : Équipe Frontend  
**Deadline** : 2025-02-15  
**Contact** : accessibility@bot.bj
