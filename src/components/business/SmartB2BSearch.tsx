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
  Users, 
  Target, 
  Sparkles, 
  Zap,
  Briefcase,
  Award,
  TrendingUp,
  Filter,
  X,
  Plus,
  Globe,
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SmartSearchFilters {
  // Localisation intelligente
  location: string;
  locationCoordinates?: { lat: number; lng: number };
  radius: number;
  useGPS: boolean;
  
  // Entreprise
  companyName: string;
  industry: string[];
  companySize: string;
  
  // Contact
  jobTitle: string;
  seniority: string;
  department: string;
  
  // Recherche avancée
  keywords: string[];
  description: string;
  
  // IA Préférences
  aiSuggestions: boolean;
  prioritizeLocal: boolean;
  qualityScore: number;
}

interface SmartB2BSearchProps {
  onBack: () => void;
  onSearch: (filters: SmartSearchFilters) => void;
}

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

const JOB_TITLES = [
  'CEO / Directeur Général', 'CTO / Directeur Technique', 'CMO / Directeur Marketing',
  'CFO / Directeur Financier', 'Responsable Commercial', 'Manager', 'Consultant',
  'Ingénieur', 'Responsable RH', 'Chef de Projet'
];

const SENIORITY_LEVELS = [
  { value: 'junior', label: 'Junior (0-2 ans)', color: 'bg-green-100 text-green-700' },
  { value: 'mid', label: 'Confirmé (3-7 ans)', color: 'bg-blue-100 text-blue-700' },
  { value: 'senior', label: 'Senior (8+ ans)', color: 'bg-purple-100 text-purple-700' },
  { value: 'executive', label: 'Direction', color: 'bg-orange-100 text-orange-700' }
];

export const SmartB2BSearch: React.FC<SmartB2BSearchProps> = ({ onBack, onSearch }) => {
  const [filters, setFilters] = useState<SmartSearchFilters>({
    location: '',
    locationCoordinates: undefined,
    radius: 25,
    useGPS: false,
    companyName: '',
    industry: [],
    companySize: '',
    jobTitle: '',
    seniority: '',
    department: '',
    keywords: [],
    description: '',
    aiSuggestions: true,
    prioritizeLocal: true,
    qualityScore: 7
  });

  const [currentKeyword, setCurrentKeyword] = useState('');
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
    if (filters.aiSuggestions && (filters.industry.length > 0 || filters.jobTitle)) {
      const suggestions = generateAISuggestions(filters);
      setAiSuggestions(suggestions);
    }
  }, [filters.industry, filters.jobTitle, filters.aiSuggestions]);

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
      location: '',
      locationCoordinates: undefined,
      radius: 25,
      useGPS: false,
      companyName: '',
      industry: [],
      companySize: '',
      jobTitle: '',
      seniority: '',
      department: '',
      keywords: [],
      description: '',
      aiSuggestions: true,
      prioritizeLocal: true,
      qualityScore: 7
    });
    setCurrentKeyword('');
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

        <Tabs defaultValue="location" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Localisation
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Entreprise
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contact
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
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Géolocalisation automatique</p>
                      <p className="text-sm text-gray-600">Utilisez votre position actuelle</p>
                    </div>
                  </div>
                  <Switch
                    checked={filters.useGPS}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, useGPS: checked }))}
                  />
                </div>

                {!filters.useGPS && (
                  <div className="space-y-2">
                    <Label htmlFor="location">Ville, région ou pays</Label>
                    <AddressAutocomplete
                      value={filters.location}
                      onChange={(address, coordinates) => {
                        setFilters(prev => ({
                          ...prev,
                          location: address,
                          locationCoordinates: coordinates
                        }));
                      }}
                      placeholder="Ex: Paris, Cotonou, Bordeaux..."
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground">
                      🔍 Saisissez au moins 3 caractères pour voir les suggestions d'adresses
                    </p>
                  </div>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Profil Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Titre du poste</Label>
                  <Select value={filters.jobTitle} onValueChange={(value) => setFilters(prev => ({ ...prev, jobTitle: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un poste" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TITLES.map((title) => (
                        <SelectItem key={title} value={title}>
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            {title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Niveau d'expérience</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {SENIORITY_LEVELS.map((level) => (
                      <Badge
                        key={level.value}
                        className={`cursor-pointer py-3 text-center transition-all hover:scale-105 ${
                          filters.seniority === level.value 
                            ? level.color + ' ring-2 ring-offset-2' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setFilters(prev => ({ 
                          ...prev, 
                          seniority: prev.seniority === level.value ? '' : level.value 
                        }))}
                      >
                        <Award className="w-4 h-4 mr-1" />
                        {level.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Département</Label>
                  <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Département cible" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commercial">Commercial & Ventes</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="tech">Technique & IT</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="rh">Ressources Humaines</SelectItem>
                      <SelectItem value="operations">Opérations</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label>Mots-clés stratégiques</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="description">Description libre de votre recherche</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez votre prospect idéal en langage naturel..."
                    value={filters.description}
                    onChange={(e) => setFilters(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px]"
                  />
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
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div>
                    <p className="font-medium">Prioriser les prospects locaux</p>
                    <p className="text-sm text-gray-600">Favorise les résultats proche de votre zone</p>
                  </div>
                  <Switch
                    checked={filters.prioritizeLocal}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, prioritizeLocal: checked }))}
                  />
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