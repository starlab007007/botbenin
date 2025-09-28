import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Building, 
  User, 
  Phone,
  Mail,
  Globe,
  Linkedin,
  ExternalLink,
  Eye,
  Download,
  FileText,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';

export const EvaluationResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  const spreadsheetId = searchParams.get('spreadsheetId') || '';
  const sheetName = searchParams.get('sheetName') || '';
  const prospectId = searchParams.get('prospectId') || '';

  const {
    data: prospects,
    isLoading,
    error
  } = useGoogleSheets({ spreadsheetId, sheetName }, user?.id);

  const prospect = prospects?.find(p => p.id === prospectId);

  const handleViewDocument = async (docUrl: string) => {
    setIsLoadingDocument(true);
    setSelectedDocument(docUrl);
    
    try {
      // Extract document ID from Google Docs URL
      const docIdMatch = docUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (docIdMatch) {
        const docId = docIdMatch[1];
        // Convert to export URL for plain text
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        
        const response = await fetch(exportUrl);
        if (response.ok) {
          const content = await response.text();
          setDocumentContent(content);
        } else {
          setDocumentContent('Impossible de charger le contenu du document. Vous pouvez l\'ouvrir directement via le lien.');
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du document:', error);
      setDocumentContent('Erreur lors du chargement du document. Vous pouvez l\'ouvrir directement via le lien.');
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const openGoogleDoc = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadDocument = (url: string) => {
    const docIdMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (docIdMatch) {
      const docId = docIdMatch[1];
      const downloadUrl = `https://docs.google.com/document/d/${docId}/export?format=pdf`;
      window.open(downloadUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-lg">Chargement des résultats...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg border-red-200">
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Erreur de chargement
              </h3>
              <p className="text-red-600 mb-4">
                {error || 'Prospect non trouvé'}
              </p>
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const relevanceScore = parseInt(prospect['Pertinence du prospect par rapport à notre offre ? (sur 100)'] || '0');
  const preparationUrl = prospect['Préparation de l\'appel'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate(-1)}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-white/70"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <div>
                  <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Résultats d'évaluation
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Analyse détaillée du prospect
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Prospect Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Informations du contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {prospect.contact_name || prospect['Nom du contact'] || 'Non défini'}
                </h3>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building className="w-4 h-4" />
                  <span>{prospect.company_name || prospect['Nom de l\'entreprise'] || 'Non définie'}</span>
                </div>
                {prospect['Rôle'] && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="w-4 h-4" />
                    <span>{prospect['Rôle']}</span>
                  </div>
                )}
                {prospect.email && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${prospect.email}`} className="hover:text-blue-600 transition-colors">
                      {prospect.email}
                    </a>
                  </div>
                )}
                {prospect.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${prospect.phone}`} className="hover:text-blue-600 transition-colors">
                      {prospect.phone}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Links */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-green-600" />
                Liens externes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prospect.company_website && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Site web</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(prospect.company_website, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Visiter
                  </Button>
                </div>
              )}
              
              {prospect.linkedin_contact_url && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Profil LinkedIn</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(prospect.linkedin_contact_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Voir profil
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Relevance Score */}
        {relevanceScore > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-purple-600">📊</span>
                Pertinence du prospect
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Score de pertinence</span>
                  <span className="text-lg font-bold text-purple-600">{relevanceScore}%</span>
                </div>
                <Progress value={relevanceScore} className="h-3" />
                
                {prospect.explanation && (
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">Justification du score</h4>
                    <p className="text-sm text-purple-700 leading-relaxed">
                      {prospect.explanation}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call Preparation */}
        {preparationUrl && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Préparation de l'appel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="mb-3">
                  <p className="text-sm text-green-700 mb-2">Document Google Docs généré :</p>
                  <p className="text-xs text-green-600 font-mono bg-white p-2 rounded border break-all">
                    {preparationUrl}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDocument(preparationUrl)}
                        className="bg-white hover:bg-green-50 border-green-200"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir le contenu complet
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Contenu du document de préparation</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[60vh] w-full">
                        {isLoadingDocument ? (
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            Chargement du document...
                          </div>
                        ) : (
                          <div className="p-4">
                            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                              {documentContent || 'Contenu non disponible'}
                            </pre>
                          </div>
                        )}
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openGoogleDoc(preparationUrl)}
                    className="bg-white hover:bg-green-50 border-green-200"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Ouvrir dans Google Docs
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadDocument(preparationUrl)}
                    className="bg-white hover:bg-green-50 border-green-200"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Télécharger PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};