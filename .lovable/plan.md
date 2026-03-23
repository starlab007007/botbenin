

# Plan : Simplifier la navigation sidebar - 4 modules uniquement

## Contexte
La sidebar `ModernSidebar.tsx` contient actuellement 7 sections avec 12+ items. L'objectif est de n'afficher que 4 modules principaux, en masquant (commentant) les autres sans les supprimer.

## 4 modules a garder

| Module | Route | Icon | Description |
|--------|-------|------|-------------|
| Dashboard | `/dashboard` | BarChart3 | Tableaux de bord |
| Mes Bots | `/bots` | Bot | Gestion des bots |
| CRM | `/prospects` | Target | Fusion Création Bots + Prospects |
| WhatsApp IA | `/whatsapp-connect` | WhatsApp icon | Connexion WhatsApp |

## Fichiers a modifier

### 1. `src/components/navigation/ModernSidebar.tsx`
- Remplacer toutes les sections actuelles (Menu Principal, Bots & Automatisation, Communication, CRM & Prospects, Modules IA, Ressources) par une seule section "Menu Principal" contenant les 4 items
- Masquer via commentaire les arrays : `mainMenuItems` (Accueil, Kpakpato), `botManagementItems` (Création Bots), `crmItems` (IA Prospect, IA Business), `aiModules` (IA Créateur), `resourceItems` (Fonctionnalités)
- Conserver la section Administration (admin only) et Mon Compte en bas
- Le CRM regroupera l'accès aux sous-pages Prospects + Knowledge Bases depuis sa page

### 2. `src/components/Sidebar.tsx`
- Mettre a jour les `menuItems` pour refléter les 4 modules : Dashboard, Mes Bots, CRM, WhatsApp IA
- Supprimer la section `aiModules` (Agent IA Business)

### 3. `src/components/MobileSidebar.tsx`
- Meme simplification : 4 items principaux uniquement
- Supprimer la section `aiModules`

### 4. `src/components/navigation/ModernTopHeader.tsx`
- Mettre a jour les `navItems` pour correspondre aux 4 modules

## Details techniques
- Les routes existantes (`/modules/business`, `/knowledge-bases`, `/ia-prospect-precall`, etc.) restent dans `App.tsx` et accessibles par URL directe
- Seule la navigation visible est simplifiée
- Le code masqué sera commenté avec `// HIDDEN - kept for future use`

