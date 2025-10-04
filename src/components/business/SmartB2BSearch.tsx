import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Building2, 
  Target, 
  Sparkles, 
  Zap,
  TrendingUp,
  Filter,
  X,
  Plus,
  Globe,
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SmartSearchFilters {
  // Type de prospection
  prospectType: string;
  
  // Localisation intelligente
  location: string;
  locationCoordinates?: { lat: number; lng: number };
  radius: number;
  useGPS: boolean;
  country: string;
  city: string;
  
  // Entreprise
  companyName: string;
  industry: string[];
  companySize: string;
  employeeCount: string;
  annualRevenue: string;
  foundedYear: string;
  companyType: string;
  certifications: string[];
  
  // Recherche avancée
  keywords: string[];
  description: string;
  excludeKeywords: string[];
  budget: string;
  urgency: string;
  
  // IA Préférences
  aiSuggestions: boolean;
  prioritizeLocal: boolean;
  qualityScore: number;
  verifiedOnly: boolean;
}

interface SmartB2BSearchProps {
  onBack: () => void;
  onSearch: (filters: SmartSearchFilters) => void;
}

const PROSPECT_TYPES = [
  { 
    value: 'b2b', 
    label: 'B2B (Business to Business)', 
    icon: '🏢',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    description: 'Vendre à des entreprises'
  },
  { 
    value: 'b2c', 
    label: 'B2C (Business to Consumer)', 
    icon: '🌍',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    description: 'Vendre aux particuliers'
  },
  { 
    value: 'enterprise', 
    label: 'Entreprise Commerciale', 
    icon: '🏪',
    color: 'bg-green-100 text-green-700 border-green-300',
    description: 'Commerces et boutiques'
  },
  { 
    value: 'profile', 
    label: 'Profil Personnel', 
    icon: '👤',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    description: 'Profils individuels'
  }
];

const INDUSTRIES = [
  'Technologie', 'Informatique', 'Finance', 'Santé', 'Education', 'Commerce', 'Industrie',
  'Services', 'Transport', 'Immobilier', 'Agriculture', 'Tourisme', 'Média', 'Restaurant',
  'Construction', 'Energie', 'Télécommunications', 'Conseil', 'Formation'
];

const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup (1-10)', icon: '🚀' },
  { value: 'small', label: 'PME (11-50)', icon: '🏢' },
  { value: 'medium', label: 'ETI (51-250)', icon: '🏬' },
  { value: 'large', label: 'Grande (250+)', icon: '🏭' }
];

const COMPANY_TYPES = [
  { value: 'sarl', label: 'SARL' },
  { value: 'sa', label: 'SA' },
  { value: 'sas', label: 'SAS' },
  { value: 'startup', label: 'Startup' },
  { value: 'association', label: 'Association' },
  { value: 'public', label: 'Secteur public' }
];

const CERTIFICATIONS = [
  'ISO 9001', 'ISO 14001', 'ISO 27001', 'OHSAS 18001',
  'Qualité certifiée', 'Label RSE', 'Entreprise innovante'
];

