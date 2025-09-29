
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Download, Users, MapPin, Mail, Phone, Eye, MessageSquare, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { GeoLocationMap } from './GeoLocationMap';
import { useToast } from '@/hooks/use-toast';

interface B2BFilters {
  companyName: string;
  industry: string;
  companySize: string;
  location: string;
  jobTitle: string;
  experience: string;
  department: string;
  keywords: string;
}

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

interface WebhookResponse {
  status: 'success' | 'error' | 'timeout' | 'loading';
  message: string;
  data?: B2BContact[];
  timestamp: Date;
  requestId: string;
}

interface B2BTargetingProps {
  onBack: () => void;
}

const getCoordinatesFromLocation = (location: string): [number, number] | undefined => {
  const locationLower = location.toLowerCase();
  
  const cityCoordinates: { [key: string]: [number, number] } = {
    'cotonou': [2.3522, 6.4023],
    'porto-novo': [2.6037, 6.4968],
    'parakou': [2.6303, 9.3365],
    'djougou': [1.6667, 9.7000],
    'bohicon': [2.0667, 7.1833],
    'kandi': [2.9383, 11.1342],
    'ouidah': [2.0833, 6.3667],
    'paris': [2.3522, 48.8566],
    'lyon': [4.8357, 45.7640],
    'marseille': [5.3698, 43.2965],
    'toulouse': [1.4442, 43.6047],
    'nantes': [-1.5534, 47.2184],
    'strasbourg': [7.7521, 48.5734],
    'montpellier': [3.8767, 43.6109],
    'bordeaux': [-0.5792, 44.8378],
    'lille': [3.0573, 50.6292],
    'rennes': [-1.6743, 48.1173],
  };

  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (locationLower.includes(city)) {
      return coords;
    }
  }

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
      
      console.log(`Found company: ${companyName}`);
      console.log(`Details: ${details}`);

      const addressMatch = details.match(/\*\*Adresse\s*:\*\*\s*(.*?)(?:\n|$)/);
      const phoneMatch = details.match(/\*\*Téléphone\s*:\*\*\s*(.*?)(?:\n|$)/);
      const websiteMatch = details.match(/\*\*Site web\s*:\*\*\s*\[(.*?)\]/);
      const categoryMatch = details.match(/\*\*Catégorie\s*:\*\*\s*(.*?)(?:\n|$)/);
      const noteMatch = details.match(/\*\*Note\s*:\*\*\s*(.*?)(?:\n|$)/);

      const address = addressMatch ? addressMatch[1].trim() : '';
      const phone = phoneMatch ? phoneMatch[1].trim() : '';
      const website = websiteMatch ? websiteMatch[1].trim() : '';
      const category = categoryMatch ? categoryMatch[1].trim() : '';
      const note = noteMatch ? noteMatch[1].trim() : '';

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

      const coordinates = getCoordinatesFromLocation(address);

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
      
      console.log('Created contact:', contact);
    }

    console.log(`Total webhook contacts extracted: ${contacts.length}`);
    
    // Retourner uniquement les résultats webhook
    return contacts;
    
  } catch (error) {
    console.error('Error parsing webhook response:', error);
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

import { SmartB2BSearch } from './SmartB2BSearch';
import { SaveB2BProspectsModal } from './SaveB2BProspectsModal';

export const B2BTargeting: React.FC<B2BTargetingProps> = ({ onBack }) => {
  const [useSmartSearch, setUseSmartSearch] = useState(true);
  const [filters, setFilters] = useState<B2BFilters>({
    companyName: '',
    industry: '',
    companySize: '',
    location: '',
    jobTitle: '',
    experience: '',
    department: '',
    keywords: ''
  });

  const [showResults, setShowResults] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<WebhookResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchHistory, setSearchHistory] = useState<WebhookResponse[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
          console.log('User location detected:', position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          setUserLocation([2.3522, 6.4023]);
        }
      );
    } else {
      setUserLocation([2.3522, 6.4023]);
    }
  }, []);

  const handleFilterChange = (key: keyof B2BFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    console.log(`Filter ${key} changed to:`, value);
  };

  const buildSearchMessage = (searchFilters?: B2BFilters) => {
    const filtersToUse = searchFilters || filters;
    const searchCriteria = [];
    
    if (filtersToUse.companyName) searchCriteria.push(`Entreprise: ${filtersToUse.companyName}`);
    if (filtersToUse.industry) searchCriteria.push(`Secteur: ${filtersToUse.industry}`);
    if (filtersToUse.jobTitle) searchCriteria.push(`Poste: ${filtersToUse.jobTitle}`);
    if (filtersToUse.location) searchCriteria.push(`Localisation: ${filtersToUse.location}`);
    if (filtersToUse.companySize) searchCriteria.push(`Taille entreprise: ${filtersToUse.companySize}`);
    if (filtersToUse.department) searchCriteria.push(`Département: ${filtersToUse.department}`);
    if (filtersToUse.experience) searchCriteria.push(`Expérience: ${filtersToUse.experience}`);
    if (filtersToUse.keywords) searchCriteria.push(`Mots-clés: ${filtersToUse.keywords}`);

    if (searchCriteria.length === 0) {
      return "Je cherche des contacts B2B et des entreprises pour ma prospection. Pouvez-vous m'aider à identifier des prospects pertinents avec leurs coordonnées complètes (nom, adresse, téléphone, secteur) ?";
    }

    return `Je recherche des contacts B2B avec les critères suivants: ${searchCriteria.join(', ')}. Pouvez-vous m'aider à identifier des prospects correspondant à ces critères avec leurs informations complètes (nom, adresse, téléphone, site web, secteur) ?`;
  };

  const executeWebhookSearch = async (searchFilters?: B2BFilters) => {
    const filtersToUse = searchFilters || filters;
    const requestId = `req_${Date.now()}`;
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
    
    console.log('=== B2B SEARCH VIA CHATBOT START ===');
    console.log('Request ID:', requestId);
    console.log('Retry count:', retryCount);
    console.log('Search filters:', filtersToUse);

    const loadingResponse: WebhookResponse = {
      status: 'loading',
      message: 'Recherche en cours via le système de chat...',
      timestamp: new Date(),
      requestId
    };
    setWebhookResponse(loadingResponse);

    const messageToSend = buildSearchMessage(filtersToUse);
    console.log('Message to send:', messageToSend);

    try {
      const timeoutDuration = retryCount > 1 ? 45000 : 30000;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`Request timeout after ${timeoutDuration/1000} seconds`);
        controller.abort();
      }, timeoutDuration);

      console.log('Sending request via ChatInterface webhook (lead)');

      const requestPayload = {
        message: messageToSend,
        timestamp: new Date().toISOString(),
        session_id: `b2b_search_${Date.now()}`,
        user_id: 'b2b_user',
        source: 'bot_bj_platform',
        context: 'b2b_targeting',
        filters: filtersToUse
      };

      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch('https://ia.bot.bj/webhook/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Bot.Bj-Platform/1.0',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      console.log('Response received!');
      console.log('Status:', response.status, 'Status Text:', response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      console.log('Content-Type:', contentType);

      let responseData;
      let processedContent;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('JSON Response:', JSON.stringify(responseData, null, 2));
        
        processedContent = responseData.output || 
                          responseData.message || 
                          responseData.response || 
                          responseData.text || 
                          responseData.content ||
                          responseData.reply ||
                          (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
      } else {
        responseData = await response.text();
        console.log('Text Response:', responseData);
        processedContent = responseData;
      }

      console.log('Processed content:', processedContent);

      if (!processedContent || processedContent.trim() === '') {
        throw new Error('Empty or invalid response from webhook');
      }

      const extractedContacts = parseWebhookResponse(processedContent);
      console.log('Extracted contacts:', extractedContacts);

      const successResponse: WebhookResponse = {
        status: extractedContacts.length > 0 ? 'success' : 'error',
        message: extractedContacts.length > 0 ? processedContent.trim() : 'Aucun contact trouvé dans la réponse',
        data: extractedContacts,
        timestamp: new Date(),
        requestId
      };

      setWebhookResponse(successResponse);
      setSearchHistory(prev => [successResponse, ...prev.slice(0, 4)]);
      
      // Toujours afficher les résultats, même si aucun contact trouvé
      setShowResults(true);
      
      if (extractedContacts.length > 0) {
        setRetryCount(0);
        toast({
          title: "Recherche B2B - Succès",
          description: `${extractedContacts.length} contacts trouvés via webhook`,
        });
      } else {
        toast({
          title: "Aucun résultat trouvé",
          description: "Essayez de modifier vos critères de recherche (localisation, secteurs, mots-clés)",
          variant: "destructive",
        });
      }

      console.log('B2B search completed successfully via lead webhook');

    } catch (error) {
      console.error('=== B2B SEARCH ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      
      let errorStatus: 'error' | 'timeout' = 'error';
      let errorMessage = "Erreur de connexion au système de chat";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorStatus = 'timeout';
          errorMessage = `Timeout de la requête (${retryCount > 1 ? 45 : 30}s)`;
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Impossible de se connecter au webhook du système de chat";
        } else if (error.message.includes('CORS')) {
          errorMessage = "Problème CORS avec le webhook";
        }
      }

      const errorResponse: WebhookResponse = {
        status: errorStatus,
        message: errorMessage,
        data: [],
        timestamp: new Date(),
        requestId
      };

      setWebhookResponse(errorResponse);
      setSearchHistory(prev => [errorResponse, ...prev.slice(0, 4)]);
      
      toast({
        title: "Erreur de recherche",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('=== B2B SEARCH END ===');
    }
  };

  const handleViewResults = () => {
    setShowResults(true);
    console.log('Switching to results view');
  };

  const handleBackToSearch = () => {
    setShowResults(false);
    setWebhookResponse(null);
    setRetryCount(0);
    console.log('Back to search interface');
  };

  const handleExport = () => {
    console.log('Exporting B2B results...');
    const contactsToExport = webhookResponse?.data || getMockContacts();
    
    const csvContent = [
      ['Nom', 'Entreprise', 'Poste', 'Email', 'Téléphone', 'Localisation', 'Secteur', 'Taille Entreprise', 'LinkedIn'],
      ...contactsToExport.map(contact => [
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
  };

  const handleSmartSearch = (smartFilters: any) => {
    // Convertir les filtres intelligents vers le format traditionnel
    const convertedFilters = {
      companyName: smartFilters.companyName || '',
      industry: smartFilters.industry.join(', ') || '',
      companySize: smartFilters.companySize || '',
      location: smartFilters.location || '',
      jobTitle: smartFilters.jobTitle || '',
      experience: smartFilters.seniority || '',
      department: smartFilters.department || '',
      keywords: smartFilters.keywords.join(', ') || ''
    };
    
    setFilters(convertedFilters);
    
    // Exécuter la recherche avec les filtres convertis
    setTimeout(() => {
      executeWebhookSearch(convertedFilters);
    }, 100);
  };

  const resetSearch = () => {
    setFilters({
      companyName: '',
      industry: '',
      companySize: '',
      location: '',
      jobTitle: '',
      experience: '',
      department: '',
      keywords: ''
    });
    setWebhookResponse(null);
    setShowResults(false);
    setRetryCount(0);
    console.log('Search reset');
  };

  const getStatusIcon = (status: WebhookResponse['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'timeout':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <MessageSquare className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: WebhookResponse['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'timeout':
        return 'bg-orange-50 border-orange-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Interface de recherche intelligente
  if (useSmartSearch && !showResults) {
    return (
      <SmartB2BSearch 
        onBack={onBack}
        onSearch={handleSmartSearch}
      />
    );
  }

  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    const displayContacts = webhookResponse?.data || getMockContacts();
    if (selectedContacts.length === displayContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(displayContacts.map(c => c.id));
    }
  };

  const handleSaveToProspects = () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Aucun contact sélectionné",
        description: "Veuillez sélectionner au moins un contact",
        variant: "destructive"
      });
      return;
    }
    setShowSaveModal(true);
  };

  if (showResults) {
    const displayContacts = webhookResponse?.data || [];
    const selectedContactsData = displayContacts.filter(c => selectedContacts.includes(c.id));
    
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleBackToSearch} className="text-black hover:bg-gray-200">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Nouvelle recherche
              </Button>
              <h1 className="text-2xl font-bold text-black">Résultats du Ciblage B2B</h1>
              <Badge 
                variant="secondary" 
                className={displayContacts.length > 0 ? "bg-gray-800 text-white" : "bg-orange-600 text-white"}
              >
                {displayContacts.length} contact{displayContacts.length > 1 ? 's' : ''} trouvé{displayContacts.length > 1 ? 's' : ''}
              </Badge>
              {selectedContacts.length > 0 && (
                <Badge variant="default" className="bg-blue-600 text-white">
                  {selectedContacts.length} sélectionné(s)
                </Badge>
              )}
            </div>
            <div className="flex space-x-2">
              {selectedContacts.length > 0 && (
                <Button 
                  onClick={handleSaveToProspects}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Enregistrer ({selectedContacts.length})
                </Button>
              )}
              <Button variant="outline" onClick={handleExport} className="text-black border-gray-400 hover:bg-gray-200">
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
              </Button>
              <Button onClick={onBack} className="bg-gray-800 text-white hover:bg-gray-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au menu
              </Button>
            </div>
          </div>

          {webhookResponse && (
            <Card className={`mb-6 ${getStatusColor(webhookResponse.status)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(webhookResponse.status)}
                    <div>
                      <p className="font-medium text-gray-900">
                        Statut: {webhookResponse.status === 'success' ? 'Succès' : 
                                 webhookResponse.status === 'error' ? 'Erreur' :
                                 webhookResponse.status === 'timeout' ? 'Timeout' : 'En cours'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {webhookResponse.timestamp.toLocaleString()} - ID: {webhookResponse.requestId}
                      </p>
                    </div>
                  </div>
                  {displayContacts.length === 0 && (
                    <Badge className="bg-orange-100 text-orange-800">
                      Modifiez vos critères de recherche
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {displayContacts.length === 0 && (
            <Card className="mb-6 bg-orange-50 border-orange-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Aucun contact trouvé
                  </h3>
                  <p className="text-gray-600 mb-4">
                    La recherche n'a retourné aucun résultat. Voici quelques suggestions :
                  </p>
                  <ul className="text-left text-sm text-gray-700 space-y-2 max-w-md mx-auto">
                    <li>✓ Vérifiez que la localisation est correcte</li>
                    <li>✓ Utilisez des secteurs d'activité plus généraux</li>
                    <li>✓ Essayez avec moins de mots-clés</li>
                    <li>✓ Augmentez le rayon de recherche</li>
                  </ul>
                  <Button 
                    onClick={handleBackToSearch}
                    className="mt-6 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Modifier les critères de recherche
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {displayContacts.length > 0 && (
            <div className="mb-6">
            <Card className="bg-white border-gray-300">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center text-black">
                  <MapPin className="w-5 h-5 mr-2" />
                  Carte des Contacts B2B
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-96">
                  <GeoLocationMap 
                    contacts={displayContacts} 
                    userLocation={userLocation}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {displayContacts.length > 0 && (
          <Card className="bg-white border-gray-300">
            <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center text-black">
                <Users className="w-5 h-5 mr-2" />
                Contacts B2B Identifiés
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="text-black border-gray-400"
              >
                {selectedContacts.length === displayContacts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedContacts.length === displayContacts.length && displayContacts.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </TableHead>
                      <TableHead className="text-black font-semibold">Nom</TableHead>
                      <TableHead className="text-black font-semibold">Entreprise</TableHead>
                      <TableHead className="text-black font-semibold">Poste</TableHead>
                      <TableHead className="text-black font-semibold">Email</TableHead>
                      <TableHead className="text-black font-semibold">Téléphone</TableHead>
                      <TableHead className="text-black font-semibold">Localisation</TableHead>
                      <TableHead className="text-black font-semibold">Secteur</TableHead>
                      <TableHead className="text-black font-semibold">Taille</TableHead>
                      <TableHead className="text-black font-semibold">LinkedIn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayContacts.map((contact) => (
                      <TableRow 
                        key={contact.id} 
                        className={`border-gray-200 hover:bg-gray-50 ${selectedContacts.includes(contact.id) ? 'bg-blue-50' : ''}`}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={() => toggleContactSelection(contact.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-black">{contact.name}</TableCell>
                        <TableCell className="text-black">{contact.companyName}</TableCell>
                        <TableCell className="text-black">{contact.jobTitle}</TableCell>
                        <TableCell className="text-black">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-600" />
                            <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                              {contact.email}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="text-black">
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-600" />
                            <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                              {contact.phone}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="text-black">{contact.location}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-gray-400 text-black">{contact.industry}</Badge>
                        </TableCell>
                        <TableCell className="text-black">{contact.companySize}</TableCell>
                        <TableCell>
                          <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Profil LinkedIn
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          )}

          <SaveB2BProspectsModal
            isOpen={showSaveModal}
            onClose={() => setShowSaveModal(false)}
            contacts={selectedContactsData}
            onSuccess={() => {
              setSelectedContacts([]);
              toast({
                title: "Prospects enregistrés",
                description: "Les contacts ont été ajoutés à votre base de prospects",
              });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack} className="text-black hover:bg-gray-200">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold text-black">Ciblage B2B - Entreprises & Contacts</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-white border-gray-300">
              <CardHeader className="bg-gray-200 border-b border-gray-300">
                <CardTitle className="flex items-center text-black">
                  <Filter className="w-5 h-5 mr-2" />
                  Critères de Recherche
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-black">Informations Entreprise</Label>
                  <Input
                    placeholder="Nom de l'entreprise"
                    value={filters.companyName}
                    onChange={(e) => handleFilterChange('companyName', e.target.value)}
                    className="border-gray-300 text-black placeholder:text-gray-500"
                  />
                  <Select value={filters.industry} onValueChange={(value) => handleFilterChange('industry', value)}>
                    <SelectTrigger className="border-gray-300 text-black">
                      <SelectValue placeholder="Secteur d'activité" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="technology">Technologie</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Santé</SelectItem>
                      <SelectItem value="consulting">Conseil</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="retail">Commerce</SelectItem>
                      <SelectItem value="environmental">Environnement</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.companySize} onValueChange={(value) => handleFilterChange('companySize', value)}>
                    <SelectTrigger className="border-gray-300 text-black">
                      <SelectValue placeholder="Taille de l'entreprise" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="1-10">1-10 employés</SelectItem>
                      <SelectItem value="11-50">11-50 employés</SelectItem>
                      <SelectItem value="51-200">51-200 employés</SelectItem>
                      <SelectItem value="201-500">201-500 employés</SelectItem>
                      <SelectItem value="501-1000">501-1000 employés</SelectItem>
                      <SelectItem value="1000+">1000+ employés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-black">Critères Contact</Label>
                  <Input
                    placeholder="Titre du poste"
                    value={filters.jobTitle}
                    onChange={(e) => handleFilterChange('jobTitle', e.target.value)}
                    className="border-gray-300 text-black placeholder:text-gray-500"
                  />
                  <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                    <SelectTrigger className="border-gray-300 text-black">
                      <SelectValue placeholder="Département" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="sales">Commercial</SelectItem>
                      <SelectItem value="hr">Ressources Humaines</SelectItem>
                      <SelectItem value="it">Informatique</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="operations">Opérations</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.experience} onValueChange={(value) => handleFilterChange('experience', value)}>
                    <SelectTrigger className="border-gray-300 text-black">
                      <SelectValue placeholder="Niveau d'expérience" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="entry">Débutant (0-2 ans)</SelectItem>
                      <SelectItem value="mid">Intermédiaire (3-5 ans)</SelectItem>
                      <SelectItem value="senior">Senior (6-10 ans)</SelectItem>
                      <SelectItem value="executive">Cadre (10+ ans)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-black">Localisation</Label>
                  <Input
                    placeholder="Ville, région, pays"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="border-gray-300 text-black placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-black">Mots-clés</Label>
                  <Input
                    placeholder="Compétences, certifications, etc."
                    value={filters.keywords}
                    onChange={(e) => handleFilterChange('keywords', e.target.value)}
                    className="border-gray-300 text-black placeholder:text-gray-500"
                  />
                </div>

                <div className="flex flex-col space-y-2">
                  <Button 
                    onClick={() => executeWebhookSearch()} 
                    className="w-full bg-gray-800 text-white hover:bg-gray-700" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Recherche en cours... {retryCount > 1 && `(Tentative ${retryCount})`}
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Lancer la recherche
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetSearch}
                    className="w-full text-black border-gray-400 hover:bg-gray-200"
                    disabled={isLoading}
                  >
                    Réinitialiser
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {webhookResponse ? (
              <Card className={`bg-white border-gray-300 ${getStatusColor(webhookResponse.status)}`}>
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="flex items-center justify-between text-black">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(webhookResponse.status)}
                      <span>Réponse du Système de Chat</span>
                    </div>
                    <Badge className={
                      webhookResponse.status === 'success' ? 'bg-green-100 text-green-800' :
                      webhookResponse.status === 'error' ? 'bg-red-100 text-red-800' :
                      webhookResponse.status === 'timeout' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {webhookResponse.status === 'success' ? 'Succès' :
                       webhookResponse.status === 'error' ? 'Erreur' :
                       webhookResponse.status === 'timeout' ? 'Timeout' : 'En cours'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                    <div className="prose prose-sm max-w-none">
                      <div className="text-gray-900 whitespace-pre-wrap leading-relaxed font-medium">
                        {webhookResponse.message}
                      </div>
                    </div>
                  </div>
                  
                  {webhookResponse.data && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-3">
                        <strong>{webhookResponse.data.length}</strong> contacts trouvés et géolocalisés
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={handleViewResults}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                      disabled={!webhookResponse.data}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visualiser les résultats
                    </Button>
                    {webhookResponse.status !== 'success' && (
                      <Button 
                        onClick={() => executeWebhookSearch()}
                        variant="outline"
                        className="border-orange-400 text-orange-700 hover:bg-orange-50 px-8 py-3"
                        disabled={isLoading}
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Réessayer
                      </Button>
                    )}
                    <Button 
                      onClick={resetSearch}
                      variant="outline"
                      className="border-gray-400 text-black hover:bg-gray-200 px-8 py-3"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Nouvelle recherche
                    </Button>
                  </div>

                  <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                    <p className="text-xs text-gray-600">
                      <strong>Requête:</strong> {webhookResponse.requestId} | 
                      <strong> Timestamp:</strong> {webhookResponse.timestamp.toLocaleString()}
                      {retryCount > 0 && <><strong> | Tentatives:</strong> {retryCount}</>}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border-gray-300">
                <CardHeader className="bg-gray-200 border-b border-gray-300">
                  <CardTitle className="text-black">Interface de Recherche B2B</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-lg mb-2 text-black font-medium">Prêt pour la recherche</p>
                    <p className="text-gray-600">Configurez vos critères et lancez la recherche via le système de chat</p>
                    
                    {userLocation && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          Position détectée: {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
                        </p>
                      </div>
                    )}

                    {searchHistory.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Historique récent</h4>
                        <div className="space-y-2">
                          {searchHistory.slice(0, 3).map((search, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(search.status)}
                                <span className="text-gray-600">
                                  {search.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <Badge className="text-xs">
                                {search.data?.length || 0} contacts
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
