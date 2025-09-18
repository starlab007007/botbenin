import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  User, 
  Building, 
  Globe, 
  Linkedin, 
  Target,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProspectData {
  id: string;
  contactName: string;
  companyName: string;
  companyWebsite: string;
  role: string;
  linkedinUrl: string;
  relevance: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export const ProspectPreparationPage = () => {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<ProspectData[]>([
    {
      id: '1',
      contactName: '',
      companyName: '',
      companyWebsite: '',
      role: '',
      linkedinUrl: '',
      relevance: '',
      status: 'pending'
    }
  ]);

  const addNewProspect = () => {
    const newProspect: ProspectData = {
      id: Date.now().toString(),
      contactName: '',
      companyName: '',
      companyWebsite: '',
      role: '',
      linkedinUrl: '',
      relevance: '',
      status: 'pending'
    };
    setProspects([...prospects, newProspect]);
  };

  const removeProspect = (id: string) => {
    if (prospects.length > 1) {
      setProspects(prospects.filter(p => p.id !== id));
    } else {
      toast.error('Vous devez conserver au moins un prospect');
    }
  };

  const updateProspect = (id: string, field: keyof ProspectData, value: string) => {
    setProspects(prospects.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const runAnalysis = (id: string) => {
    const prospect = prospects.find(p => p.id === id);
    if (!prospect?.contactName || !prospect?.companyName) {
      toast.error('Veuillez remplir au moins le nom du contact et de l\'entreprise');
      return;
    }

    updateProspect(id, 'status', 'in-progress');
    
    // Simulation de l'analyse
    setTimeout(() => {
      updateProspect(id, 'status', 'completed');
      toast.success(`Analyse terminée pour ${prospect.contactName}`);
    }, 3000);
  };

  const runAllAnalyses = () => {
    const validProspects = prospects.filter(p => p.contactName && p.companyName);
    if (validProspects.length === 0) {
      toast.error('Aucun prospect valide à analyser');
      return;
    }

    validProspects.forEach(prospect => {
      if (prospect.status === 'pending') {
        runAnalysis(prospect.id);
      }
    });
  };

  const saveProspects = () => {
    toast.success('Prospects sauvegardés avec succès');
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Contact Name', 'Company Name', 'Website', 'Role', 'LinkedIn URL', 'Relevance', 'Status'],
      ...prospects.map(p => [
        p.contactName,
        p.companyName,
        p.companyWebsite,
        p.role,
        p.linkedinUrl,
        p.relevance,
        p.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prospects-preparation.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Export CSV généré avec succès');
  };

  const getStatusIcon = (status: ProspectData['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: ProspectData['status']) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in-progress':
        return 'En cours';
      case 'failed':
        return 'Échec';
      default:
        return 'En attente';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <Button
              variant="ghost"
              onClick={() => navigate('/ia-prospect-precall')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Préparation d'Appel IA
              </h1>
              <p className="text-gray-600 mt-1">
                Enrichissement automatique de données prospects
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={addNewProspect}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter Prospect</span>
            </Button>
            <Button
              onClick={runAllAnalyses}
              size="sm"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline">Analyser Tout</span>
            </Button>
            <Button
              onClick={saveProspects}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Sauvegarder</span>
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Prospects Cards */}
        <div className="space-y-6">
          {prospects.map((prospect, index) => (
            <Card key={prospect.id} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Prospect #{index + 1}
                    {prospect.contactName && (
                      <span className="text-blue-600">- {prospect.contactName}</span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={prospect.status === 'completed' ? 'default' : 'secondary'}
                      className="flex items-center gap-1"
                    >
                      {getStatusIcon(prospect.status)}
                      {getStatusText(prospect.status)}
                    </Badge>
                    <Button
                      onClick={() => runAnalysis(prospect.id)}
                      disabled={prospect.status === 'in-progress'}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    {prospects.length > 1 && (
                      <Button
                        onClick={() => removeProspect(prospect.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Contact Name */}
                  <div className="space-y-2">
                    <Label htmlFor={`contact-${prospect.id}`} className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      Nom du Contact *
                    </Label>
                    <Input
                      id={`contact-${prospect.id}`}
                      value={prospect.contactName}
                      onChange={(e) => updateProspect(prospect.id, 'contactName', e.target.value)}
                      placeholder="Jean Dupont"
                      className="w-full"
                    />
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor={`company-${prospect.id}`} className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      Nom de l'Entreprise *
                    </Label>
                    <Input
                      id={`company-${prospect.id}`}
                      value={prospect.companyName}
                      onChange={(e) => updateProspect(prospect.id, 'companyName', e.target.value)}
                      placeholder="Entreprise SAS"
                      className="w-full"
                    />
                  </div>

                  {/* Company Website */}
                  <div className="space-y-2">
                    <Label htmlFor={`website-${prospect.id}`} className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-500" />
                      Site Web Entreprise
                    </Label>
                    <Input
                      id={`website-${prospect.id}`}
                      value={prospect.companyWebsite}
                      onChange={(e) => updateProspect(prospect.id, 'companyWebsite', e.target.value)}
                      placeholder="https://www.entreprise.com"
                      className="w-full"
                    />
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <Label htmlFor={`role-${prospect.id}`} className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-500" />
                      Rôle / Poste
                    </Label>
                    <Input
                      id={`role-${prospect.id}`}
                      value={prospect.role}
                      onChange={(e) => updateProspect(prospect.id, 'role', e.target.value)}
                      placeholder="Directeur Commercial"
                      className="w-full"
                    />
                  </div>

                  {/* LinkedIn URL */}
                  <div className="space-y-2">
                    <Label htmlFor={`linkedin-${prospect.id}`} className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-blue-600" />
                      Profil LinkedIn
                    </Label>
                    <Input
                      id={`linkedin-${prospect.id}`}
                      value={prospect.linkedinUrl}
                      onChange={(e) => updateProspect(prospect.id, 'linkedinUrl', e.target.value)}
                      placeholder="https://linkedin.com/in/profil"
                      className="w-full"
                    />
                  </div>

                  {/* Status Select */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {getStatusIcon(prospect.status)}
                      Statut
                    </Label>
                    <Select
                      value={prospect.status}
                      onValueChange={(value) => updateProspect(prospect.id, 'status', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="in-progress">En cours</SelectItem>
                        <SelectItem value="completed">Terminé</SelectItem>
                        <SelectItem value="failed">Échec</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Relevance Textarea - Full Width */}
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`relevance-${prospect.id}`} className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    Pertinence du Prospect par rapport à la Préparation de l'Appel
                  </Label>
                  <Textarea
                    id={`relevance-${prospect.id}`}
                    value={prospect.relevance}
                    onChange={(e) => updateProspect(prospect.id, 'relevance', e.target.value)}
                    placeholder="Décrivez la pertinence de ce prospect, ses besoins potentiels, opportunités identifiées..."
                    className="w-full min-h-[80px] resize-none"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="mt-8 border-0 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{prospects.length}</div>
                <div className="text-blue-100 text-sm">Prospects Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {prospects.filter(p => p.status === 'completed').length}
                </div>
                <div className="text-blue-100 text-sm">Analyses Terminées</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {prospects.filter(p => p.status === 'in-progress').length}
                </div>
                <div className="text-blue-100 text-sm">En Cours</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {prospects.filter(p => p.contactName && p.companyName).length}
                </div>
                <div className="text-blue-100 text-sm">Prospects Valides</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};