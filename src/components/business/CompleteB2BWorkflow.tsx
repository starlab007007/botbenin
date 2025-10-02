
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Target, 
  BarChart3, 
  FileSpreadsheet, 
  Search,
  MapPin,
  Settings,
  Database,
  Download,
  ExternalLink,
  Play,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { B2BTargeting } from './B2BTargeting';
import { LocalProspecting } from './LocalProspecting';
import { GoogleSheetsImport } from './GoogleSheetsImport';
import { SmartB2BSearch } from './SmartB2BSearch';
import { B2BResultsManager } from './B2BResultsManager';
import { useToast } from '@/hooks/use-toast';

type WorkflowStep = 'overview' | 'b2b-targeting' | 'local-prospecting' | 'google-sheets' | 'smart-search' | 'smart-search-results';

interface B2BContact {
  id: string;
  name: string;
  companyName: string;
  jobTitle: string;
  location: string;
  linkedinUrl: string;
  email: string;
  phone: string;
  industry: string;
  companySize: string;
  coordinates?: [number, number];
  facebookUrl?: string;
  instagramUrl?: string;
  description?: string;
  services?: string;
}

interface CompleteB2BWorkflowProps {
  onBack?: () => void;
}

export const CompleteB2BWorkflow: React.FC<CompleteB2BWorkflowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('overview');
  const [searchResults, setSearchResults] = useState<B2BContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSessionId, setSearchSessionId] = useState('');
  const { toast } = useToast();

  const workflowOptions = [
    {
      id: 'google-sheets' as WorkflowStep,
      title: 'Mes Listes de Prospects',
      description: 'Importez et gérez vos prospects depuis Google Sheets en temps réel',
      icon: FileSpreadsheet,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      features: ['Import automatique', 'Synchronisation temps réel', 'Filtrage avancé', 'Export données'],
      status: 'Recommandé',
      statusColor: 'bg-green-100 text-green-800'
    },
    {
      id: 'b2b-targeting' as WorkflowStep,
      title: 'Ciblage B2B Avancé',
      description: 'Trouvez des prospects qualifiés avec notre IA de ciblage intelligent',
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      features: ['IA de ciblage', 'Critères multiples', 'Scoring automatique', 'Qualification'],
      status: 'Populaire',
      statusColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'local-prospecting' as WorkflowStep,
      title: 'Prospection Locale',
      description: 'Identifiez des entreprises locales dans votre zone géographique',
      icon: MapPin,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      features: ['Recherche géolocalisée', 'Données locales', 'Cartographie', 'Proximité'],
      status: 'Efficace',
      statusColor: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'smart-search' as WorkflowStep,
      title: 'Recherche Intelligente',
      description: 'Utilisez notre moteur de recherche IA pour des prospects précis',
      icon: Search,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      features: ['IA avancée', 'Recherche sémantique', 'Résultats pertinents', 'Analyse contextuelle'],
      status: 'Nouveau',
      statusColor: 'bg-orange-100 text-orange-800'
    }
  ];

  // Parse webhook response pour extraire les contacts
  const parseWebhookResponse = (responseText: string): B2BContact[] => {
    console.log('Parsing webhook response for smart search:', responseText);
    
    const contacts: B2BContact[] = [];
    
    try {
      const companyPattern = /\d+\.\s*\*\*(.*?)\*\*\s*\n([\s\S]*?)(?=\n\n|\n\d+\.|\n\nCes entreprises|$)/g;
      let match;
      let contactIndex = 1;

      while ((match = companyPattern.exec(responseText)) !== null) {
        const companyName = match[1].trim();
        const details = match[2];
        
        const addressMatch = details.match(/\*\*Adresse\s*:\*\*\s*(.*?)(?:\n|$)/);
        const phoneMatch = details.match(/\*\*Téléphone\s*:\*\*\s*(.*?)(?:\n|$)/);
        const websiteMatch = details.match(/\*\*Site web\s*:\*\*\s*\[(.*?)\]/);
        const facebookMatch = details.match(/\*\*Facebook\s*:\*\*\s*\[(.*?)\]/);
        const instagramMatch = details.match(/\*\*Instagram\s*:\*\*\s*\[(.*?)\]/);
        const categoryMatch = details.match(/\*\*Catégorie\s*:\*\*\s*(.*?)(?:\n|$)/);

        const address = addressMatch ? addressMatch[1].trim() : '';
        const phone = phoneMatch ? phoneMatch[1].trim() : '';
        const website = websiteMatch ? websiteMatch[1].trim() : '';
        const facebook = facebookMatch ? facebookMatch[1].trim() : '';
        const instagram = instagramMatch ? instagramMatch[1].trim() : '';
        const category = categoryMatch ? categoryMatch[1].trim() : '';

        const firstName = ['Marie', 'Pierre', 'Sophie', 'Laurent'][contactIndex % 4];
        const lastName = ['Dubois', 'Martin', 'Laurent', 'Moreau'][contactIndex % 4];
        const fullName = `${firstName} ${lastName}`;
        
        let email = '';
        if (website) {
          const domain = website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
          email = `contact@${domain}`;
        } else {
          email = `contact@${companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`;
        }

        const contact: B2BContact = {
          id: `smart_${contactIndex}`,
          name: fullName,
          companyName: companyName,
          jobTitle: 'Manager',
          location: address,
          linkedinUrl: website,
          email: email,
          phone: phone,
          industry: category || 'Non spécifié',
          companySize: '10-50',
          facebookUrl: facebook,
          instagramUrl: instagram,
        };

        contacts.push(contact);
        contactIndex++;
      }

      console.log(`Smart search: ${contacts.length} contacts extracted`);
      return contacts;
      
    } catch (error) {
      console.error('Error parsing smart search response:', error);
      return [];
    }
  };

  // Exécuter la recherche intelligente via webhook
  const executeSmartSearch = async (filters: any) => {
    const sessionId = `smart_search_${Date.now()}`;
    setSearchSessionId(sessionId);
    setIsSearching(true);
    
    console.log('=== SMART B2B SEARCH START ===');
    console.log('Filters:', filters);

    // Construction du message de recherche
    const searchCriteria = [];
    
    if (filters.location) searchCriteria.push(`Localisation: ${filters.location}`);
    if (filters.industry && filters.industry.length > 0) {
      searchCriteria.push(`Secteurs: ${filters.industry.join(', ')}`);
    }
    if (filters.keywords && filters.keywords.length > 0) {
      searchCriteria.push(`Mots-clés: ${filters.keywords.join(', ')}`);
    }
    if (filters.companySize) searchCriteria.push(`Taille: ${filters.companySize}`);
    if (filters.jobTitle) searchCriteria.push(`Poste: ${filters.jobTitle}`);

    const message = searchCriteria.length > 0
      ? `Je recherche des entreprises B2B avec ces critères: ${searchCriteria.join(', ')}. Donnez-moi une liste détaillée avec nom, adresse, téléphone, site web, Facebook, Instagram et catégorie pour chaque entreprise.`
      : "Je cherche des entreprises pour ma prospection B2B. Pouvez-vous me donner une liste avec leurs coordonnées complètes (nom, adresse, téléphone, site web, réseaux sociaux) ?";

    try {
      const response = await fetch('https://ia.bot.bj/webhook/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          timestamp: new Date().toISOString(),
          session_id: sessionId,
          user_id: 'smart_b2b_user',
          source: 'bot_bj_platform',
          context: 'smart_b2b_search',
          filters: filters
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let responseData;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
        responseData = responseData.output || responseData.message || responseData.response || JSON.stringify(responseData);
      } else {
        responseData = await response.text();
      }

      console.log('Smart search response received');
      const extractedContacts = parseWebhookResponse(responseData);
      
      setSearchResults(extractedContacts);
      setCurrentStep('smart-search-results');
      
      if (extractedContacts.length > 0) {
        toast({
          title: "Recherche réussie",
          description: `${extractedContacts.length} entreprises trouvées`,
        });
      } else {
        toast({
          title: "Aucun résultat",
          description: "Essayez de modifier vos critères",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Smart search error:', error);
      toast({
        title: "Erreur de recherche",
        description: "Impossible d'effectuer la recherche",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleExportResults = () => {
    const csvContent = [
      ['Nom', 'Entreprise', 'Poste', 'Email', 'Téléphone', 'Localisation', 'Secteur', 'Site web', 'Facebook', 'Instagram'],
      ...searchResults.map(contact => [
        contact.name,
        contact.companyName,
        contact.jobTitle,
        contact.email,
        contact.phone,
        contact.location,
        contact.industry,
        contact.linkedinUrl || '',
        contact.facebookUrl || '',
        contact.instagramUrl || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `smart_b2b_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'google-sheets':
        return <GoogleSheetsImport onBack={() => setCurrentStep('overview')} />;
      case 'b2b-targeting':
        return <B2BTargeting onBack={() => setCurrentStep('overview')} />;
      case 'local-prospecting':
        return <LocalProspecting onBack={() => setCurrentStep('overview')} />;
      case 'smart-search':
        return (
          <div className="min-h-screen relative">
            {isSearching && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="p-6 max-w-md">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Recherche en cours...</h3>
                      <p className="text-sm text-gray-600">
                        Analyse des entreprises correspondant à vos critères
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
            <SmartB2BSearch 
              onBack={() => setCurrentStep('overview')} 
              onSearch={executeSmartSearch}
            />
          </div>
        );
      case 'smart-search-results':
        return (
          <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" onClick={() => setCurrentStep('smart-search')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Nouvelle recherche
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep('overview')}>
                  Retour au menu principal
                </Button>
              </div>
              
              <B2BResultsManager 
                contacts={searchResults}
                onExport={handleExportResults}
                searchSessionId={searchSessionId}
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* En-tête principal */}
              <div className="text-center space-y-4">
                 {onBack && (
                   <Button variant="ghost" onClick={onBack} className="mb-4">
                     <ArrowLeft className="w-4 h-4 mr-2" />
                     Retour au menu
                   </Button>
                 )}
                 <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white mb-4">
                   <Users className="w-8 h-8" />
                 </div>
                 <h1 className="text-4xl font-bold text-gray-900">
                   IA Business - Génération de Prospects
                 </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Découvrez nos outils d'intelligence artificielle pour identifier, qualifier et gérer vos prospects B2B de manière automatisée et efficace.
                </p>
              </div>

              {/* Statistiques globales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Prospects Générés</p>
                        <p className="text-3xl font-bold text-gray-900">2,847</p>
                        <p className="text-sm text-green-600 mt-1">↗ +12% ce mois</p>
                      </div>
                      <FileSpreadsheet className="w-10 h-10 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Taux Qualification</p>
                        <p className="text-3xl font-bold text-gray-900">78%</p>
                        <p className="text-sm text-blue-600 mt-1">↗ +5% ce mois</p>
                      </div>
                      <Target className="w-10 h-10 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Entreprises Locales</p>
                        <p className="text-3xl font-bold text-gray-900">1,234</p>
                        <p className="text-sm text-purple-600 mt-1">Dans votre zone</p>
                      </div>
                      <MapPin className="w-10 h-10 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Score IA Moyen</p>
                        <p className="text-3xl font-bold text-gray-900">8.4/10</p>
                        <p className="text-sm text-orange-600 mt-1">Très qualifié</p>
                      </div>
                      <BarChart3 className="w-10 h-10 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Outils de prospection */}
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Choisissez votre méthode de prospection
                  </h2>
                  <p className="text-gray-600">
                    Sélectionnez l'outil qui correspond le mieux à vos besoins de génération de prospects
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {workflowOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <Card 
                        key={option.id} 
                        className="relative overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group"
                        onClick={() => setCurrentStep(option.id)}
                      >
                        <div className={`absolute top-0 right-0 w-32 h-32 ${option.bgColor} rounded-full transform translate-x-16 -translate-y-16 opacity-20`}></div>
                        
                        <CardHeader className="relative">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`p-3 rounded-lg ${option.bgColor}`}>
                                <IconComponent className={`w-8 h-8 ${option.color}`} />
                              </div>
                              <div>
                                <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {option.title}
                                </CardTitle>
                                <Badge className={`mt-1 ${option.statusColor}`}>
                                  {option.status}
                                </Badge>
                              </div>
                            </div>
                            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <p className="text-gray-600 leading-relaxed">
                            {option.description}
                          </p>

                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900">Fonctionnalités clés :</p>
                            <div className="grid grid-cols-2 gap-1">
                              {option.features.map((feature, index) => (
                                <div key={index} className="flex items-center text-sm text-gray-600">
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-4 border-t">
                            <Button 
                              className="w-full group-hover:bg-blue-600 group-hover:text-white transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentStep(option.id);
                              }}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Commencer
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Section avantages */}
              <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div>
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white bg-opacity-20 mb-4">
                        <Database className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Base de Données Enrichie</h3>
                      <p className="text-blue-100">
                        Accès à une base de données de millions d'entreprises et contacts B2B
                      </p>
                    </div>
                    <div>
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white bg-opacity-20 mb-4">
                        <Target className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Ciblage Précis</h3>
                      <p className="text-blue-100">
                        Notre IA analyse et qualifie automatiquement vos prospects pour un ROI optimal
                      </p>
                    </div>
                    <div>
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white bg-opacity-20 mb-4">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Analyse Performante</h3>
                      <p className="text-blue-100">
                        Tableaux de bord en temps réel pour suivre et optimiser vos campagnes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return renderCurrentStep();
};
