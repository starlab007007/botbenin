
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Search, Filter, ChevronRight, Star, ThumbsUp, ThumbsDown, Share, Download, Eye } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  subcategory: string;
  tags: string[];
  author: string;
  publishDate: Date;
  lastUpdated: Date;
  views: number;
  rating: number;
  helpful: number;
  notHelpful: number;
  difficulty: 'Facile' | 'Moyen' | 'Difficile';
}

const knowledgeBase: Article[] = [
  {
    id: '1',
    title: 'Comment créer un nouveau workflow d\'automatisation',
    summary: 'Guide étape par étape pour créer votre premier workflow avec n8n sur Bot.Bj',
    content: `
# Comment créer un nouveau workflow d'automatisation

## Introduction
Les workflows d'automatisation vous permettent de connecter différents services et d'automatiser vos processus métier. Avec n8n intégré à Bot.Bj, vous pouvez créer des automatisations puissantes sans écrire de code.

## Étapes de création

### 1. Accéder au module Automatisations
- Connectez-vous à votre compte Bot.Bj
- Cliquez sur "Automatisations" dans le menu principal
- Sélectionnez "Nouveau workflow"

### 2. Choisir un déclencheur (Trigger)
Un déclencheur est l'événement qui lance votre workflow. Options disponibles :
- **Webhook** : Déclenché par une requête HTTP
- **Planificateur** : Exécution à intervalles réguliers
- **Email** : Réception d'un email
- **Formulaire** : Soumission de formulaire

### 3. Ajouter des nœuds d'action
Les nœuds d'action exécutent les tâches de votre workflow :
- **CRM** : Créer/modifier des contacts
- **Email** : Envoyer des notifications
- **Base de données** : Stocker/récupérer des données
- **API** : Appeler des services externes

### 4. Configuration des connexions
- Connectez les nœuds dans l'ordre logique
- Configurez les paramètres de chaque nœud
- Testez chaque étape individuellement

### 5. Tests et déploiement
- Utilisez le mode test pour valider le workflow
- Vérifiez les logs d'exécution
- Activez le workflow une fois testé

## Bonnes pratiques
- Documentez vos workflows avec des descriptions claires
- Utilisez des noms explicites pour vos nœuds
- Implémentez une gestion d'erreur appropriée
- Testez avec des données réelles

## Exemples courants
1. **Lead Qualification** : Webhook → Analyse données → CRM → Email
2. **Support Client** : Email → Extraction → Ticket → Notification
3. **Reporting** : Planificateur → Collecte données → Rapport → Envoi
    `,
    category: 'Automatisations',
    subcategory: 'Workflows n8n',
    tags: ['workflow', 'n8n', 'automatisation', 'débutant'],
    author: 'Marie Dubois',
    publishDate: new Date('2024-01-15'),
    lastUpdated: new Date('2024-01-20'),
    views: 1250,
    rating: 4.8,
    helpful: 95,
    notHelpful: 5,
    difficulty: 'Moyen'
  },
  {
    id: '2',
    title: 'Configuration des webhooks n8n dans Bot.Bj',
    summary: 'Apprenez à configurer et utiliser les webhooks pour déclencher vos automatisations',
    content: `
# Configuration des webhooks n8n dans Bot.Bj

## Qu'est-ce qu'un webhook ?
Un webhook est un point d'entrée HTTP qui permet à des applications externes de déclencher vos workflows automatiquement.

## Configuration étape par étape

### 1. Créer un webhook
- Ouvrez l'éditeur de workflow
- Ajoutez un nœud "Webhook"
- Configurez l'URL et la méthode HTTP
- Définissez les paramètres attendus

### 2. Sécurité
- Utilisez HTTPS pour toutes les communications
- Implémentez une authentification par token
- Validez les données reçues
- Limitez les adresses IP autorisées

### 3. Test du webhook
- Utilisez des outils comme Postman ou curl
- Vérifiez les logs d'exécution
- Testez différents scénarios (succès, erreur)

### 4. Intégration
- Documentez l'URL du webhook
- Fournissez des exemples de payload
- Configurez les systèmes clients

## Cas d'usage courants
- Synchronisation CRM
- Notifications en temps réel
- Traitement de formulaires
- Intégrations e-commerce
    `,
    category: 'Automatisations',
    subcategory: 'Webhooks',
    tags: ['webhook', 'API', 'intégration', 'technique'],
    author: 'Jean-Pierre Martin',
    publishDate: new Date('2024-01-10'),
    lastUpdated: new Date('2024-01-18'),
    views: 890,
    rating: 4.6,
    helpful: 78,
    notHelpful: 8,
    difficulty: 'Difficile'
  },
  {
    id: '3',
    title: 'Intégration de vos propres API avec Bot.Bj',
    summary: 'Guide pour connecter vos API personnalisées aux workflows Bot.Bj',
    content: `
# Intégration de vos propres API avec Bot.Bj

## Prérequis
- API REST ou GraphQL fonctionnelle
- Documentation API complète
- Clés d'authentification valides
- Connaissances techniques de base

## Types d'intégration supportés

### REST API
- Méthodes HTTP standards (GET, POST, PUT, DELETE)
- Authentification par token, OAuth2, ou API key
- Format JSON recommandé
- Support des headers personnalisés

### GraphQL
- Queries et mutations supportées
- Authentification intégrée
- Schéma auto-découvert
- Variables dynamiques

## Configuration dans n8n

### 1. Nœud HTTP Request
- URL de votre API
- Méthode HTTP appropriée
- Headers d'authentification
- Body de la requête

### 2. Authentification
- API Key dans headers
- OAuth2 flow complet
- JWT tokens
- Basic Auth

### 3. Gestion des données
- Mapping des champs
- Transformation des formats
- Validation des réponses
- Gestion d'erreurs

## Bonnes pratiques
- Utilisez des environnements de test
- Implémentez un rate limiting
- Documentez vos endpoints
- Surveillez les performances

## Exemples d'intégration
- CRM personnalisé
- Système de facturation
- Plateforme e-learning
- Outils de monitoring
    `,
    category: 'Intégrations',
    subcategory: 'API',
    tags: ['API', 'REST', 'GraphQL', 'intégration', 'avancé'],
    author: 'Sophie Laurent',
    publishDate: new Date('2024-01-05'),
    lastUpdated: new Date('2024-01-15'),
    views: 650,
    rating: 4.9,
    helpful: 88,
    notHelpful: 3,
    difficulty: 'Difficile'
  },
  {
    id: '4',
    title: 'Gestion des utilisateurs et permissions',
    summary: 'Comment gérer les comptes utilisateurs et configurer les permissions sur Bot.Bj',
    content: `
# Gestion des utilisateurs et permissions

## Rôles disponibles

### Administrateur
- Accès complet à toutes les fonctionnalités
- Gestion des utilisateurs et permissions
- Configuration des paramètres système
- Accès aux logs et analytics

### Manager
- Gestion des projets et équipes
- Création et modification des workflows
- Supervision des performances
- Rapports avancés

### Utilisateur Standard
- Utilisation des chatbots et agents IA
- Consultation des rapports
- Accès aux fonctionnalités de base
- Support client

### Invité
- Accès en lecture seule
- Consultation limitée
- Pas de modification
- Fonctionnalités restreintes

## Configuration des permissions

### 1. Accès aux modules
- Chatbots : Création, modification, suppression
- Automatisations : Design, test, déploiement
- Agents IA : Configuration, entraînement
- Analytics : Consultation, export

### 2. Permissions granulaires
- Lecture/Écriture par ressource
- Filtrage par projet/équipe
- Limitations temporelles
- Quotas d'utilisation

### 3. Audit et sécurité
- Logs d'activité détaillés
- Authentification à deux facteurs
- Sessions sécurisées
- Rotation des clés API

## Invitation d'utilisateurs

### Processus standard
1. Accéder aux paramètres utilisateurs
2. Cliquer sur "Inviter un utilisateur"
3. Saisir email et rôle
4. Configurer les permissions
5. Envoyer l'invitation

### Gestion en masse
- Import CSV d'utilisateurs
- Attribution automatique de rôles
- Synchronisation avec AD/LDAP
- Provisioning automatique

## Bonnes pratiques sécurité
- Principe du moindre privilège
- Révision régulière des accès
- Déactivation des comptes inactifs
- Formation des utilisateurs
    `,
    category: 'Administration',
    subcategory: 'Utilisateurs',
    tags: ['utilisateurs', 'permissions', 'sécurité', 'administration'],
    author: 'Marie Dubois',
    publishDate: new Date('2024-01-12'),
    lastUpdated: new Date('2024-01-22'),
    views: 980,
    rating: 4.7,
    helpful: 92,
    notHelpful: 6,
    difficulty: 'Moyen'
  },
  {
    id: '5',
    title: 'Optimisation des performances de vos chatbots',
    summary: 'Techniques pour améliorer la vitesse et la qualité des réponses de vos assistants IA',
    content: `
# Optimisation des performances de vos chatbots

## Métriques de performance

### Temps de réponse
- Objectif : < 2 secondes
- Facteurs d'influence : taille du modèle, complexité de la requête
- Monitoring en temps réel
- Alertes automatiques

### Qualité des réponses
- Pertinence contextuelle
- Précision factuelle
- Cohérence du ton
- Satisfaction utilisateur

### Utilisation des ressources
- Consommation mémoire
- Charge CPU/GPU
- Bande passante réseau
- Coûts d'infrastructure

## Techniques d'optimisation

### 1. Optimisation du modèle
- Fine-tuning pour votre domaine
- Réduction de la taille du modèle
- Quantization des poids
- Distillation de connaissances

### 2. Cache intelligent
- Mise en cache des réponses fréquentes
- Invalidation automatique
- Cache distribué
- Pré-calcul des réponses

### 3. Optimisation des prompts
- Prompts concis et précis
- Structure cohérente
- Exemples représentatifs
- Tests A/B réguliers

### 4. Gestion de la charge
- Load balancing intelligent
- Auto-scaling automatique
- Limitation du débit
- Queue management

## Monitoring et analytics

### Métriques clés
- Temps de réponse moyen
- Taux de satisfaction
- Taux d'escalade humaine
- Volume de conversations

### Outils de monitoring
- Dashboard temps réel
- Alertes proactives
- Rapports automatiques
- Analytics prédictives

### Optimisation continue
- Tests de performance réguliers
- Analyse des logs
- Feedback utilisateur
- Amélioration itérative

## Résolution des problèmes courants

### Réponses lentes
- Vérifier la charge système
- Optimiser les requêtes
- Augmenter les ressources
- Analyser les goulots d'étranglement

### Réponses de mauvaise qualité
- Enrichir les données d'entraînement
- Ajuster les paramètres du modèle
- Améliorer les prompts
- Implémenter un feedback loop
    `,
    category: 'Chatbots',
    subcategory: 'Performance',
    tags: ['performance', 'optimisation', 'chatbot', 'IA', 'technique'],
    author: 'Jean-Pierre Martin',
    publishDate: new Date('2024-01-08'),
    lastUpdated: new Date('2024-01-19'),
    views: 750,
    rating: 4.8,
    helpful: 85,
    notHelpful: 4,
    difficulty: 'Difficile'
  }
];

