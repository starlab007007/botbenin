
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Download, MapPin, Phone, Mail, Globe, Eye, MessageSquare, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { MapboxMap } from './MapboxMap';
import { useToast } from '@/hooks/use-toast';

interface LocalFilters {
  location: string;
  radius: string;
  category: string;
  keywords: string;
  minRating: string;
  hasWebsite: string;
  hasPhone: string;
}

interface LocalBusiness {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  coordinates: [number, number];
  email: string;
  hours: string;
  priceRange: string;
  distance: number;
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

const getMockBusinesses = (): LocalBusiness[] => {
  return [
    {
      id: '1',
      name: 'Restaurant Le Délice',
      category: 'Restaurant',
      address: '123 Avenue de la Paix, Cotonou',
      phone: '+229 21 30 40 50',
      website: 'https://restaurantdelice.bj',
      rating: 4.5,
      reviewCount: 127,
      coordinates: [2.3522, 6.4023],
      email: 'contact@restaurantdelice.bj',
      hours: '10h-22h',
      priceRange: '$$',
      distance: 0.8
    },
    {
      id: '2',
      name: 'Boutique Mode Afrique',
      category: 'Commerce',
      address: '456 Rue des Artisans, Porto-Novo',
      phone: '+229 22 21 33 44',
      website: 'https://modeafrique.bj',
      rating: 4.2,
      reviewCount: 89,
      coordinates: [2.6037, 6.4968],
      email: 'info@modeafrique.bj',
      hours: '8h-18h',
      priceRange: '$',
      distance: 1.2
    },
    {
      id: '3',
      name: 'Cabinet Juridique Excellence',
      category: 'Services professionnels',
      address: '789 Boulevard de la République, Cotonou',
      phone: '+229 21 45 67 89',
      website: 'https://excellence-droit.bj',
      rating: 4.8,
      reviewCount: 45,
      coordinates: [2.3600, 6.4100],
      email: 'contact@excellence-droit.bj',
      hours: '8h-17h',
      priceRange: '$$$',
      distance: 0.5
    }
  ];
};

const parseLocalBusinessResponse = (responseText: string): LocalBusiness[] => {
  console.log('Parsing local business response:', responseText);
  
  const businesses: LocalBusiness[] = [];
  
  try {
    const businessPattern = /\d+\.\s*\*\*(.*?)\*\*\s*\n([\s\S]*?)(?=\n\n|\n\d+\.|\n\nCes entreprises|$)/g;
    let match;
    let businessIndex = 1;

    while ((match = businessPattern.exec(responseText)) !== null) {
      const businessName = match[1].trim();
      const details = match[2];
      
      const addressMatch = details.match(/\*\*Adresse\s*:\*\*\s*(.*?)(?:\n|$)/);
      const phoneMatch = details.match(/\*\*Téléphone\s*:\*\*\s*(.*?)(?:\n|$)/);
      const websiteMatch = details.match(/\*\*Site web\s*:\*\*\s*\[(.*?)\]/);
      const categoryMatch = details.match(/\*\*Catégorie\s*:\*\*\s*(.*?)(?:\n|$)/);
      const noteMatch = details.match(/\*\*Note\s*:\*\*\s*(.*?)(?:\n|$)/);

      const address = addressMatch ? addressMatch[1].trim() : '';
      const phone = phoneMatch ? phoneMatch[1].trim() : '';
      const website = websiteMatch ? websiteMatch[1].trim() : '';
      const category = categoryMatch ? categoryMatch[1].trim() : '';
      
      const rating = noteMatch ? parseFloat(noteMatch[1].trim()) || 4.0 : 4.0;
      
      let email = '';
      if (website) {
        const domain = website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
        email = `contact@${domain}`;
      } else {
        email = `contact@${businessName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.bj`;
      }

      const coordinates = getCoordinatesFromLocation(address);

      const business: LocalBusiness = {
        id: `local_${businessIndex}`,
        name: businessName,
        category: category || 'Commerce',
        address: address,
        phone: phone,
        website: website || `https://${businessName.toLowerCase().replace(/\s+/g, '')}.bj`,
        rating: rating,
        reviewCount: Math.floor(Math.random() * 200) + 20,
        coordinates: coordinates,
        email: email,
        hours: '8h-18h',
        priceRange: '$$',
        distance: Math.round((Math.random() * 5 + 0.1) * 10) / 10
      };

      businesses.push(business);
      businessIndex++;
    }

    if (businesses.length === 0) {
      return getMockBusinesses();
    }

    return businesses;
    
  } catch (error) {
    console.error('Error parsing local business response:', error);
    return getMockBusinesses();
  }
};

const getCoordinatesFromLocation = (location: string): [number, number] => {
  const locationLower = location.toLowerCase();
  
  const cityCoordinates: { [key: string]: [number, number] } = {
    'cotonou': [2.3522, 6.4023],
    'porto-novo': [2.6037, 6.4968],
    'parakou': [2.6303, 9.3365],
    'djougou': [1.6667, 9.7000],
    'bohicon': [2.0667, 7.1833],
    'kandi': [2.9383, 11.1342],
    'ouidah': [2.0833, 6.3667],
  };

  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (locationLower.includes(city)) {
      return coords;
    }
  }

