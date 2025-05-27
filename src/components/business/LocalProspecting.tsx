
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Download, MapPin, Star, Phone } from 'lucide-react';

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
  category: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  hours: string;
  priceRange: string;
  distance: string;
}

interface LocalProspectingProps {
  onBack: () => void;
}

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
  const [isLoading, setIsLoading] = useState(false);

  // Données simulées pour les entreprises locales
  const mockResults: LocalBusiness[] = [
    {
      id: '1',
      name: 'Boulangerie Artisanale Dupont',
      category: 'Boulangerie',
      address: '123 Rue de la République, 75001 Paris',
      phone: '01 42 33 44 55',
      website: 'www.boulangerie-dupont.fr',
      rating: 4.5,
      reviewCount: 127,
      hours: '7h00 - 19h30',
      priceRange: '€€',
      distance: '0.5 km'
    },
    {
      id: '2',
      name: 'Restaurant Le Petit Bistrot',
      category: 'Restaurant',
      address: '45 Avenue des Champs, 75008 Paris',
      phone: '01 45 67 89 12',
      website: 'www.petitbistrot.com',
      rating: 4.2,
      reviewCount: 89,
      hours: '12h00 - 14h30, 19h00 - 23h00',
      priceRange: '€€€',
      distance: '1.2 km'
    },
    {
      id: '3',
      name: 'Salon de Coiffure Moderne',
      category: 'Beauté & Bien-être',
      address: '67 Boulevard Saint-Germain, 75005 Paris',
      phone: '01 43 25 67 89',
      website: 'www.salon-moderne.fr',
      rating: 4.7,
      reviewCount: 156,
      hours: '9h00 - 19h00',
      priceRange: '€€',
      distance: '0.8 km'
    }
  ];

  const handleFilterChange = (key: keyof LocalFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setShowResults(true);
    setIsLoading(false);
  };

  const handleExport = () => {
    console.log('Exporting local business results...');
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
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  if (showResults) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setShowResults(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux filtres
              </Button>
              <h1 className="text-2xl font-bold">Entreprises Locales Trouvées</h1>
              <Badge variant="secondary">{mockResults.length} entreprises trouvées</Badge>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              <Button onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au menu
              </Button>
            </div>
          </div>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Entreprises Locales Identifiées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de l'entreprise</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Site Web</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Horaires</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockResults.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell className="font-medium">{business.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{business.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{business.address}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          {business.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a href={`https://${business.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {business.website}
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Prospection Locale - Entreprises de Proximité</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Critères de Recherche Locale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location Criteria */}
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

                {/* Business Type */}
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

                {/* Quality Criteria */}
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

                {/* Digital Presence */}
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

                <Button 
                  onClick={handleSearch} 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>Recherche en cours...</>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Rechercher les entreprises
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Aperçu de la Carte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Configurez votre zone de recherche</p>
                  <p>Une carte interactive avec les entreprises locales apparaîtra ici</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
