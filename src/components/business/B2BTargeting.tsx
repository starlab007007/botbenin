
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

export const B2BTargeting: React.FC<B2BTargetingProps> = ({ onBack }) => {
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
  const { toast } = useToast();

  // Enhanced mock results with comprehensive data
  const mockResults: B2BContact[] = [
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
    },
    {
      id: '4',
      name: 'Laurent Moreau',
      companyName: 'DataScience Corp',
      jobTitle: 'CTO',
      location: 'Toulouse, France',
      linkedinUrl: 'https://linkedin.com/in/laurentmoreau',
      email: 'laurent.moreau@datascience.fr',
      phone: '+33 5 61 12 34 56',
      industry: 'Technology',
      companySize: '200-500',
      coordinates: [1.4442, 43.6047]
    },
    {
      id: '5',
      name: 'Camille Bertrand',
      companyName: 'Green Solutions',
      jobTitle: 'Directrice Développement',
      location: 'Nantes, France',
      linkedinUrl: 'https://linkedin.com/in/camillebertrand',
      email: 'camille.bertrand@greensolutions.fr',
      phone: '+33 2 40 89 67 45',
      industry: 'Environmental',
      companySize: '50-100',
      coordinates: [-1.5534, 47.2184]
    }
  ];

  // Get user's geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
          console.log('User location detected:', position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          setUserLocation([2.3522, 48.8566]);
        }
      );
    } else {
      setUserLocation([2.3522, 48.8566]);
    }
  }, []);

  const handleFilterChange = (key: keyof B2BFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    console.log(`Filter ${key} changed to:`, value);
  };

  const buildSearchPayload = () => {
    const payload: any = {
      type: 'b2b_search',
      action: 'search_contacts',
      timestamp: new Date().toISOString(),
      session_id: `b2b_search_${Date.now()}`,
      user_id: 'b2b_user',
      source: 'b2b_targeting_platform',
      context: 'b2b_search',
      origin: window.location.origin,
      user_agent: navigator.userAgent
    };
    
    // Add filter data
    if (filters.companyName) payload.entreprise = filters.companyName;
    if (filters.industry) payload.secteur = filters.industry;
    if (filters.jobTitle) payload.poste = filters.jobTitle;
    if (filters.location) payload.localisation = filters.location;
    if (filters.companySize) payload.taille_entreprise = filters.companySize;
    if (filters.department) payload.departement = filters.department;
    if (filters.experience) payload.experience = filters.experience;
    if (filters.keywords) payload.mots_cles = filters.keywords;

    return payload;
  };

  const executeWebhookSearch = async () => {
    const requestId = `req_${Date.now()}`;
    setIsLoading(true);
    
    console.log('=== B2B WEBHOOK SEARCH START ===');
    console.log('Request ID:', requestId);
    console.log('Search filters:', filters);

    // Initialize loading response
    const loadingResponse: WebhookResponse = {
      status: 'loading',
      message: 'Recherche en cours vers le backend n8n...',
      timestamp: new Date(),
      requestId
    };
    setWebhookResponse(loadingResponse);

    const payload = buildSearchPayload();
    console.log('Search payload:', JSON.stringify(payload, null, 2));

    const webhookUrl = 'https://ia.bot.bj/webhook/lead';

    try {
      // Create timeout controller with extended timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout after 45 seconds');
        controller.abort();
      }, 45000);

      console.log('Sending request to n8n webhook:', webhookUrl);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'B2B-Targeting-Platform/1.0',
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache',
          'X-Request-ID': requestId
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        credentials: 'omit'
      });

      clearTimeout(timeoutId);

      console.log('Response received from n8n!');
      console.log('Status:', response.status, 'Status Text:', response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      let responseData;
      let processedContent;
      let extractedContacts: B2BContact[] = [];

      const contentType = response.headers.get('content-type') || '';
      console.log('Content-Type:', contentType);

      if (response.ok) {
        if (contentType.includes('application/json')) {
          responseData = await response.json();
          console.log('JSON Response from n8n:', JSON.stringify(responseData, null, 2));
          
          // Extract message
          processedContent = responseData.output || 
                            responseData.message || 
                            responseData.response || 
                            responseData.text || 
                            responseData.content ||
                            responseData.reply ||
                            'Recherche terminée avec succès';

          // Extract contacts data
          if (responseData.contacts || responseData.leads || responseData.results || responseData.data) {
            const contactsData = responseData.contacts || responseData.leads || responseData.results || responseData.data;
            if (Array.isArray(contactsData)) {
              extractedContacts = contactsData;
              console.log('Contacts extracted from n8n response:', extractedContacts.length);
            }
          }
        } else {
          responseData = await response.text();
          console.log('Text Response from n8n:', responseData);
          processedContent = responseData || 'Réponse reçue du backend';
        }

        // Create success response
        const successResponse: WebhookResponse = {
          status: 'success',
          message: processedContent,
          data: extractedContacts.length > 0 ? extractedContacts : mockResults,
          timestamp: new Date(),
          requestId
        };

        setWebhookResponse(successResponse);
        setSearchHistory(prev => [successResponse, ...prev.slice(0, 4)]);

        toast({
          title: "Recherche B2B - Succès",
          description: `${extractedContacts.length > 0 ? extractedContacts.length : mockResults.length} contacts trouvés`,
        });

        console.log('Webhook search completed successfully');

      } else {
        // Handle HTTP errors
        const errorText = await response.text();
        console.error('HTTP Error Response:', errorText);
        
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('=== B2B WEBHOOK SEARCH ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      
      let errorStatus: 'error' | 'timeout' = 'error';
      let errorMessage = "Erreur de connexion au backend n8n";
      let fallbackMessage = "Affichage des données de démonstration";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorStatus = 'timeout';
          errorMessage = "Timeout de la requête (45s)";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Impossible de joindre le backend n8n";
        } else if (error.message.includes('NetworkError')) {
          errorMessage = "Erreur réseau";
        }
      }

      const errorResponse: WebhookResponse = {
        status: errorStatus,
        message: `${errorMessage}. ${fallbackMessage}.`,
        data: mockResults,
        timestamp: new Date(),
        requestId
      };

      setWebhookResponse(errorResponse);
      setSearchHistory(prev => [errorResponse, ...prev.slice(0, 4)]);
      
      toast({
        title: "Recherche B2B - Problème de connexion",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('=== B2B WEBHOOK SEARCH END ===');
    }
  };

  const handleViewResults = () => {
    setShowResults(true);
    console.log('Switching to results view');
  };

  const handleBackToSearch = () => {
    setShowResults(false);
    setWebhookResponse(null);
    console.log('Back to search interface');
  };

  const handleExport = () => {
    console.log('Exporting B2B results...');
    const contactsToExport = webhookResponse?.data || mockResults;
    
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

  // Results View
  if (showResults) {
    const displayContacts = webhookResponse?.data || mockResults;
    
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
              <Badge variant="secondary" className="bg-gray-800 text-white">{displayContacts.length} contacts trouvés</Badge>
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

          {/* Status Information */}
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

          {/* Map Section */}
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

          {/* Results Table */}
          <Card className="bg-white border-gray-300">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="flex items-center text-black">
                <Users className="w-5 h-5 mr-2" />
                Contacts B2B Identifiés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
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
                      <TableRow key={contact.id} className="border-gray-200 hover:bg-gray-50">
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
        </div>
      </div>
    );
  }

  // Search Interface with Response Display
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
          {/* Filters Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-gray-300">
              <CardHeader className="bg-gray-200 border-b border-gray-300">
                <CardTitle className="flex items-center text-black">
                  <Filter className="w-5 h-5 mr-2" />
                  Critères de Recherche
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* Company Information */}
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

                {/* Contact Information */}
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

                {/* Geographic Criteria */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-black">Localisation</Label>
                  <Input
                    placeholder="Ville, région, pays"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="border-gray-300 text-black placeholder:text-gray-500"
                  />
                </div>

                {/* Keywords */}
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
                    onClick={executeWebhookSearch} 
                    className="w-full bg-gray-800 text-white hover:bg-gray-700" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Recherche en cours...
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

          {/* Response Display Panel */}
          <div className="lg:col-span-2">
            {webhookResponse ? (
              <Card className={`bg-white border-gray-300 ${getStatusColor(webhookResponse.status)}`}>
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="flex items-center justify-between text-black">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(webhookResponse.status)}
                      <span>Réponse du Backend n8n</span>
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
                        <strong>{webhookResponse.data.length}</strong> contacts trouvés
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
                    <Button 
                      onClick={resetSearch}
                      variant="outline"
                      className="border-gray-400 text-black hover:bg-gray-200 px-8 py-3"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Nouvelle recherche
                    </Button>
                  </div>

                  {/* Request Details */}
                  <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                    <p className="text-xs text-gray-600">
                      <strong>Requête:</strong> {webhookResponse.requestId} | 
                      <strong> Timestamp:</strong> {webhookResponse.timestamp.toLocaleString()}
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
                    <p className="text-gray-600">Configurez vos critères et lancez la recherche pour interroger le backend n8n</p>
                    
                    {userLocation && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          Position détectée: {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
                        </p>
                      </div>
                    )}

                    {/* Search History */}
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
