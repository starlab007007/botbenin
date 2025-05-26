
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book, ChevronRight, Search, Download, Share } from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  content: string;
  subsections?: DocSection[];
}

const documentationData: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Guide de démarrage rapide',
    content: `
# Bienvenue sur Bot.Bj

Bot.Bj est une plateforme complète d'automatisation et d'intelligence artificielle qui vous permet de créer, gérer et déployer des agents IA pour votre entreprise.

## Premiers pas

1. **Créez votre compte** : Inscrivez-vous avec votre email professionnel
2. **Configurez votre profil** : Ajoutez vos informations d'entreprise
3. **Explorez les modules** : Découvrez nos différents agents IA
4. **Créez votre premier chatbot** : Utilisez notre interface intuitive

## Configuration initiale

### Étape 1 : Paramètres du compte
- Accédez à "Mon Compte" dans le menu
- Complétez vos informations personnelles
- Configurez vos préférences de notification

### Étape 2 : Choix de l'abonnement
- Sélectionnez le plan qui correspond à vos besoins
- Configurez votre méthode de paiement
- Activez les fonctionnalités premium

### Étape 3 : Premier projet
- Créez votre premier chatbot
- Définissez les objectifs et la personnalité
- Testez et déployez
    `,
    subsections: [
      {
        id: 'account-setup',
        title: 'Configuration du compte',
        content: 'Guide détaillé pour configurer votre compte Bot.Bj...'
      },
      {
        id: 'first-chatbot',
        title: 'Créer votre premier chatbot',
        content: 'Étapes pour créer et configurer votre premier assistant IA...'
      }
    ]
  },
  {
    id: 'chatbots',
    title: 'Gestion des Chatbots',
    content: `
# Gestion des Chatbots

## Création d'un chatbot

### Interface de création
1. Accédez au module "Chat" depuis le menu principal
2. Cliquez sur "Nouveau Chatbot"
3. Choisissez un modèle ou créez depuis zéro

### Configuration de base
- **Nom** : Donnez un nom unique à votre chatbot
- **Description** : Décrivez son rôle et ses fonctionnalités
- **Personnalité** : Définissez le ton et le style de communication
- **Domaine d'expertise** : Spécifiez les sujets de compétence

### Entraînement et données
- Importez vos documents de formation
- Configurez les réponses automatiques
- Testez les interactions
- Ajustez les paramètres selon les résultats

## Gestion avancée

### Intégrations
- Connectez à vos systèmes existants
- Configurez les webhooks
- Synchronisez avec vos bases de données

### Monitoring et analytics
- Suivez les performances en temps réel
- Analysez les conversations
- Identifiez les points d'amélioration
    `
  },
  {
    id: 'automations',
    title: 'Automatisations avec n8n',
    content: `
# Automatisations avec n8n

## Introduction aux workflows

Bot.Bj intègre n8n, une plateforme d'automatisation puissante qui vous permet de connecter plus de 400 services et API.

### Concepts de base
- **Nœuds** : Chaque service ou action dans votre workflow
- **Connexions** : Liens entre les nœuds pour définir le flux
- **Triggers** : Événements qui déclenchent votre automation
- **Actions** : Tâches exécutées par l'automation

## Création d'un workflow

### Étape 1 : Planification
1. Identifiez le processus à automatiser
2. Listez les systèmes impliqués
3. Définissez les conditions et règles
4. Préparez les données nécessaires

### Étape 2 : Construction
1. Accédez au module "Automatisations"
2. Créez un nouveau workflow
3. Ajoutez les nœuds nécessaires
4. Configurez les connexions
5. Testez chaque étape

### Étape 3 : Déploiement
1. Validez le workflow complet
2. Configurez les notifications
3. Activez l'automation
4. Surveillez les performances

## Exemples pratiques

### Automation email-to-CRM
- Trigger : Réception d'email
- Action 1 : Extraction des données
- Action 2 : Création de contact CRM
- Action 3 : Notification équipe

### Synchronisation multi-plateformes
- Trigger : Nouveau lead
- Action 1 : Création dans CRM
- Action 2 : Ajout à mailing list
- Action 3 : Notification Slack
    `
  },
  {
    id: 'ai-agents',
    title: 'Agents IA spécialisés',
    content: `
# Agents IA Spécialisés

## Agent IA Business

### Fonctionnalités principales
- Analyse de données business
- Génération de rapports automatiques
- Prédictions et recommandations
- Suivi des KPIs en temps réel

### Configuration
1. Définissez vos métriques business
2. Connectez vos sources de données
3. Configurez les alertes et seuils
4. Personnalisez les rapports

## Agent IA Marketing

### Capacités
- Création de contenu automatisée
- Analyse des tendances marché
- Optimisation des campagnes
- Segmentation client intelligente

### Utilisation
1. Définissez votre stratégie marketing
2. Configurez les sources de données
3. Lancez les analyses automatiques
4. Optimisez basé sur les insights

## Agent IA Gestion

### Fonctionnalités
- Automatisation des processus RH
- Gestion des tâches et projets
- Analyse de performance équipe
- Optimisation des ressources

### Mise en place
1. Mappage des processus existants
2. Configuration des workflows
3. Formation de l'agent IA
4. Déploiement progressif

## IA Citoyen

### Services disponibles
- Assistance administrative
- Information sur les services publics
- Aide aux démarches en ligne
- Support multilingue

### Configuration
1. Définition du périmètre de service
2. Intégration aux bases de données
3. Formation sur la réglementation
4. Tests et validation
    `
  }
];

export const DocumentationViewer: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<DocSection>(documentationData[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Book className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Documentation</h2>
          </div>
          
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            />
          </div>

          <nav className="space-y-1">
            {documentationData.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => {
                    setSelectedSection(section);
                    toggleSection(section.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors ${
                    selectedSection.id === section.id 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{section.title}</span>
                  <ChevronRight 
                    className={`w-4 h-4 transition-transform ${
                      expandedSections.includes(section.id) ? 'rotate-90' : ''
                    }`} 
                  />
                </button>
                
                {expandedSections.includes(section.id) && section.subsections && (
                  <div className="ml-4 mt-1 space-y-1">
                    {section.subsections.map((subsection) => (
                      <button
                        key={subsection.id}
                        onClick={() => setSelectedSection(subsection)}
                        className={`w-full text-left px-3 py-1 text-sm rounded-lg transition-colors ${
                          selectedSection.id === subsection.id 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {subsection.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{selectedSection.title}</h1>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
                <Share className="w-4 h-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>
          
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-8">
              <div className="prose max-w-none">
                {formatContent(selectedSection.content)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