export const SmartB2BSearch: React.FC<SmartB2BSearchProps> = ({ onBack, onSearch }) => {
  const [filters, setFilters] = useState<SmartSearchFilters>({
    prospectType: 'b2b',
    location: '',
    locationCoordinates: undefined,
    radius: 25,
    useGPS: false,
    country: '',
    city: '',
    companyName: '',
    industry: [],
    companySize: '',
    employeeCount: '',
    annualRevenue: '',
    foundedYear: '',
    companyType: '',
    certifications: [],
    keywords: [],
    description: '',
    excludeKeywords: [],
    budget: '',
    urgency: 'medium',
    aiSuggestions: true,
    prioritizeLocal: true,
    qualityScore: 7,
    verifiedOnly: false
  });

  const [currentKeyword, setCurrentKeyword] = useState('');
  const [currentExcludeKeyword, setCurrentExcludeKeyword] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<string>('');
  const { toast } = useToast();

  // Géolocalisation automatique avec reverse geocoding
  useEffect(() => {
    if (filters.useGPS && navigator.geolocation) {
      toast({
        title: "Recherche de position...",
        description: "Localisation en cours...",
      });

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Reverse geocoding avec Nominatim pour obtenir une vraie adresse
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr&addressdetails=1`
            );
            
            if (response.ok) {
              const data = await response.json();
              const formattedAddress = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
              
              setUserLocation(formattedAddress);
              setFilters(prev => ({ 
                ...prev, 
                location: formattedAddress,
                locationCoordinates: { lat: latitude, lng: longitude }
              }));
              
              toast({
                title: "Position détectée avec succès",
                description: "Votre adresse a été automatiquement configurée",
              });
            } else {
              throw new Error('Reverse geocoding failed');
            }
          } catch (error) {
            console.error('Erreur géolocalisation:', error);
            
            // Fallback avec coordonnées si reverse geocoding échoue
            const { latitude, longitude } = position.coords;
            const fallbackLocation = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            
            setUserLocation(fallbackLocation);
            setFilters(prev => ({ 
              ...prev, 
              location: fallbackLocation,
              locationCoordinates: { lat: latitude, lng: longitude }
            }));
            
            toast({
              title: "Position détectée",
              description: "Coordonnées configurées automatiquement",
            });
          }
        },
        (error) => {
          console.error('Erreur GPS:', error);
          setFilters(prev => ({ ...prev, useGPS: false }));
          
          toast({
            title: "Géolocalisation indisponible",
            description: "Veuillez saisir manuellement votre localisation",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000 // 10 minutes
        }
      );
    }
  }, [filters.useGPS, toast]);

  // Suggestions IA basées sur les filtres actuels
  useEffect(() => {
    if (filters.aiSuggestions && filters.industry.length > 0) {
      const suggestions = generateAISuggestions(filters);
      setAiSuggestions(suggestions);
    }
  }, [filters.industry, filters.aiSuggestions]);

  const generateAISuggestions = (currentFilters: SmartSearchFilters): string[] => {
    const suggestions: string[] = [];
    
    // Suggestions plus larges et efficaces pour Google Maps
    if (currentFilters.industry.includes('Technologie')) {
      suggestions.push('informatique', 'ordinateur', 'software', 'digital');
    }
    if (currentFilters.industry.includes('Informatique')) {
      suggestions.push('technologie', 'ordinateur', 'réparation', 'vente');
    }
    if (currentFilters.industry.includes('Finance')) {
      suggestions.push('banque', 'assurance', 'crédit', 'finance');
    }
    if (currentFilters.industry.includes('Commerce')) {
      suggestions.push('magasin', 'boutique', 'vente', 'commerce');
    }
    if (currentFilters.industry.includes('Restaurant')) {
      suggestions.push('restaurant', 'café', 'bar', 'restauration');
    }
    if (currentFilters.industry.includes('Services')) {
      suggestions.push('service', 'prestation', 'conseil', 'assistance');
    }
    
    return suggestions.slice(0, 6);
  };

  const handleIndustryToggle = (industry: string) => {
    setFilters(prev => ({
      ...prev,
      industry: prev.industry.includes(industry)
        ? prev.industry.filter(i => i !== industry)
        : [...prev.industry, industry]
    }));
  };

  const handleAddKeyword = () => {
    if (currentKeyword.trim() && !filters.keywords.includes(currentKeyword.trim())) {
      setFilters(prev => ({
        ...prev,
        keywords: [...prev.keywords, currentKeyword.trim()]
      }));
      setCurrentKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFilters(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const handleAddExcludeKeyword = () => {
    if (currentExcludeKeyword.trim() && !filters.excludeKeywords.includes(currentExcludeKeyword.trim())) {
      setFilters(prev => ({
        ...prev,
        excludeKeywords: [...prev.excludeKeywords, currentExcludeKeyword.trim()]
      }));
      setCurrentExcludeKeyword('');
    }
  };

  const handleRemoveExcludeKeyword = (keyword: string) => {
    setFilters(prev => ({
      ...prev,
      excludeKeywords: prev.excludeKeywords.filter(k => k !== keyword)
    }));
  };

  const handleCertificationToggle = (cert: string) => {
    setFilters(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }));
  };

  const handleAISuggestionClick = (suggestion: string) => {
    if (!filters.keywords.includes(suggestion)) {
      setFilters(prev => ({
        ...prev,
        keywords: [...prev.keywords, suggestion]
      }));
    }
  };

  const handleSearch = () => {
    if (!filters.location && !filters.useGPS) {
      toast({
        title: "Localisation requise",
        description: "Veuillez préciser une localisation ou activer le GPS",
        variant: "destructive",
      });
      return;
    }

    if (filters.industry.length === 0 && filters.keywords.length === 0) {
      toast({
        title: "Critères insuffisants",
        description: "Veuillez définir au moins un secteur d'activité ou des mots-clés pour Google Maps",
        variant: "destructive",
      });
      return;
    }

    // Avertissement pour les recherches trop spécifiques
    if (filters.industry.length > 0 && filters.keywords.length > 2) {
      toast({
        title: "Recommandation",
        description: "Pour de meilleurs résultats avec Google Maps, utilisez des termes plus généraux",
      });
    }

    onSearch(filters);
  };

  const resetFilters = () => {
    setFilters({
      prospectType: 'b2b',
      location: '',
      locationCoordinates: undefined,
      radius: 25,
      useGPS: false,
      country: '',
      city: '',
      companyName: '',
      industry: [],
      companySize: '',
      employeeCount: '',
      annualRevenue: '',
      foundedYear: '',
      companyType: '',
      certifications: [],
      keywords: [],
      description: '',
      excludeKeywords: [],
      budget: '',
      urgency: 'medium',
      aiSuggestions: true,
      prioritizeLocal: true,
      qualityScore: 7,
      verifiedOnly: false
    });
    setCurrentKeyword('');
    setCurrentExcludeKeyword('');
    setAiSuggestions([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mr-4 hover:bg-white/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Recherche B2B Intelligente
            </h1>
            <p className="text-gray-600 mt-1">
              Trouvez vos prospects idéaux avec la puissance de l'IA
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-600">IA Activée</span>
          </div>
        </div>

        {/* Type de prospection - Nouvelle section */}
        <Card className="mb-6 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Type de prospection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PROSPECT_TYPES.map((type) => (
                <Card
                  key={type.value}
                  className={`cursor-pointer transition-all hover:scale-105 border-2 ${
                    filters.prospectType === type.value 
                      ? `${type.color} ring-2 ring-offset-2` 
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => setFilters(prev => ({ ...prev, prospectType: type.value }))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{type.icon}</div>
                      <div className="flex-1">
                        <p className="font-semibold">{type.label}</p>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                      {filters.prospectType === type.value && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">✓</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="location" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Localisation
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Entreprise
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Avancé
            </TabsTrigger>
          </TabsList>

          {/* Localisation Tab */}
          <TabsContent value="location">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Ciblage Géographique Intelligent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Géolocalisation GPS</p>
                        <p className="text-sm text-gray-600">Détection automatique de votre position</p>
                      </div>
                    </div>
                    <Switch
                      checked={filters.useGPS}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, useGPS: checked }))}
                    />
                  </div>
                  
                  {!filters.useGPS && (
                    <Button
                      onClick={() => setFilters(prev => ({ ...prev, useGPS: true }))}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Détecter ma position
                    </Button>
                  )}
                </div>

                {!filters.useGPS && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="country">Pays</Label>
                        <Input
                          id="country"
                          placeholder="Ex: France, Bénin..."
                          value={filters.country}
                          onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Ville</Label>
                        <Input
                          id="city"
                          placeholder="Ex: Paris, Cotonou..."
                          value={filters.city}
                          onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location">Adresse complète (optionnel)</Label>
                      <AddressAutocomplete
                        value={filters.location}
                        onChange={(address, coordinates) => {
                          setFilters(prev => ({
                            ...prev,
                            location: address,
                            locationCoordinates: coordinates
                          }));
                        }}
                        placeholder="Ex: 123 Avenue des Champs-Élysées, Paris..."
                        className="text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        🔍 Saisissez au moins 3 caractères pour voir les suggestions d'adresses
                      </p>
                    </div>
                  </>
                )}

                {userLocation && filters.useGPS && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">📍 Position détectée: {userLocation}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <Label>Rayon de recherche: {filters.radius} km</Label>
                  <Slider
                    value={[filters.radius]}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, radius: value[0] }))}
                    max={100}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Local (5km)</span>
                    <span>Régional (50km)</span>
                    <span>National (100km)</span>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Conseils de recherche géographique
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Indiquez le pays et la ville pour des résultats plus précis</li>
                    <li>• Utilisez le GPS pour un ciblage ultra-local</li>
                    <li>• Ajustez le rayon selon votre zone de prospection</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entreprise Tab */}
          <TabsContent value="company">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                  Critères Entreprise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom d'entreprise (optionnel)</Label>
                  <Input
                    id="companyName"
                    placeholder="Ex: Google, Microsoft, startup..."
                    value={filters.companyName}
                    onChange={(e) => setFilters(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">Laissez vide pour une recherche large</p>
                </div>

                <div className="space-y-3">
                  <Label>Secteurs d'activité</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {INDUSTRIES.map((industry) => (
                      <Badge
                        key={industry}
                        variant={filters.industry.includes(industry) ? "default" : "outline"}
                        className="cursor-pointer text-center py-2 transition-all hover:scale-105"
                        onClick={() => handleIndustryToggle(industry)}
                      >
                        {industry}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Taille d'entreprise</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {COMPANY_SIZES.map((size) => (
                      <Card
                        key={size.value}
                        className={`cursor-pointer transition-all hover:scale-105 ${
                          filters.companySize === size.value 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setFilters(prev => ({ 
                          ...prev, 
                          companySize: prev.companySize === size.value ? '' : size.value 
                        }))}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl mb-2">{size.icon}</div>
                          <p className="font-medium">{size.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeCount">Nombre d'employés (optionnel)</Label>
                    <Select value={filters.employeeCount} onValueChange={(value) => setFilters(prev => ({ ...prev, employeeCount: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employés</SelectItem>
                        <SelectItem value="11-50">11-50 employés</SelectItem>
                        <SelectItem value="51-200">51-200 employés</SelectItem>
                        <SelectItem value="201-500">201-500 employés</SelectItem>
                        <SelectItem value="500+">500+ employés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="annualRevenue">Chiffre d'affaires annuel</Label>
                    <Select value={filters.annualRevenue} onValueChange={(value) => setFilters(prev => ({ ...prev, annualRevenue: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-100k">0-100K €</SelectItem>
                        <SelectItem value="100k-500k">100K-500K €</SelectItem>
                        <SelectItem value="500k-1m">500K-1M €</SelectItem>
                        <SelectItem value="1m-5m">1M-5M €</SelectItem>
                        <SelectItem value="5m+">5M+ €</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="foundedYear">Année de création</Label>
                    <Input
                      id="foundedYear"
                      type="number"
                      placeholder="Ex: 2020"
                      value={filters.foundedYear}
                      onChange={(e) => setFilters(prev => ({ ...prev, foundedYear: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyType">Type d'entreprise</Label>
                    <Select value={filters.companyType} onValueChange={(value) => setFilters(prev => ({ ...prev, companyType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Certifications & Labels (optionnel)</Label>
                  <div className="flex flex-wrap gap-2">
                    {CERTIFICATIONS.map((cert) => (
                      <Badge
                        key={cert}
                        variant={filters.certifications.includes(cert) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => handleCertificationToggle(cert)}
                      >
                        {cert}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Sélectionnez les certifications importantes pour vous</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-600" />
                  Recherche Avancée & IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Mots-clés stratégiques (à inclure)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ajoutez un mot-clé..."
                      value={currentKeyword}
                      onChange={(e) => setCurrentKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                    />
                    <Button onClick={handleAddKeyword} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {filters.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filters.keywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="pr-1">
                          {keyword}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 ml-1"
                            onClick={() => handleRemoveKeyword(keyword)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {aiSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-orange-600 flex items-center gap-1">
                        <Sparkles className="w-4 h-4" />
                        Suggestions IA
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {aiSuggestions.map((suggestion) => (
                          <Badge
                            key={suggestion}
                            variant="outline"
                            className="cursor-pointer hover:bg-orange-50 transition-colors"
                            onClick={() => handleAISuggestionClick(suggestion)}
                          >
                            + {suggestion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Mots-clés à exclure (optionnel)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Excluez des mots-clés..."
                      value={currentExcludeKeyword}
                      onChange={(e) => setCurrentExcludeKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddExcludeKeyword()}
                    />
                    <Button onClick={handleAddExcludeKeyword} size="sm" variant="destructive">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {filters.excludeKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filters.excludeKeywords.map((keyword) => (
                        <Badge key={keyword} variant="destructive" className="pr-1">
                          {keyword}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 ml-1"
                            onClick={() => handleRemoveExcludeKeyword(keyword)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">Les prospects contenant ces termes seront exclus</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description libre de votre recherche</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez votre prospect idéal en langage naturel..."
                    value={filters.description}
                    onChange={(e) => setFilters(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-gray-500">Utilisez vos propres mots pour décrire votre cible idéale</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget estimé du prospect</Label>
                    <Select value={filters.budget} onValueChange={(value) => setFilters(prev => ({ ...prev, budget: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Petit budget (&lt;10K €)</SelectItem>
                        <SelectItem value="medium">Budget moyen (10K-50K €)</SelectItem>
                        <SelectItem value="large">Gros budget (50K-200K €)</SelectItem>
                        <SelectItem value="enterprise">Budget entreprise (200K+ €)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="urgency">Niveau d'urgence</Label>
                    <Select value={filters.urgency} onValueChange={(value) => setFilters(prev => ({ ...prev, urgency: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Faible - Prospection longue</SelectItem>
                        <SelectItem value="medium">Moyen - Standard</SelectItem>
                        <SelectItem value="high">Élevé - Besoin immédiat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <Label>Score de qualité minimum: {filters.qualityScore}/10</Label>
                    </div>
                    <Star className="w-5 h-5 text-yellow-500" />
                  </div>
                  <Slider
                    value={[filters.qualityScore]}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, qualityScore: value[0] }))}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">Plus le score est élevé, plus les résultats seront filtrés</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div>
                      <p className="font-medium">Prioriser les prospects locaux</p>
                      <p className="text-sm text-gray-600">Favorise les résultats proche de votre zone</p>
                    </div>
                    <Switch
                      checked={filters.prioritizeLocal}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, prioritizeLocal: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-600">Premium</Badge>
                      <div>
                        <p className="font-medium">Contacts vérifiés uniquement</p>
                        <p className="text-sm text-gray-600">Données validées et à jour</p>
                      </div>
                    </div>
                    <Switch
                      checked={filters.verifiedOnly}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, verifiedOnly: checked }))}
                    />
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    Optimisation IA activée
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• L'IA analysera vos critères pour suggérer des prospects pertinents</li>
                    <li>• Les résultats seront triés par pertinence automatiquement</li>
                    <li>• Les doublons et contacts invalides seront filtrés</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between items-center mt-8">
          <Button variant="outline" onClick={resetFilters} className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Réinitialiser
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {filters.industry.length + filters.keywords.length > 0 && (
                <span className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  {filters.industry.length + filters.keywords.length} critères actifs
                </span>
              )}
            </div>
            
            <Button 
              onClick={handleSearch} 
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
            >
              <Search className="w-5 h-5 mr-2" />
              Lancer la recherche IA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};