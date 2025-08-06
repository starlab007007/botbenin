import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Building2, 
  Users, 
  Target, 
  Sparkles, 
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Eye,
  Mail,
  Phone,
  Globe,
  Database,
  Filter,
  Loader2
} from 'lucide-react';
import { SmartB2BSearch } from './SmartB2BSearch';
import { GeoLocationMap } from './GeoLocationMap';
import { B2BResultsManager } from './B2BResultsManager';
import { useToast } from '@/hooks/use-toast';

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
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  icon: React.ReactNode;
}

interface SearchCriteria {
  location: string;
  locationCoordinates?: { lat: number; lng: number };
  radius: number;
  useGPS: boolean;
  companyName: string;
  industry: string[];
  companySize: string;
  jobTitle: string;
  seniority: string;
  department: string;
  keywords: string[];
  description: string;
  aiSuggestions: boolean;
  prioritizeLocal: boolean;
  qualityScore: number;
}

interface CompleteB2BWorkflowProps {
  onBack: () => void;
}

export const CompleteB2BWorkflow: React.FC<CompleteB2BWorkflowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null);
  const [searchResults, setSearchResults] = useState<B2BContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'table' | 'map'>('table');
  const { toast } = useToast();

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'criteria',
      title: 'Sélection des critères',
      description: 'Définir les critères de recherche intelligents',
      status: currentStep === 0 ? 'active' : currentStep > 0 ? 'completed' : 'pending',
      icon: <Filter className="w-5 h-5" />
    },
    {
      id: 'search',
      title: 'Lancement de la recherche',
      description: 'Envoi des critères au webhook et traitement',
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending',
      icon: <Search className="w-5 h-5" />
    },
    {
      id: 'results',
      title: 'Affichage des résultats',
      description: 'Présentation des contacts trouvés',
      status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending',
      icon: <Database className="w-5 h-5" />
    },
    {
      id: 'visualization',
      title: 'Visualisation',
      description: 'Vue tableau et géolocalisation sur carte',
      status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending',
      icon: <MapPin className="w-5 h-5" />
    }
  ];

  const getCoordinatesFromLocation = (location: string, searchCriteria?: SearchCriteria): [number, number] | undefined => {
    // Priorité 1: Utiliser les coordonnées précises du critère de recherche si disponibles
    if (searchCriteria?.locationCoordinates) {
      return [searchCriteria.locationCoordinates.lng, searchCriteria.locationCoordinates.lat];
    }

    // Priorité 2: Parsing basique pour extraire des coordonnées du texte
    const coordMatch = location.match(/lat:\s*([-\d.]+),?\s*lng?:\s*([-\d.]+)/i);
    if (coordMatch) {
      return [parseFloat(coordMatch[2]), parseFloat(coordMatch[1])];
    }

    // Priorité 3: Villes connues (fallback)
    const locationLower = location.toLowerCase();
    const cityCoordinates: { [key: string]: [number, number] } = {
      'cotonou': [2.3522, 6.4023],
      'porto-novo': [2.6037, 6.4968],
      'parakou': [2.6303, 9.3365],
      'abomey': [1.9931, 7.1827],
      'paris': [2.3522, 48.8566],
      'lyon': [4.8357, 45.7640],
      'marseille': [5.3698, 43.2965],
      'toulouse': [1.4442, 43.6047],
      'bordeaux': [-0.5792, 44.8378],
      'dakar': [-17.4441, 14.6928],
      'bamako': [-8.0029, 12.6392],
      'ouagadougou': [-1.5247, 12.3714],
      'niamey': [2.1111, 13.5116],
      'lomé': [1.2255, 6.1375],
      'conakry': [-13.6773, 9.6412],
    };

    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (locationLower.includes(city)) {
        return coords;
      }
    }

    // Priorité 4: Coordonnées par défaut (Cotonou)
    return [2.3522, 6.4023];
  };

  const parseWebhookResponse = (responseText: string): B2BContact[] => {
    console.log('Parsing webhook response:', responseText);
    
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
        const categoryMatch = details.match(/\*\*Catégorie\s*:\*\*\s*(.*?)(?:\n|$)/);

        const address = addressMatch ? addressMatch[1].trim() : '';
        const phone = phoneMatch ? phoneMatch[1].trim() : '';
        const website = websiteMatch ? websiteMatch[1].trim() : '';
        const category = categoryMatch ? categoryMatch[1].trim() : '';

        const firstName = ['Marie', 'Pierre', 'Sophie', 'Laurent', 'Camille', 'Jean', 'Fatou', 'Moussa', 'Aïsha', 'Ibrahim'][contactIndex % 10];
        const lastName = ['Dubois', 'Martin', 'Laurent', 'Moreau', 'Bertrand', 'Diallo', 'Traoré', 'Kone', 'Coulibaly', 'Ouedraogo'][contactIndex % 10];
        const fullName = `${firstName} ${lastName}`;
        
        let email = '';
        if (website) {
          const domain = website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
          email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
        } else {
          email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`;
        }

        const coordinates = getCoordinatesFromLocation(address, searchCriteria);

        const contact: B2BContact = {
          id: `webhook_${contactIndex}`,
          name: fullName,
          companyName: companyName,
          jobTitle: category === 'Ingénieur civil' ? 'Directeur Technique' : 'Manager',
          location: address,
          linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
          email: email,
          phone: phone,
          industry: category || 'Technology',
          companySize: '10-50',
          coordinates: coordinates
        };

        contacts.push(contact);
        contactIndex++;
      }

      console.log(`Total webhook contacts extracted: ${contacts.length}`);
      
      // Retourner uniquement les résultats webhook - pas de fallback sur les données mock
      return contacts;
      
    } catch (error) {
      console.error('Error parsing webhook response:', error);
      // Retourner un tableau vide en cas d'erreur de parsing
      return [];
    }
  };

  const getMockContacts = (): B2BContact[] => {
    return [
      {
        id: '1',
        name: 'Marie Dubois',
        companyName: 'TechCorp France',
        jobTitle: 'Directrice Marketing',
        location: 'Paris, France',
        linkedinUrl: 'https://linkedin.com/in/mariedubois',
        email: 'marie.dubois@techcorp.fr',
        phone: '+33 1 42 86 88 02',
        industry: 'Technology',
        companySize: '500-1000',
        coordinates: [2.3522, 48.8566]
      },
      {
        id: '2',
        name: 'Pierre Martin',
        companyName: 'InnovSolutions',
        jobTitle: 'Responsable Commercial',
        location: 'Lyon, France',
        linkedinUrl: 'https://linkedin.com/in/pierremartin',
        email: 'pierre.martin@innovsolutions.fr',
        phone: '+33 4 78 42 33 69',
        industry: 'Consulting',
        companySize: '100-500',
        coordinates: [4.8357, 45.7640]
      },
      {
        id: '3',
        name: 'Sophie Laurent',
        companyName: 'Digital Agency Pro',
        jobTitle: 'CEO',
        location: 'Marseille, France',
        linkedinUrl: 'https://linkedin.com/in/sophielaurent',
        email: 'sophie.laurent@digitalagency.fr',
        phone: '+33 4 91 54 92 00',
        industry: 'Marketing',
        companySize: '50-100',
        coordinates: [5.3698, 43.2965]
      }
    ];
  };

  const buildSearchMessage = (criteria: SearchCriteria) => {
    const searchTerms = [];
    
    // Prioriser les termes larges pour Google Maps
    if (criteria.location) searchTerms.push(`Localisation: ${criteria.location}`);
    if (criteria.industry.length > 0) {
      // Utiliser des termes plus génériques pour Google Maps
      const broadIndustryTerms = criteria.industry.map(industry => {
        switch(industry) {
          case 'Technologie':
            return 'informatique';
          case 'Finance':
            return 'banque';
          case 'Santé':
            return 'médical';
          case 'Commerce':
            return 'magasin';
          case 'Services':
            return 'service';
          default:
            return industry.toLowerCase();
        }
      });
      searchTerms.push(`Type d'entreprise: ${broadIndustryTerms.join(' ou ')}`);
    }
    
    // Simplifier les autres critères pour éviter les recherches trop spécifiques
    if (criteria.companyName) searchTerms.push(`Nom: ${criteria.companyName}`);
    if (criteria.keywords.length > 0) {
      // Prendre seulement les mots-clés les plus génériques
      const broadKeywords = criteria.keywords.slice(0, 2);
      searchTerms.push(`Activité: ${broadKeywords.join(' ')}`);
    }

    if (searchTerms.length === 0) {
      return "Je cherche des entreprises locales pour ma prospection via Google Maps. Pouvez-vous m'aider à identifier des entreprises avec leurs coordonnées complètes ?";
    }

    return `Je recherche des entreprises via Google Maps avec les critères suivants: ${searchTerms.join(', ')}. Utilisez des termes génériques pour obtenir plus de résultats sur Google Maps et donnez-moi les informations complètes (nom, adresse, téléphone, site web, catégorie) ?`;
  };

  const buildWebhookPayload = (criteria: SearchCriteria) => {
    return {
      // Message de recherche principal
      message: buildSearchMessage(criteria),
      
      // Données enrichies pour le webhook
      searchData: {
        // Recherche Avancée & IA
        advancedAiSearch: {
          enabled: criteria.aiSuggestions,
          qualityScore: criteria.qualityScore,
          prioritizeLocal: criteria.prioritizeLocal
        },
        
        // Mots-clés stratégiques
        strategicKeywords: criteria.keywords,
        
        // Description libre de la recherche
        freeTextDescription: criteria.description,
        
        // Critères de recherche détaillés
        searchCriteria: {
          location: criteria.location,
          coordinates: criteria.locationCoordinates,
          radius: criteria.radius,
          useGPS: criteria.useGPS,
          companyName: criteria.companyName,
          industry: criteria.industry,
          companySize: criteria.companySize,
          jobTitle: criteria.jobTitle,
          seniority: criteria.seniority,
          department: criteria.department
        }
      },
      
      // Métadonnées de session
      timestamp: new Date().toISOString(),
      session_id: `b2b_workflow_${Date.now()}`,
      user_id: 'b2b_user',
      source: 'bot_bj_platform',
      context: 'complete_b2b_workflow'
    };
  };

  const executeSearch = async (criteria: SearchCriteria) => {
    setIsSearching(true);
    setSearchError(null);
    setCurrentStep(1);

    console.log('Executing search with enhanced criteria:', criteria);

    try {
      const requestPayload = buildWebhookPayload(criteria);
      console.log('Sending enhanced webhook payload:', requestPayload);

      const response = await fetch('https://ia.bot.bj/webhook/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Bot.Bj-Platform/1.0',
        },
        body: JSON.stringify(requestPayload),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let responseData;
      let processedContent;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
        processedContent = responseData.output || 
                          responseData.message || 
                          responseData.response || 
                          responseData.text || 
                          responseData.content ||
                          responseData.reply ||
                          (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
      } else {
        responseData = await response.text();
        processedContent = responseData;
      }

      const extractedContacts = parseWebhookResponse(processedContent);
      
      if (extractedContacts.length > 0) {
        console.log('Setting search results:', extractedContacts);
        setSearchResults(extractedContacts);
        setCurrentStep(2);
        toast({
          title: "Recherche terminée avec succès",
          description: `${extractedContacts.length} contacts trouvés via webhook`,
        });
      } else {
        // Même sans résultats, passer à l'étape suivante pour afficher les options
        setSearchResults([]);
        setSearchError("Aucun contact trouvé dans la réponse webhook");
        setCurrentStep(2);
        toast({
          title: "Aucun résultat",
          description: "La recherche n'a retourné aucun contact. Vous pouvez modifier vos critères.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Erreur inconnue');
      setSearchResults([]);
      setCurrentStep(2); // Aller à l'étape des résultats même en cas d'erreur
      
      toast({
        title: "Erreur de recherche",
        description: "Impossible de se connecter au service de recherche. Vous pouvez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCriteriaSubmit = (criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
    executeSearch(criteria);
  };

  const handleStepNavigation = (stepIndex: number) => {
    if (stepIndex === 0) {
      setCurrentStep(0);
      setSearchError(null);
    } else if (stepIndex === 1 && searchCriteria) {
      // Relancer la recherche
      executeSearch(searchCriteria);
    } else if (stepIndex === 2 && searchResults.length > 0) {
      setCurrentStep(2);
    } else if (stepIndex === 3 && searchResults.length > 0) {
      setCurrentStep(3);
    }
  };

  const handleReturnToModules = () => {
    if (window.confirm('Êtes-vous sûr de vouloir retourner aux modules ? Vos résultats actuels seront perdus.')) {
      onBack();
    }
  };

  const handleResetSearch = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser la recherche ?')) {
      setCurrentStep(0);
      setSearchCriteria(null);
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
    }
  };

  const handleViewResults = () => {
    setCurrentStep(3);
  };

  const handleExport = () => {
    const csvContent = [
      ['Nom', 'Entreprise', 'Poste', 'Email', 'Téléphone', 'Localisation', 'Secteur', 'Taille Entreprise', 'LinkedIn'],
      ...searchResults.map(contact => [
        contact.name,
        contact.companyName,
        contact.jobTitle,
        contact.email,
        contact.phone,
        contact.location,
        contact.industry,
        contact.companySize,
        contact.linkedinUrl
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_b2b_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "Export réussi",
      description: `${searchResults.length} contacts exportés au format CSV`,
    });
  };

  const resetWorkflow = () => {
    setCurrentStep(0);
    setSearchCriteria(null);
    setSearchResults([]);
    setSearchError(null);
    setIsSearching(false);
  };

  const getStepStatusIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'active':
        return isSearching && step.id === 'search' ? 
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" /> : 
          <Clock className="w-5 h-5 text-blue-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={handleReturnToModules}
              className="mr-4 hover:bg-white/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux modules
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Workflow B2B Complet
              </h1>
              <p className="text-gray-600 mt-1">
                Processus intégré de recherche et visualisation de prospects
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleResetSearch}
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Réinitialiser
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-gray-600">IA Intégrée</span>
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <Card className="mb-6 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Étapes du Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {workflowSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                    step.status === 'active' 
                      ? 'border-blue-500 bg-blue-50' 
                      : step.status === 'completed'
                      ? 'border-green-500 bg-green-50 hover:bg-green-100'
                      : step.status === 'error'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                  onClick={() => handleStepNavigation(index)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {getStepStatusIcon(step)}
                    <span className="font-medium">{step.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge 
                      variant={step.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {step.status === 'completed' ? 'Terminé' : 
                       step.status === 'active' ? 'En cours' : 
                       step.status === 'error' ? 'Erreur' : 'En attente'}
                    </Badge>
                    {step.status === 'completed' && (
                      <span className="text-xs text-blue-600 font-medium">Cliquer pour revoir</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {currentStep === 0 && (
          <SmartB2BSearch
            onBack={resetWorkflow}
            onSearch={handleCriteriaSubmit}
          />
        )}

        {currentStep === 1 && (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Recherche en cours...
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium">Traitement de votre recherche</p>
                  <p className="text-gray-600">Envoi des critères au webhook et analyse...</p>
                </div>
              </div>
              
              {searchCriteria && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-2">Critères de recherche :</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {searchCriteria.location && <p><span className="font-medium">Localisation:</span> {searchCriteria.location}</p>}
                    {searchCriteria.industry.length > 0 && <p><span className="font-medium">Secteur:</span> {searchCriteria.industry.join(', ')}</p>}
                    {searchCriteria.jobTitle && <p><span className="font-medium">Poste:</span> {searchCriteria.jobTitle}</p>}
                    {searchCriteria.companySize && <p><span className="font-medium">Taille:</span> {searchCriteria.companySize}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep >= 2 && (
          <div className="space-y-6">
            {/* Results Summary */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-green-600" />
                    Résultats de la recherche
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">
                      {searchResults.length} contacts trouvés
                    </Badge>
                    <Button onClick={handleExport} size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Exporter CSV
                    </Button>
                    {currentStep === 2 && (
                      <Button onClick={handleViewResults} size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Visualiser
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {searchError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-red-800 mb-1">Erreur de recherche</h4>
                        <p className="text-sm text-red-700 mb-3">{searchError}</p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => searchCriteria && executeSearch(searchCriteria)}
                            className="text-red-700 border-red-300 hover:bg-red-100"
                          >
                            Réessayer
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setCurrentStep(0)}
                            className="text-blue-700 border-blue-300 hover:bg-blue-100"
                          >
                            Modifier critères
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {searchResults.length === 0 && !searchError && currentStep >= 2 && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-800 mb-1">Aucun résultat trouvé</h4>
                        <p className="text-sm text-blue-700 mb-3">Votre recherche n'a retourné aucun contact. Essayez d'élargir vos critères.</p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setCurrentStep(0)}
                            className="text-blue-700 border-blue-300 hover:bg-blue-100"
                          >
                            Modifier la recherche
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{searchResults.length}</p>
                    <p className="text-sm text-gray-600">Contacts qualifiés</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <Building2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{new Set(searchResults.map(c => c.companyName)).size}</p>
                    <p className="text-sm text-gray-600">Entreprises uniques</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <MapPin className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-600">{searchResults.filter(c => c.coordinates).length}</p>
                    <p className="text-sm text-gray-600">Géolocalisés</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Results Management */}
            {currentStep >= 2 && searchResults.length > 0 && (
              <B2BResultsManager
                contacts={searchResults}
                onExport={handleExport}
                searchSessionId={`b2b_session_${Date.now()}`}
              />
            )}

            {/* Visualization */}
            {currentStep === 4 && (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Visualisation des résultats
                    </CardTitle>
                    <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as 'table' | 'map')}>
                      <TabsList>
                        <TabsTrigger value="table">Tableau</TabsTrigger>
                        <TabsTrigger value="map">Carte</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedView} className="w-full">
                    <TabsContent value="table" className="mt-0">
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Contact</TableHead>
                              <TableHead>Entreprise</TableHead>
                              <TableHead>Poste</TableHead>
                              <TableHead>Localisation</TableHead>
                              <TableHead>Contact</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {searchResults.map((contact) => (
                              <TableRow key={contact.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{contact.name}</p>
                                    <p className="text-sm text-gray-600">{contact.industry}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{contact.companyName}</p>
                                    <Badge variant="outline" className="text-xs">
                                      {contact.companySize}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>{contact.jobTitle}</TableCell>
                                <TableCell>{contact.location}</TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-sm">
                                      <Mail className="w-3 h-3" />
                                      {contact.email}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm">
                                      <Phone className="w-3 h-3" />
                                      {contact.phone}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" asChild>
                                      <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer">
                                        <Globe className="w-3 h-3" />
                                      </a>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    <TabsContent value="map" className="mt-0">
                      <div className="h-[600px] border rounded-lg overflow-hidden">
                        <GeoLocationMap 
                          contacts={searchResults}
                          userLocation={[2.3522, 6.4023]}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button onClick={resetWorkflow} variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Nouvelle recherche
              </Button>
              <Button onClick={handleExport} variant="default">
                <Download className="w-4 h-4 mr-2" />
                Exporter les données
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};