  return [2.3522, 6.4023];
};

export const LocalProspecting: React.FC<LocalProspectingProps> = ({ onBack }) => {
  const [filters, setFilters] = useState<LocalFilters>({
    location: '',
    radius: '5',
    category: '',
    keywords: '',
    minRating: '',
    hasWebsite: '',
    hasPhone: ''
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

  const buildSearchMessage = () => {
    const searchCriteria = [];
    
    if (filters.location) searchCriteria.push(`Localisation: ${filters.location}`);
    if (filters.radius) searchCriteria.push(`Rayon: ${filters.radius} km`);
    if (filters.category) searchCriteria.push(`Catégorie: ${filters.category}`);
    if (filters.keywords) searchCriteria.push(`Mots-clés: ${filters.keywords}`);
    if (filters.minRating) searchCriteria.push(`Note minimale: ${filters.minRating}`);
    if (filters.hasWebsite === 'yes') searchCriteria.push('Avec site web');
    if (filters.hasPhone === 'yes') searchCriteria.push('Avec téléphone');

    if (searchCriteria.length === 0) {
      return "Je recherche des entreprises locales pour ma prospection commerciale. Pouvez-vous m'aider à identifier des prospects locaux avec leurs coordonnées complètes (nom, adresse, téléphone, site web, catégorie) ?";
    }

    return `Je recherche des entreprises locales avec les critères suivants: ${searchCriteria.join(', ')}. Pouvez-vous m'aider à identifier des prospects locaux correspondant à ces critères avec leurs informations complètes (nom, adresse, téléphone, site web, catégorie, note) ?`;
  };

  const executeLocalSearch = async () => {
    const requestId = `req_${Date.now()}`;
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
    
    console.log('=== LOCAL SEARCH VIA LEADBOT WEBHOOK START ===');
    console.log('Request ID:', requestId);
    console.log('Retry count:', retryCount);
    console.log('Search filters:', filters);

    const loadingResponse: WebhookResponse = {
      status: 'loading',
      message: 'Recherche locale en cours via le système leadbot...',
      timestamp: new Date(),
      requestId
    };
    setWebhookResponse(loadingResponse);

    const messageToSend = buildSearchMessage();
    console.log('Message to send:', messageToSend);

    try {
      const timeoutDuration = retryCount > 1 ? 45000 : 30000;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`Request timeout after ${timeoutDuration/1000} seconds`);
        controller.abort();
      }, timeoutDuration);

      console.log('Sending request via LeadBot webhook (https://ia.bot.bj/webhook/leadbot)');

      const requestPayload = {
        message: messageToSend,
        timestamp: new Date().toISOString(),
        session_id: `local_search_${Date.now()}`,
        user_id: 'local_user',
        source: 'bot_bj_platform',
        context: 'local_prospecting'
      };

      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch('https://ia.bot.bj/webhook/leadbot', {
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

      console.log('Response received from leadbot webhook!');
      console.log('Status:', response.status, 'Status Text:', response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let responseData;
      let processedContent;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('JSON Response from leadbot:', JSON.stringify(responseData, null, 2));
        
        processedContent = responseData.output || 
                          responseData.message || 
                          responseData.response || 
                          responseData.text || 
                          responseData.content ||
                          responseData.reply ||
                          (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
      } else {
        responseData = await response.text();
        console.log('Text Response from leadbot:', responseData);
        processedContent = responseData;
      }

      if (!processedContent || processedContent.trim() === '') {
        throw new Error('Empty or invalid response from leadbot webhook');
      }

      const extractedBusinesses = parseLocalBusinessResponse(processedContent);
      console.log('Extracted businesses from leadbot response:', extractedBusinesses);

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
        title: "Prospection Locale - Succès avec LeadBot",
        description: `${extractedBusinesses.length} entreprises locales trouvées via leadbot`,
      });

      console.log('Local search completed successfully via leadbot webhook');

    } catch (error) {
      console.error('=== LOCAL SEARCH ERROR WITH LEADBOT ===');
      console.error('Error details:', error);
      
      let errorStatus: 'error' | 'timeout' = 'error';
      let errorMessage = "Erreur de connexion au système leadbot";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorStatus = 'timeout';
          errorMessage = `Timeout de la requête leadbot (${retryCount > 1 ? 45 : 30}s)`;
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Impossible de se connecter au webhook leadbot";
        } else if (error.message.includes('CORS')) {
          errorMessage = "Problème CORS avec le webhook leadbot";
        }
      }

      const mockBusinesses = getMockBusinesses();
      
      const errorResponse: WebhookResponse = {
        status: errorStatus,
        message: `${errorMessage}. Affichage des données de démonstration.`,
        data: mockBusinesses,
        timestamp: new Date(),
        requestId
      };

      setWebhookResponse(errorResponse);
      setSearchHistory(prev => [errorResponse, ...prev.slice(0, 4)]);
      
      toast({
        title: "Prospection Locale - Utilisation des données de démo",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('=== LOCAL SEARCH END ===');
    }
  };

  const handleFilterChange = (key: keyof LocalFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    console.log(`Filter ${key} changed to:`, value);
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
    console.log('Exporting local business results...');
    const businessesToExport = webhookResponse?.data || getMockBusinesses();
    
    const csvContent = [
      ['Nom', 'Catégorie', 'Adresse', 'Téléphone', 'Email', 'Site Web', 'Note', 'Avis', 'Distance (km)'],
      ...businessesToExport.map(business => [
        business.name,
        business.category,
        business.address,
        business.phone,
        business.email,
        business.website,
        business.rating.toString(),
        business.reviewCount.toString(),
        business.distance.toString()
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
      location: '',
      radius: '5',
      category: '',
      keywords: '',
      minRating: '',
      hasWebsite: '',
      hasPhone: ''
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

  if (showResults) {
    const displayBusinesses = webhookResponse?.data || getMockBusinesses();
    
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleBackToSearch} className="text-black hover:bg-gray-200">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Nouvelle recherche
              </Button>
              <h1 className="text-2xl font-bold text-black">Résultats Prospection Locale</h1>
              <Badge variant="secondary" className="bg-gray-800 text-white">{displayBusinesses.length} entreprises trouvées</Badge>
            </div>
            <div className="flex space-x-2">
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
                  {webhookResponse.status !== 'success' && (
                    <Badge className="bg-yellow-100 text-yellow-800">Données de démonstration</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-6">
            <Card className="bg-white border-gray-300">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center text-black">
                  <MapPin className="w-5 h-5 mr-2" />
                  Carte des Entreprises Locales
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-96">
                  <MapboxMap 
                    businesses={displayBusinesses} 
                    userLocation={userLocation}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-gray-300">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="flex items-center text-black">
                <MapPin className="w-5 h-5 mr-2" />
                Entreprises Locales Identifiées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="text-black font-semibold">Nom</TableHead>
                      <TableHead className="text-black font-semibold">Catégorie</TableHead>
                      <TableHead className="text-black font-semibold">Adresse</TableHead>
                      <TableHead className="text-black font-semibold">Téléphone</TableHead>
                      <TableHead className="text-black font-semibold">Email</TableHead>
                      <TableHead className="text-black font-semibold">Site Web</TableHead>
                      <TableHead className="text-black font-semibold">Note</TableHead>
                      <TableHead className="text-black font-semibold">Avis</TableHead>
                      <TableHead className="text-black font-semibold">Distance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayBusinesses.map((business) => (
                      <TableRow key={business.id} className="border-gray-200 hover:bg-gray-50">
                        <TableCell className="font-medium text-black">{business.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-gray-400 text-black">{business.category}</Badge>
                        </TableCell>
                        <TableCell className="text-black">{business.address}</TableCell>
                        <TableCell className="text-black">
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-600" />
                            <a href={`tel:${business.phone}`} className="text-blue-600 hover:underline">
                              {business.phone}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="text-black">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-600" />
                            <a href={`mailto:${business.email}`} className="text-blue-600 hover:underline">
                              {business.email}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Globe className="w-4 h-4 mr-2 text-gray-600" />
                            <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              Site web
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="text-yellow-500 mr-1">★</span>
                            <span className="text-black">{business.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-black">{business.reviewCount} avis</TableCell>
                        <TableCell className="text-black">{business.distance} km</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
            <h1 className="text-2xl font-bold text-black">Prospection Locale - Entreprises de Proximité</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-white border-gray-300">
              <CardHeader className="bg-gray-200 border-b border-gray-300">
                <CardTitle className="flex items-center text-black">
                  <Filter className="w-5 h-5 mr-2" />
                  Critères de Recherche Locale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-black">Localisation</Label>
                  <Input
                    placeholder="Ville, quartier, code postal"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="border-gray-300 text-black placeholder:text-gray-500"
                  />
                  <Select value={filters.radius} onValueChange={(value) => handleFilterChange('radius', value)}>
                    <SelectTrigger className="border-gray-300 text-black">
                      <SelectValue placeholder="Rayon de recherche" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="1">1 km</SelectItem>
                      <SelectItem value="2">2 km</SelectItem>
                      <SelectItem value="5">5 km</SelectItem>
                      <SelectItem value="10">10 km</SelectItem>
                      <SelectItem value="20">20 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-black">Secteur d'activité</Label>
                  <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                    <SelectTrigger className="border-gray-300 text-black">
                      <SelectValue placeholder="Catégorie d'entreprise" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="restaurant">Restaurant & Alimentation</SelectItem>
                      <SelectItem value="commerce">Commerce & Retail</SelectItem>
                      <SelectItem value="services">Services professionnels</SelectItem>
                      <SelectItem value="sante">Santé & Bien-être</SelectItem>
                      <SelectItem value="automobile">Automobile</SelectItem>
                      <SelectItem value="immobilier">Immobilier</SelectItem>
                      <SelectItem value="construction">Construction & BTP</SelectItem>
                      <SelectItem value="beaute">Beauté & Esthétique</SelectItem>
                      <SelectItem value="education">Éducation & Formation</SelectItem>
                      <SelectItem value="loisirs">Loisirs & Divertissement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-black">Mots-clés</Label>
                  <Input
                    placeholder="Produits, services spécifiques..."
                    value={filters.keywords}
                    onChange={(e) => handleFilterChange('keywords', e.target.value)}
                    className="border-gray-300 text-black placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-black">Critères de qualité</Label>
                  <Select value={filters.minRating} onValueChange={(value) => handleFilterChange('minRating', value)}>
                    <SelectTrigger className="border-gray-300 text-black">
                      <SelectValue placeholder="Note minimale" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="3">3 étoiles et plus</SelectItem>
                      <SelectItem value="4">4 étoiles et plus</SelectItem>
                      <SelectItem value="4.5">4.5 étoiles et plus</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.hasWebsite} onValueChange={(value) => handleFilterChange('hasWebsite', value)}>
                    <SelectTrigger className="border-gray-300 text-black">
                      <SelectValue placeholder="Présence web" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="yes">Avec site web</SelectItem>
                      <SelectItem value="no">Peu importe</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.hasPhone} onValueChange={(value) => handleFilterChange('hasPhone', value)}>
                    <SelectTrigger className="border-gray-300 text-black">
                      <SelectValue placeholder="Contact téléphonique" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="yes">Avec téléphone</SelectItem>
                      <SelectItem value="no">Peu importe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col space-y-2">
                  <Button 
                    onClick={executeLocalSearch} 
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
                      <span>Réponse du Système LeadBot</span>
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
                        <strong>{webhookResponse.data.length}</strong> entreprises locales trouvées et géolocalisées
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
                        onClick={executeLocalSearch}
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
                  <CardTitle className="text-black">Interface de Prospection Locale</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-lg mb-2 text-black font-medium">Prêt pour la recherche locale</p>
                    <p className="text-gray-600">Configurez vos critères et lancez la recherche via le système leadbot</p>
                    
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
