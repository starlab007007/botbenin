
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Download, Users, MapPin, Mail, Phone, Eye, MessageSquare, Loader2 } from 'lucide-react';
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
  const [showWebhookResponse, setShowWebhookResponse] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [webhookContacts, setWebhookContacts] = useState<B2BContact[]>([]);
  const { toast } = useToast();

  // Enhanced mock results with email and phone data
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
          // Default to Paris center if geolocation fails
          setUserLocation([2.3522, 48.8566]);
        }
      );
    } else {
      // Default to Paris center if geolocation not supported
      setUserLocation([2.3522, 48.8566]);
    }
  }, []);

  const handleFilterChange = (key: keyof B2BFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    console.log(`Filter ${key} changed to:`, value);
  };

  const buildPayloadFromFilters = () => {
    const payload: any = {};
    
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

  const handleWebhookSearch = async () => {
    setIsLoading(true);
    setShowWebhookResponse(false);
    setWebhookResponse('');
    
    console.log('=== B2B WEBHOOK SEARCH START ===');
    console.log('Filters:', filters);

    const payload = buildPayloadFromFilters();
    console.log('Webhook payload:', payload);

    const webhookUrl = 'https://ia.bot.bj/webhook/lead';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout after 30 seconds');
        controller.abort();
      }, 30000);

      const requestPayload = {
        ...payload,
        timestamp: new Date().toISOString(),
        session_id: `b2b_targeting_session`,
        user_id: 'b2b_user',
        source: 'b2b_targeting_platform',
        context: 'b2b_search'
      };

      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'B2B-Targeting-Platform/1.0',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      console.log('Response received!');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Response OK:', response.ok);

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

        // Try to extract contacts data if available
        if (responseData.contacts || responseData.data || responseData.results) {
          const contactsData = responseData.contacts || responseData.data || responseData.results;
          if (Array.isArray(contactsData)) {
            setWebhookContacts(contactsData);
          }
        }
      } else {
        responseData = await response.text();
        console.log('Text Response:', responseData);
        processedContent = responseData;
      }

      console.log('Processed content:', processedContent);

      if (!processedContent || processedContent.trim() === '') {
        throw new Error('Réponse vide ou invalide du webhook');
      }

      setWebhookResponse(processedContent.trim());
      setShowWebhookResponse(true);

      console.log('Webhook response set successfully');

    } catch (error) {
      console.error('=== B2B WEBHOOK ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      
      let errorMessage = "Erreur de connexion au service de recherche. Tentative avec les données de démonstration.";
      let toastMessage = "Problème de connexion au webhook";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "La requête a pris trop de temps. Utilisation des données de démonstration.";
          toastMessage = "Timeout - utilisation des données de démo";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Impossible de se connecter au service. Utilisation des données de démonstration.";
          toastMessage = "Problème de connectivité";
        }
      }

      setWebhookResponse(errorMessage);
      setShowWebhookResponse(true);
      setWebhookContacts(mockResults); // Use mock data as fallback
      
      toast({
        title: "Recherche B2B - Problème technique",
        description: toastMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('=== B2B WEBHOOK SEARCH END ===');
    }
  };

  const handleVisualize = () => {
    setShowResults(true);
    setShowWebhookResponse(false);
    console.log('Switching to visualization view');
  };

  const handleBackToSearch = () => {
    setShowWebhookResponse(false);
    setShowResults(false);
    console.log('Back to search filters');
  };

  const handleExport = () => {
    console.log('Exporting B2B results...');
    const contactsToExport = webhookContacts.length > 0 ? webhookContacts : mockResults;
    
    // Create CSV content
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
    link.download = 'contacts_b2b.csv';
    link.click();
  };

  const resetFilters = () => {
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
    console.log('Filters reset');
  };

  // Webhook Response View
  if (showWebhookResponse) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleBackToSearch} className="text-black hover:bg-gray-200">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la recherche
              </Button>
              <h1 className="text-2xl font-bold text-black">Réponse de la Recherche B2B</h1>
            </div>
            <Button onClick={onBack} className="bg-gray-800 text-white hover:bg-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au menu
            </Button>
          </div>

          {/* Webhook Response Card */}
          <Card className="bg-white border-gray-300 mb-6">
            <CardHeader className="bg-gray-200 border-b border-gray-300">
              <CardTitle className="flex items-center text-black">
                <MessageSquare className="w-5 h-5 mr-2" />
                Réponse du Service de Recherche
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {webhookResponse}
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button 
                  onClick={handleVisualize}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Visualiser et continuer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search Summary */}
          <Card className="bg-white border-gray-300">
            <CardHeader>
              <CardTitle className="text-black text-lg">Critères de recherche utilisés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(filters).map(([key, value]) => {
                  if (!value) return null;
                  const labels: Record<string, string> = {
                    companyName: 'Entreprise',
                    industry: 'Secteur',
                    companySize: 'Taille',
                    location: 'Localisation',
                    jobTitle: 'Poste',
                    experience: 'Expérience',
                    department: 'Département',
                    keywords: 'Mots-clés'
                  };
                  return (
                    <div key={key} className="text-sm">
                      <span className="font-medium text-gray-700">{labels[key]}:</span>
                      <div className="text-gray-900">{value}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Results View
  if (showResults) {
    const displayContacts = webhookContacts.length > 0 ? webhookContacts : mockResults;
    
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
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

  // Search Form View
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
                    onClick={handleWebhookSearch} 
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
                    onClick={resetFilters}
                    className="w-full text-black border-gray-400 hover:bg-gray-200"
                    disabled={isLoading}
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-gray-300">
              <CardHeader className="bg-gray-200 border-b border-gray-300">
                <CardTitle className="text-black">Prévisualisation des Résultats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-600">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2 text-black">Configurez vos critères de recherche</p>
                  <p className="text-gray-600">Les résultats apparaîtront ici après avoir lancé la recherche</p>
                  {userLocation && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                      <p className="text-sm text-black">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Position détectée: {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