const categories = ['Tous', 'Automatisations', 'Chatbots', 'Intégrations', 'Administration', 'Agents IA'];
const difficulties = ['Tous', 'Facile', 'Moyen', 'Difficile'];

export const KnowledgeBase: React.FC = () => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Tous');
  const [userRatings, setUserRatings] = useState<{[key: string]: boolean | null}>({});

  const filteredArticles = knowledgeBase.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'Tous' || article.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'Tous' || article.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const formatContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold text-gray-900 mb-4 mt-6">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-gray-800 mb-3 mt-5">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-medium text-gray-700 mb-2 mt-4">{line.slice(4)}</h3>;
      }
      if (line.startsWith('- ')) {
        return <li key={index} className="text-gray-600 mb-1 ml-4">{line.slice(2)}</li>;
      }
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return <p key={index} className="text-gray-600 mb-2 leading-relaxed">{line}</p>;
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Facile': return 'bg-green-100 text-green-800';
      case 'Moyen': return 'bg-yellow-100 text-yellow-800';
      case 'Difficile': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRating = (articleId: string, isHelpful: boolean) => {
    setUserRatings(prev => ({
      ...prev,
      [articleId]: isHelpful
    }));
  };

  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <Button 
            onClick={() => setSelectedArticle(null)}
            variant="outline" 
            className="mb-6 text-gray-700 border-gray-300"
          >
            ← Retour à la base de connaissances
          </Button>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl text-gray-900 mb-2">{selectedArticle.title}</CardTitle>
                  <p className="text-gray-600 mb-4">{selectedArticle.summary}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Par {selectedArticle.author}</span>
                    <span>•</span>
                    <span>{selectedArticle.publishDate.toLocaleDateString('fr-FR')}</span>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{selectedArticle.views} vues</span>
                    </div>
                    <span>•</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(selectedArticle.difficulty)}`}>
                      {selectedArticle.difficulty}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
                    <Share className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="prose max-w-none mb-8">
                {formatContent(selectedArticle.content)}
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cet article vous a-t-il été utile ?</h3>
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={() => handleRating(selectedArticle.id, true)}
                    variant={userRatings[selectedArticle.id] === true ? "default" : "outline"}
                    size="sm"
                    className={userRatings[selectedArticle.id] === true ? "bg-green-600 text-white" : "text-gray-700 border-gray-300"}
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Oui ({selectedArticle.helpful})
                  </Button>
                  <Button
                    onClick={() => handleRating(selectedArticle.id, false)}
                    variant={userRatings[selectedArticle.id] === false ? "default" : "outline"}
                    size="sm"
                    className={userRatings[selectedArticle.id] === false ? "bg-red-600 text-white" : "text-gray-700 border-gray-300"}
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Non ({selectedArticle.notHelpful})
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedArticle.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Base de Connaissances</h1>
          <p className="text-gray-600">Articles détaillés et solutions pour maîtriser Bot.Bj</p>
        </div>

        {/* Filters */}
        <Card className="bg-white border border-gray-200 mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un article..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulté</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  {difficulties.map(difficulty => (
                    <option key={difficulty} value={difficulty}>{difficulty}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{article.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{article.summary}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ml-2 ${getDifficultyColor(article.difficulty)}`}>
                    {article.difficulty}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-3">
                    <span>{article.category}</span>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>{article.rating}</span>
                    </div>
                    <span>•</span>
                    <span>{article.views} vues</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {article.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                  {article.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{article.tags.length - 3}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Par {article.author} • {article.publishDate.toLocaleDateString('fr-FR')}
                  </div>
                  <Button 
                    onClick={() => setSelectedArticle(article)}
                    variant="outline" 
                    size="sm"
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    Lire l'article
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun article trouvé</h3>
            <p className="text-gray-600">Essayez de modifier vos critères de recherche</p>
          </div>
        )}
      </div>
    </div>
  );
};
