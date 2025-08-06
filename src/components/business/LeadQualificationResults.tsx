import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQualificationCampaigns } from '@/hooks/useQualificationCampaigns';
import { 
  ArrowLeft,
  Download,
  Eye,
  Search,
  BarChart3,
  Users,
  TrendingUp,
  Star,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface LeadQualificationResultsProps {
  onBack: () => void;
}

export const LeadQualificationResults: React.FC<LeadQualificationResultsProps> = ({ onBack }) => {
  const { results, exportResults: exportCampaignResults } = useQualificationCampaigns();
  const [filteredResults, setFilteredResults] = useState(results);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const { toast } = useToast();

  // Filtrer les résultats
  useEffect(() => {
    let filtered = results;

    if (searchTerm) {
      filtered = filtered.filter(result => 
        result.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(result => result.status === statusFilter);
    }

    if (channelFilter !== 'all') {
      filtered = filtered.filter(result => result.channel === channelFilter);
    }

    setFilteredResults(filtered);
  }, [searchTerm, statusFilter, channelFilter, results]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Complété</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Partiel</Badge>;
      case 'no-response':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Pas de réponse</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getChannelBadge = (channel: string) => {
    const configs = {
      whatsapp: { label: 'WhatsApp', className: 'bg-green-500 text-white' },
      sms: { label: 'SMS', className: 'bg-blue-500 text-white' },
      email: { label: 'Email', className: 'bg-purple-500 text-white' }
    };
    const config = configs[channel as keyof typeof configs] || { label: channel, className: 'bg-gray-500 text-white' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleExportResults = () => {
    exportCampaignResults();
  };

  const openDetailedView = (result: any) => {
    setSelectedResult(result);
  };

  const calculateStats = () => {
    const total = results.length;
    const completed = results.filter(r => r.status === 'completed').length;
    const avgScore = results.filter(r => r.score > 0).reduce((acc, r) => acc + r.score, 0) / results.filter(r => r.score > 0).length || 0;
    const responseRate = (completed / total) * 100;

    return { total, completed, avgScore, responseRate };
  };

  const stats = calculateStats();

  if (selectedResult) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => setSelectedResult(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux résultats
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Détail de la qualification - {selectedResult.contactName}</span>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedResult.status)}
                  {getChannelBadge(selectedResult.channel)}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informations contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informations Contact</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nom:</strong> {selectedResult.contactName}</p>
                    <p><strong>Entreprise:</strong> {selectedResult.companyName}</p>
                    <p><strong>Email:</strong> {selectedResult.email}</p>
                    <p><strong>Téléphone:</strong> {selectedResult.phone}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Détails Qualification</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Campagne:</strong> {selectedResult.campaignName}</p>
                    <p><strong>Bot utilisé:</strong> {selectedResult.botUsed}</p>
                    <p><strong>Score final:</strong> <span className="text-lg font-bold text-blue-600">{selectedResult.score}/10</span></p>
                    <p><strong>Date:</strong> {new Date(selectedResult.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </div>

              {/* Réponses */}
              <div>
                <h4 className="font-semibold mb-4">Réponses aux Questions de Qualification</h4>
                {selectedResult.responses && selectedResult.responses.length > 0 ? (
                  <div className="space-y-4">
                    {selectedResult.responses.map((response: any, index: number) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-2">
                          <p className="font-medium text-gray-900">{response.question}</p>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded">{response.answer}</p>
                          {response.score !== undefined && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium">Score: {response.score}/10</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Aucune réponse enregistrée</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au menu
          </Button>
          <Button onClick={handleExportResults} className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Exporter Excel</span>
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Résultats de Qualification</h1>
          <p className="text-gray-600">Consultez et analysez les résultats de vos campagnes de qualification</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Qualifications</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taux de Réponse</p>
                  <p className="text-2xl font-bold text-green-600">{stats.responseRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Score Moyen</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.avgScore.toFixed(1)}/10</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Complétées</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Rechercher par nom, entreprise ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="completed">Complété</SelectItem>
                  <SelectItem value="partial">Partiel</SelectItem>
                  <SelectItem value="no-response">Pas de réponse</SelectItem>
                </SelectContent>
              </Select>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les canaux</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des résultats */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campagne</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{result.contactName}</div>
                          <div className="text-sm text-gray-500">{result.companyName}</div>
                          <div className="text-xs text-gray-400">{result.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.campaignName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getChannelBadge(result.channel)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(result.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {result.score > 0 ? (
                            <span className={`${result.score >= 7 ? 'text-green-600' : result.score >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {result.score}/10
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(result.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailedView(result)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir détail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredResults.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucun résultat trouvé pour les critères sélectionnés
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};