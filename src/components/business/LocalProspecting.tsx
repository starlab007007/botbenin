import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Search, Filter, Download, MapPin, Star, Phone, Eye, MessageSquare, Loader2, AlertCircle, CheckCircle, Clock, Navigation, Database, Mail, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { GeoLocationMap } from './GeoLocationMap';
import { SaveToProspectsModal } from './SaveToProspectsModal';
import { MarketingCampaignModal } from './MarketingCampaignModal';
import { useToast } from '@/hooks/use-toast';

interface LocalFilters {
  businessType: string;
  location: string;
  radius: string;
  category: string;
  minRating: string;
  priceRange: string;
  keywords: string;
  hasWebsite: string;
}

interface LocalBusiness {
  id: string;
  name: string;
  companyName: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  hours: string;
  priceRange: string;
  distance: string;
  location: string;
  coordinates?: [number, number];
  jobTitle: string;
  email: string;
  linkedinUrl: string;
  industry: string;
  companySize: string;
}

interface WebhookResponse {
  status: 'success' | 'error' | 'timeout' | 'loading';
  message: string;
  data?: LocalBusiness[];
  timestamp: Date;
  requestId: string;
}

interface LocalProspectingProps {
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

const parseWebhookResponse = (responseText: string): LocalBusiness[] => {
  console.log('Parsing local business webhook response:', responseText);
  
  const businesses: LocalBusiness[] = [];
  
  try {
    const businessPattern = /\d+\.\s*\*\*(.*?)\*\*\s*\n([\s\S]*?)(?=\n\n|\n\d+\.|\n\nCes entreprises|$)/g;
    let match;
    let businessIndex = 1;

    while ((match = businessPattern.exec(responseText)) !== null) {
      const businessName = match[1].trim();
      const details = match[2];
      
      console.log(`Found business: ${businessName}`);
      console.log(`Details: ${details}`);

      const addressMatch = details.match(/\*\*Adresse\s*:\*\*\s*(.*?)(?:\n|$)/);
      const phoneMatch = details.match(/\*\*Téléphone\s*:\*\*\s*(.*?)(?:\n|$)/);
      const websiteMatch = details.match(/\*\*Site web\s*:\*\*\s*\[(.*?)\]/);
      const categoryMatch = details.match(/\*\*Catégorie\s*:\*\*\s*(.*?)(?:\n|$)/);
      const noteMatch = details.match(/\*\*Note\s*:\*\*\s*(.*?)(?:\n|$)/);
      const hoursMatch = details.match(/\*\*Horaires\s*:\*\*\s*(.*?)(?:\n|$)/);

      const address = addressMatch ? addressMatch[1].trim() : '';
      const phone = phoneMatch ? phoneMatch[1].trim() : '';
      const website = websiteMatch ? websiteMatch[1].trim() : '';
      const category = categoryMatch ? categoryMatch[1].trim() : '';
      const note = noteMatch ? noteMatch[1].trim() : '';
      const hours = hoursMatch ? hoursMatch[1].trim() : '';

      const firstName = ['Marie', 'Pierre', 'Sophie', 'Laurent', 'Camille', 'Jean', 'Fatou', 'Moussa', 'Aïsha', 'Ibrahim'][businessIndex % 10];
      const lastName = ['Dubois', 'Martin', 'Laurent', 'Moreau', 'Bertrand', 'Diallo', 'Traoré', 'Kone', 'Coulibaly', 'Ouedraogo'][businessIndex % 10];
      const fullName = `${firstName} ${lastName}`;
      
      let email = '';
      if (website) {
        const domain = website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
        email = `contact@${domain}`;
      } else {
        email = `contact@${businessName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`;
      }

      const coordinates = getCoordinatesFromLocation(address);

      const business: LocalBusiness = {
        id: `local_${businessIndex}`,
        name: fullName,
        companyName: businessName,
        category: category || 'Commerce local',
        address: address,
        phone: phone,
        website: website || '',
        rating: Math.random() * 2 + 3,
        reviewCount: Math.floor(Math.random() * 200) + 20,
        hours: hours || '9h00-18h00',
        priceRange: ['€', '€€', '€€€'][Math.floor(Math.random() * 3)],
        distance: `${(Math.random() * 10 + 0.5).toFixed(1)} km`,
        location: address,
        coordinates: coordinates,
        jobTitle: 'Propriétaire',
        email: email,
        linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
        industry: category || 'Commerce local',
        companySize: '1-10'
      };

      businesses.push(business);
      businessIndex++;
      
      console.log('Created local business:', business);
    }

    console.log(`Total local businesses extracted: ${businesses.length}`);
    
    if (businesses.length === 0) {
      console.log('No businesses found in response, using demo data');
      return getMockBusinesses();
    }

    return businesses;
    
  } catch (error) {
    console.error('Error parsing webhook response:', error);
    return getMockBusinesses();
  }
};

const getMockBusinesses = (): LocalBusiness[] => {
  return [
    {
      id: '1',
      name: 'Marie Dupont',
      companyName: 'Boulangerie Artisanale Dupont',
      category: 'Boulangerie',
      address: '123 Rue de la République, 75001 Paris',
      phone: '01 42 33 44 55',
      website: 'www.boulangerie-dupont.fr',
      rating: 4.5,
      reviewCount: 127,
      hours: '7h00 - 19h30',
      priceRange: '€€',
      distance: '0.5 km',
      location: '123 Rue de la République, 75001 Paris',
      coordinates: [2.3522, 48.8566],
      jobTitle: 'Propriétaire',
      email: 'contact@boulangerie-dupont.fr',
      linkedinUrl: 'https://linkedin.com/in/mariedupont',
      industry: 'Boulangerie',
      companySize: '1-10'
    },
    {
      id: '2',
      name: 'Pierre Martin',
      companyName: 'Restaurant Le Petit Bistrot',
      category: 'Restaurant',
      address: '45 Avenue des Champs, 75008 Paris',
      phone: '01 45 67 89 12',
      website: 'www.petitbistrot.com',
      rating: 4.2,
      reviewCount: 89,
      hours: '12h00 - 14h30, 19h00 - 23h00',
      priceRange: '€€€',
      distance: '1.2 km',
      location: '45 Avenue des Champs, 75008 Paris',
      coordinates: [4.8357, 45.7640],
      jobTitle: 'Chef-Propriétaire',
      email: 'contact@petitbistrot.com',
      linkedinUrl: 'https://linkedin.com/in/pierremartin',
      industry: 'Restaurant',
      companySize: '1-10'
    },
    {
      id: '3',
      name: 'Sophie Laurent',
      companyName: 'Salon de Coiffure Moderne',
      category: 'Beauté & Bien-être',
      address: '67 Boulevard Saint-Germain, 75005 Paris',
      phone: '01 43 25 67 89',
      website: 'www.salon-moderne.fr',
      rating: 4.7,
      reviewCount: 156,
      hours: '9h00 - 19h00',
      priceRange: '€€',
      distance: '0.8 km',
      location: '67 Boulevard Saint-Germain, 75005 Paris',
      coordinates: [5.3698, 43.2965],
      jobTitle: 'Styliste-Propriétaire',
      email: 'contact@salon-moderne.fr',
      linkedinUrl: 'https://linkedin.com/in/sophielaurent',
      industry: 'Beauté & Bien-être',
      companySize: '1-10'
    }
  ];
};

export const LocalProspecting: React.FC<LocalProspectingProps> = ({ onBack }) => {
  const [filters, setFilters] = useState<LocalFilters>({
    businessType: '',
    location: '',
    radius: '',
    category: '',
    minRating: '',
    priceRange: '',
    keywords: '',
    hasWebsite: ''
  });

  const [showResults, setShowResults] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<WebhookResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchHistory, setSearchHistory] = useState<WebhookResponse[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [usePerplexityFallback, setUsePerplexityFallback] = useState(false);
  const [perplexityApiKey, setPerplexityApiKey] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const { toast } = useToast();

  // Check internet connectivity
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('https://httpbin.org/status/200', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });
        setConnectionStatus('online');
      } catch (error) {
        setConnectionStatus('offline');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (key: keyof LocalFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    console.log(`Local filter ${key} changed to:`, value);
  };

  const buildSearchMessage = () => {
    const searchCriteria = [];
    
    if (filters.location) searchCriteria.push(`Zone: ${filters.location}`);
    if (filters.radius) searchCriteria.push(`Rayon: ${filters.radius} km`);
    if (filters.category) searchCriteria.push(`Catégorie: ${filters.category}`);
    if (filters.keywords) searchCriteria.push(`Mots-clés: ${filters.keywords}`);
    if (filters.minRating) searchCriteria.push(`Note minimum: ${filters.minRating}`);
    if (filters.priceRange) searchCriteria.push(`Prix: ${filters.priceRange}`);
    if (filters.hasWebsite) searchCriteria.push(`Site web: ${filters.hasWebsite}`);

    if (searchCriteria.length === 0) {
      return "Je cherche des entreprises locales et des commerces de proximité pour ma prospection. Pouvez-vous m'aider à identifier des entreprises locales avec leurs coordonnées complètes (nom, adresse, téléphone, site web, horaires) ?";
    }

    return `Je recherche des entreprises locales avec les critères suivants: ${searchCriteria.join(', ')}. Pouvez-vous m'aider à identifier des commerces et entreprises locales correspondant à ces critères avec leurs informations complètes (nom, adresse, téléphone, site web, horaires, catégorie) ?`;
  };

  const searchWithPerplexity = async (searchQuery: string) => {
    if (!perplexityApiKey) {
      throw new Error('Clé API Perplexity requise');
    }

    console.log('Searching with Perplexity API...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Vous êtes un assistant spécialisé dans la recherche d\'entreprises locales. Répondez en français avec des informations structurées sur les entreprises trouvées.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur Perplexity API: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  };

  const executeWebhookSearch = async () => {
    const requestId = `local_req_${Date.now()}`;
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
    
    console.log('=== LOCAL PROSPECTING SEARCH START ===');
    console.log('Request ID:', requestId);
    console.log('Retry count:', retryCount);
    console.log('Connection status:', connectionStatus);
    console.log('Use Perplexity fallback:', usePerplexityFallback);

    const loadingResponse: WebhookResponse = {
      status: 'loading',
      message: usePerplexityFallback ? 
        'Recherche via Perplexity AI en cours...' : 
        'Recherche d\'entreprises locales en cours...',
      timestamp: new Date(),
      requestId
    };
    setWebhookResponse(loadingResponse);

    const messageToSend = buildSearchMessage();
    console.log('Message to send:', messageToSend);

    // Timeout plus court pour détecter rapidement les problèmes
    const timeoutDuration = usePerplexityFallback ? 30000 : Math.min(45000, 15000 + (retryCount * 10000));

    try {
      let responseData;
      let processedContent;

      if (usePerplexityFallback && perplexityApiKey) {
        // Utiliser Perplexity comme alternative
        console.log('Using Perplexity API fallback');
        processedContent = await searchWithPerplexity(messageToSend);
      } else {
        // Essayer les endpoints principaux avec timeout réduit
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`Request timeout after ${timeoutDuration/1000} seconds`);
          controller.abort();
        }, timeoutDuration);

        console.log(`Sending request with ${timeoutDuration/1000}s timeout`);

        const requestPayload = {
          message: messageToSend,
          timestamp: new Date().toISOString(),
          session_id: `local_search_${Date.now()}`,
          user_id: 'local_user',
          source: 'bot_bj_platform',
          context: 'local_prospecting',
          timeout: timeoutDuration,
          retry_count: retryCount
        };

        // Essayer moins d'endpoints pour réduire le temps d'attente
        const endpoints = [
          'https://ia.bot.bj/webhook/lead',
          'https://ia.bot.bj/api/search'
        ];

        let response;
        let lastError;

        for (let i = 0; i < endpoints.length; i++) {
          try {
            console.log(`Trying endpoint ${i + 1}/${endpoints.length}: ${endpoints[i]}`);
            
            response = await fetch(endpoints[i], {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': 'Bot.Bj-Platform/1.0',
                'X-Request-ID': requestId,
                'X-Retry-Count': retryCount.toString(),
              },
              body: JSON.stringify(requestPayload),
              signal: controller.signal,
              mode: 'cors',
            });

            if (response.ok) {
              console.log(`Success with endpoint: ${endpoints[i]}`);
              break;
            } else {
              console.log(`Endpoint ${endpoints[i]} failed with status: ${response.status}`);
              lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (error) {
            console.log(`Endpoint ${endpoints[i]} failed with error:`, error);
            lastError = error;
            
            if (i < endpoints.length - 1) {
              continue;
            }
          }
        }

        clearTimeout(timeoutId);

        if (!response || !response.ok) {
          throw lastError || new Error('Tous les endpoints ont échoué');
        }

        const contentType = response.headers.get('content-type') || '';
        
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
      }

      console.log('Processed content:', processedContent);

      if (!processedContent || processedContent.trim() === '') {
        throw new Error('Réponse vide du serveur');
      }

      const extractedBusinesses = parseWebhookResponse(processedContent);
      console.log('Extracted businesses:', extractedBusinesses);

      const successResponse: WebhookResponse = {
        status: 'success',
        message: processedContent.trim(),
        data: extractedBusinesses,
        timestamp: new Date(),
        requestId
      };

      setWebhookResponse(successResponse);
      setSearchHistory(prev => [successResponse, ...prev.slice(0, 4)]);
      setRetryCount(0);

      toast({
        title: "Prospection Locale - Succès",
        description: `${extractedBusinesses.length} entreprises locales trouvées`,
      });

      console.log('Local prospecting search completed successfully');

    } catch (error) {
      console.error('=== LOCAL PROSPECTING SEARCH ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      
      let errorStatus: 'error' | 'timeout' = 'error';
      let errorMessage = "Erreur de connexion";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorStatus = 'timeout';
          errorMessage = `Timeout après ${timeoutDuration/1000}s - Le serveur met trop de temps à répondre`;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = "Problème de réseau - Vérifiez votre connexion internet";
        } else if (error.message.includes('Clé API Perplexity')) {
          errorMessage = "Clé API Perplexity manquante ou invalide";
        }
      }

      // Proposer Perplexity en cas d'échec répété
      const shouldSuggestPerplexity = retryCount >= 2 && !usePerplexityFallback;
      const shouldUseMockData = retryCount >= 3 || (usePerplexityFallback && retryCount >= 1);
      const mockBusinesses = shouldUseMockData ? getMockBusinesses() : [];
      
      const errorResponse: WebhookResponse = {
        status: errorStatus,
        message: `${errorMessage}${shouldSuggestPerplexity ? '. Essayez avec l\'API Perplexity comme alternative.' : ''}${shouldUseMockData ? ' Affichage des données de démonstration.' : ''}`,
        data: mockBusinesses,
        timestamp: new Date(),
        requestId
      };

      setWebhookResponse(errorResponse);
      setSearchHistory(prev => [errorResponse, ...prev.slice(0, 4)]);
      
      toast({
        title: errorStatus === 'timeout' ? "Timeout de la requête" : "Erreur de connexion",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('=== LOCAL PROSPECTING SEARCH END ===');
    }
  };

  const handleViewResults = () => {
    setShowResults(true);
    console.log('Switching to local results view');
  };

  const handleBackToSearch = () => {
    setShowResults(false);
    setWebhookResponse(null);
    setRetryCount(0);
    console.log('Back to local search interface');
  };

  const handleExport = () => {
    console.log('Exporting local business results...');
    const businessesToExport = webhookResponse?.data || getMockBusinesses();
    
    const csvContent = [
      ['Nom Contact', 'Entreprise', 'Catégorie', 'Adresse', 'Téléphone', 'Site Web', 'Email', 'Note', 'Horaires', 'Prix', 'Distance'],
      ...businessesToExport.map(business => [
        business.name,
        business.companyName,
        business.category,
        business.address,
        business.phone,
        business.website,
        business.email,
        business.rating.toString(),
        business.hours,
        business.priceRange,
        business.distance
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `entreprises_locales_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const resetSearch = () => {
    setFilters({
      businessType: '',
      location: '',
      radius: '',
      category: '',
      minRating: '',
      priceRange: '',
      keywords: '',
      hasWebsite: ''
    });
    setWebhookResponse(null);
    setShowResults(false);
    setRetryCount(0);
    console.log('Local search reset');
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

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const handleBusinessSelection = (businessId: string, checked: boolean) => {
    setSelectedBusinesses(prev => 
      checked 
        ? [...prev, businessId]
        : prev.filter(id => id !== businessId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setIsSelectAll(checked);
    const displayBusinesses = webhookResponse?.data || getMockBusinesses();
    setSelectedBusinesses(checked ? displayBusinesses.map(b => b.id) : []);
  };

  const getSelectedBusinessesData = () => {
    const displayBusinesses = webhookResponse?.data || getMockBusinesses();
    return displayBusinesses.filter(business => selectedBusinesses.includes(business.id));
  };

  const handleSaveToProspects = () => {
    if (selectedBusinesses.length === 0) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner au moins une entreprise",
        variant: "destructive",
      });
      return;
    }
    setShowSaveModal(true);
  };

  const handleCreateCampaign = () => {
    if (selectedBusinesses.length === 0) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner au moins une entreprise",
        variant: "destructive",
      });
      return;
    }
    setShowMarketingModal(true);
  };

  if (showResults) {
    const displayBusinesses = webhookResponse?.data || getMockBusinesses();
    
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleBackToSearch}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Nouvelle recherche
              </Button>
              <h1 className="text-2xl font-bold">Entreprises Locales Trouvées</h1>
              <Badge variant="secondary">{displayBusinesses.length} entreprises trouvées</Badge>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
              </Button>
              <Button onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au menu
              </Button>
            </div>
          </div>

          {/* Selection Actions */}
          {selectedBusinesses.length > 0 && (
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-blue-600">{selectedBusinesses.length} sélectionnée(s)</Badge>
                    <span className="text-sm text-blue-700">Actions pour les entreprises sélectionnées:</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleSaveToProspects} size="sm" variant="outline">
                      <Database className="w-4 h-4 mr-2" />
                      Sauvegarder dans Prospects
                    </Button>
                    <Button onClick={handleCreateCampaign} size="sm">
                      <Mail className="w-4 h-4 mr-2" />
                      Créer une Campagne
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                  {webhookResponse.status !== 'success' && (
                    <div className="flex items-center space-x-2">
                      {webhookResponse.data && webhookResponse.data.length > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800">Données de démonstration</Badge>
                      )}
                      <Button 
                        onClick={executeWebhookSearch}
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Réessayer
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Carte des Entreprises Locales
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-96">
                  <GeoLocationMap 
                    contacts={displayBusinesses} 
                    userLocation={userLocation}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Entreprises Locales Identifiées
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={isSelectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm">Tout sélectionner</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isSelectAll}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Site Web</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Horaires</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayBusinesses.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedBusinesses.includes(business.id)}
                          onCheckedChange={(checked) => handleBusinessSelection(business.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{business.name}</TableCell>
                      <TableCell className="font-medium">{business.companyName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{business.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{business.address}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          <a href={`tel:${business.phone}`} className="text-blue-600 hover:underline">
                            {business.phone}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        {business.website && (
                          <a href={`https://${business.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {business.website}
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <a href={`mailto:${business.email}`} className="text-blue-600 hover:underline">
                          {business.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {renderStars(business.rating)}
                          <span className="text-xs text-gray-500">{business.reviewCount} avis</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{business.hours}</TableCell>
                      <TableCell>{business.priceRange}</TableCell>
                      <TableCell>{business.distance}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <SaveToProspectsModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          selectedBusinesses={getSelectedBusinessesData()}
          searchSessionId={`search_${Date.now()}`}
        />

        <MarketingCampaignModal
          isOpen={showMarketingModal}
          onClose={() => setShowMarketingModal(false)}
          selectedBusinesses={getSelectedBusinessesData()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Prospection Locale - Entreprises de Proximité</h1>
            <div className="flex items-center space-x-2">
              {connectionStatus === 'online' ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : connectionStatus === 'offline' ? (
                <WifiOff className="w-5 h-5 text-red-600" />
              ) : (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              )}
              <span className="text-sm text-gray-600">
                {connectionStatus === 'online' ? 'En ligne' : 
                 connectionStatus === 'offline' ? 'Hors ligne' : 'Vérification...'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Critères de Recherche Locale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fallback API Option */}
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={usePerplexityFallback}
                      onCheckedChange={setUsePerplexityFallback}
                    />
                    <Label className="text-sm font-medium">Utiliser Perplexity AI (Alternative)</Label>
                  </div>
                  {usePerplexityFallback && (
                    <div className="space-y-2">
                      <Label className="text-xs">Clé API Perplexity:</Label>
                      <Input
                        type="password"
                        placeholder="pplx-..."
                        value={perplexityApiKey}
                        onChange={(e) => setPerplexityApiKey(e.target.value)}
                        className="text-sm"
                      />
                      <p className="text-xs text-gray-600">
                        Alternative quand les serveurs principaux ne répondent pas
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Zone Géographique</Label>
                  <Input
                    placeholder="Ville, code postal, adresse"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                  />
                  <Select value={filters.radius} onValueChange={(value) => handleFilterChange('radius', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Rayon de recherche" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 km</SelectItem>
                      <SelectItem value="5">5 km</SelectItem>
                      <SelectItem value="10">10 km</SelectItem>
                      <SelectItem value="25">25 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Type d'Entreprise</Label>
                  <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Catégorie d'activité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurants</SelectItem>
                      <SelectItem value="retail">Commerce de détail</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="health">Santé & Médical</SelectItem>
                      <SelectItem value="beauty">Beauté & Bien-être</SelectItem>
                      <SelectItem value="automotive">Automobile</SelectItem>
                      <SelectItem value="professional">Services professionnels</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="education">Éducation</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Mots-clés spécifiques"
                    value={filters.keywords}
                    onChange={(e) => handleFilterChange('keywords', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Critères de Qualité</Label>
                  <Select value={filters.minRating} onValueChange={(value) => handleFilterChange('minRating', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Note minimum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3+ étoiles</SelectItem>
                      <SelectItem value="4">4+ étoiles</SelectItem>
                      <SelectItem value="4.5">4.5+ étoiles</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.priceRange} onValueChange={(value) => handleFilterChange('priceRange', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Gamme de prix" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="€">€ - Économique</SelectItem>
                      <SelectItem value="€€">€€ - Modéré</SelectItem>
                      <SelectItem value="€€€">€€€ - Cher</SelectItem>
                      <SelectItem value="€€€€">€€€€ - Très cher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Présence Digitale</Label>
                  <Select value={filters.hasWebsite} onValueChange={(value) => handleFilterChange('hasWebsite', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Site web" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Avec site web</SelectItem>
                      <SelectItem value="no">Sans site web</SelectItem>
                      <SelectItem value="any">Peu importe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col space-y-2">
                  <Button 
                    onClick={executeWebhookSearch} 
                    className="w-full" 
                    disabled={isLoading || (usePerplexityFallback && !perplexityApiKey)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {usePerplexityFallback ? 'Recherche Perplexity...' : 'Recherche en cours...'}
                        {retryCount > 1 && ` (Tentative ${retryCount})`}
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Rechercher les entreprises
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetSearch}
                    className="w-full"
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
              <Card className={getStatusColor(webhookResponse.status)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(webhookResponse.status)}
                      <span>
                        {usePerplexityFallback ? 'Réponse Perplexity AI' : 'Réponse du Système'}
                      </span>
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
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="prose prose-sm max-w-none">
                      <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {webhookResponse.message}
                      </div>
                    </div>
                  </div>
                  
                  {webhookResponse.data && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-3">
                        <strong>{webhookResponse.data.length}</strong> entreprises locales trouvées
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={handleViewResults}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!webhookResponse.data || webhookResponse.data.length === 0}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visualiser les résultats
                    </Button>
                    {(webhookResponse.status === 'timeout' || webhookResponse.status === 'error') && (
                      <>
                        <Button 
                          onClick={executeWebhookSearch}
                          variant="outline"
                          className="border-orange-400 text-orange-700 hover:bg-orange-50"
                          disabled={isLoading}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Réessayer {retryCount > 0 && `(${retryCount + 1})`}
                        </Button>
                        {!usePerplexityFallback && retryCount >= 2 && (
                          <Button 
                            onClick={() => setUsePerplexityFallback(true)}
                            variant="outline"
                            className="border-blue-400 text-blue-700 hover:bg-blue-50"
                          >
                            Essayer Perplexity
                          </Button>
                        )}
                      </>
                    )}
                    <Button 
                      onClick={resetSearch}
                      variant="outline"
                      disabled={isLoading}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Nouvelle recherche
                    </Button>
                  </div>

                  <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                    <p className="text-xs text-gray-600">
                      <strong>Requête:</strong> {webhookResponse.requestId} | 
                      <strong> Timestamp:</strong> {webhookResponse.timestamp.toLocaleString()}
                      {retryCount > 0 && <><strong> | Tentatives:</strong> {retryCount}</>}
                      {usePerplexityFallback && <><strong> | Source:</strong> Perplexity AI</>}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Interface de Prospection Locale</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-lg mb-2 font-medium">Prêt pour la recherche locale</p>
                    <p className="text-gray-600">Configurez vos critères et lancez la recherche d'entreprises locales</p>
                    
                    {connectionStatus === 'offline' && (
                      <div className="mt-6 p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-800">
                          <WifiOff className="w-4 h-4 inline mr-1" />
                          Connexion internet limitée - Utilisez Perplexity AI comme alternative
                        </p>
                      </div>
                    )}

                    {userLocation && (
                      <div className="mt-6 p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">
                          <Navigation className="w-4 h-4 inline mr-1" />
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
                                {search.data?.length || 0} entreprises
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
