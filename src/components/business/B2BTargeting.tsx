
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Download, Users } from 'lucide-react';

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
  industry: string;
  companySize: string;
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
  const [isLoading, setIsLoading] = useState(false);

  // Données simulées pour les résultats
  const mockResults: B2BContact[] = [
    {
      id: '1',
      name: 'Marie Dubois',
      companyName: 'TechCorp France',
      jobTitle: 'Directrice Marketing',
      location: 'Paris, France',
      linkedinUrl: 'https://linkedin.com/in/mariedubois',
      email: 'marie.dubois@techcorp.fr',
      industry: 'Technology',
      companySize: '500-1000'
    },
    {
      id: '2',
      name: 'Pierre Martin',
      companyName: 'InnovSolutions',
      jobTitle: 'Responsable Commercial',
      location: 'Lyon, France',
      linkedinUrl: 'https://linkedin.com/in/pierremartin',
      email: 'pierre.martin@innovsolutions.fr',
      industry: 'Consulting',
      companySize: '100-500'
    },
    {
      id: '3',
      name: 'Sophie Laurent',
      companyName: 'Digital Agency Pro',
      jobTitle: 'CEO',
      location: 'Marseille, France',
      linkedinUrl: 'https://linkedin.com/in/sophielaurent',
      email: 'sophie.laurent@digitalagency.fr',
      industry: 'Marketing',
      companySize: '50-100'
    }
  ];

  const handleFilterChange = (key: keyof B2BFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = async () => {
    setIsLoading(true);
    // Simulation d'une recherche
    await new Promise(resolve => setTimeout(resolve, 2000));
    setShowResults(true);
    setIsLoading(false);
  };

  const handleExport = () => {
    // Logique d'exportation
    console.log('Exporting results...');
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
              <h1 className="text-2xl font-bold">Résultats du Ciblage B2B</h1>
              <Badge variant="secondary">{mockResults.length} contacts trouvés</Badge>
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
                <Users className="w-5 h-5 mr-2" />
                Contacts B2B Identifiés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Secteur</TableHead>
                    <TableHead>Taille Entreprise</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>LinkedIn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockResults.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.companyName}</TableCell>
                      <TableCell>{contact.jobTitle}</TableCell>
                      <TableCell>{contact.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{contact.industry}</Badge>
                      </TableCell>
                      <TableCell>{contact.companySize}</TableCell>
                      <TableCell className="text-blue-600">{contact.email}</TableCell>
                      <TableCell>
                        <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Profil LinkedIn
                        </a>
                      </TableCell>
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
            <h1 className="text-2xl font-bold">Ciblage B2B - Entreprises & Contacts</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Critères de Recherche
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Company Information */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Informations Entreprise</Label>
                  <Input
                    placeholder="Nom de l'entreprise"
                    value={filters.companyName}
                    onChange={(e) => handleFilterChange('companyName', e.target.value)}
                  />
                  <Select value={filters.industry} onValueChange={(value) => handleFilterChange('industry', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Secteur d'activité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technologie</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Santé</SelectItem>
                      <SelectItem value="consulting">Conseil</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="retail">Commerce</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.companySize} onValueChange={(value) => handleFilterChange('companySize', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Taille de l'entreprise" />
                    </SelectTrigger>
                    <SelectContent>
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
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Critères Contact</Label>
                  <Input
                    placeholder="Titre du poste"
                    value={filters.jobTitle}
                    onChange={(e) => handleFilterChange('jobTitle', e.target.value)}
                  />
                  <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Département" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="sales">Commercial</SelectItem>
                      <SelectItem value="hr">Ressources Humaines</SelectItem>
                      <SelectItem value="it">Informatique</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="operations">Opérations</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.experience} onValueChange={(value) => handleFilterChange('experience', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Niveau d'expérience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Débutant (0-2 ans)</SelectItem>
                      <SelectItem value="mid">Intermédiaire (3-5 ans)</SelectItem>
                      <SelectItem value="senior">Senior (6-10 ans)</SelectItem>
                      <SelectItem value="executive">Cadre (10+ ans)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Geographic Criteria */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Localisation</Label>
                  <Input
                    placeholder="Ville, région, pays"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                  />
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Mots-clés</Label>
                  <Input
                    placeholder="Compétences, certifications, etc."
                    value={filters.keywords}
                    onChange={(e) => handleFilterChange('keywords', e.target.value)}
                  />
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
                      Lancer la recherche
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
                <CardTitle>Prévisualisation des Résultats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Configurez vos critères de recherche</p>
                  <p>Les résultats apparaîtront ici après avoir lancé la recherche</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
