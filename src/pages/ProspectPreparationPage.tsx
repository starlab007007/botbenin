import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { GoogleSheetEditor } from '@/components/GoogleSheetEditor';
import { ReportLinkManager } from '@/components/ReportLinkManager';
import { DocumentLinkViewer } from '@/components/DocumentLinkViewer';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  ArrowLeft,
  Settings,
  FileText,
  Link,
  ExternalLink,
  FolderOpen,
  Eye,
  ChevronDown,
  ChevronRight,
  User,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReportLink {
  id: string;
  url: string;
  title: string;
  description?: string;
  createdAt: Date;
  prospectName?: string;
  type: 'evaluation' | 'analysis' | 'other';
}

interface ProspectGroup {
  prospectName: string;
  reports: ReportLink[];
  isExpanded: boolean;
}

export const ProspectPreparationPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  
  // Configuration Google Sheets - utilise le sheet fourni par défaut
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState({
    spreadsheetId: '14EJzlOtGp3aGQciNLgqafi-yjz6Rc83bGXahWE5OIZ8', // Google Sheet fourni
    sheetName: 'Feuille 1'
  });
  const [showConfig, setShowConfig] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [prospectGroups, setProspectGroups] = useState<ProspectGroup[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  
  // Redirection si non authentifié - APRÈS les hooks
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentification requise</h2>
            <p className="text-gray-600 mb-4">Vous devez être connecté pour accéder à vos prospects.</p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Charger et organiser les rapports par prospect
  useEffect(() => {
    loadProspectReports();
  }, []);

  const loadProspectReports = () => {
    setIsLoadingReports(true);
    try {
      const savedReports = localStorage.getItem('prospect_reports');
      const allReports: ReportLink[] = savedReports ? JSON.parse(savedReports) : [];
      
      // Convertir les chaînes createdAt en objets Date
      const reportsWithDates = allReports.map(report => ({
        ...report,
        createdAt: new Date(report.createdAt)
      }));
      
      // Grouper par prospect
      const groupedReports = reportsWithDates.reduce((acc, report) => {
        const prospectName = report.prospectName || 'Prospect sans nom';
        if (!acc[prospectName]) {
          acc[prospectName] = [];
        }
        acc[prospectName].push(report);
        return acc;
      }, {} as Record<string, ReportLink[]>);
      
      // Convertir en tableau avec état d'expansion
      const groups: ProspectGroup[] = Object.entries(groupedReports).map(([name, reports]) => ({
        prospectName: name,
        reports: reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        isExpanded: false
      }));
      
      setProspectGroups(groups);
    } catch (error) {
      console.error('Erreur lors du chargement des rapports:', error);
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setIsLoadingReports(false);
    }
  };

  const toggleProspectExpansion = (prospectName: string) => {
    setProspectGroups(prev => 
      prev.map(group => 
        group.prospectName === prospectName
          ? { ...group, isExpanded: !group.isExpanded }
          : group
      )
    );
  };

  const openGoogleSheet = () => {
    const url = `https://docs.google.com/spreadsheets/d/${googleSheetsConfig.spreadsheetId}/edit`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-2 sm:p-4 lg:p-6 xl:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/ia-prospect-precall')}
              className="p-1 sm:p-2 shrink-0"
              size={isMobile ? "sm" : "default"}
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                Google Sheet - Préparation d'Appel IA
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1 line-clamp-2">
                Interface directement synchronisée avec votre Google Sheet
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowConfig(!showConfig)}
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className="flex items-center gap-1 sm:gap-2"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">
                {isMobile ? "Config" : "Configuration"}
              </span>
            </Button>
            <Button
              onClick={() => setShowDocumentViewer(true)}
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className="flex items-center gap-1 sm:gap-2"
            >
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Voir</span>
            </Button>
            <Button
              onClick={loadProspectReports}
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className="flex items-center gap-1 sm:gap-2"
              disabled={isLoadingReports}
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
              <span className="text-xs sm:text-sm">Actualiser</span>
            </Button>
          </div>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Configuration Google Sheets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spreadsheet-id" className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-gray-500" />
                    ID Google Sheet
                  </Label>
                  <Input
                    id="spreadsheet-id"
                    value={googleSheetsConfig.spreadsheetId}
                    onChange={(e) => setGoogleSheetsConfig(prev => ({ ...prev, spreadsheetId: e.target.value }))}
                    placeholder="14EJzlOtGp3aGQciNLgqafi-yjz6Rc83bGXahWE5OIZ8"
                    className="w-full font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sheet-name" className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Nom de la feuille
                  </Label>
                  <Input
                    id="sheet-name"
                    value={googleSheetsConfig.sheetName}
                    onChange={(e) => setGoogleSheetsConfig(prev => ({ ...prev, sheetName: e.target.value }))}
                    placeholder="Feuille 1"
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Mes Prospects */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              Mes Prospects ({prospectGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {isLoadingReports ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-500">Chargement des rapports...</span>
              </div>
            ) : prospectGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm sm:text-base">Aucun prospect trouvé</p>
                <p className="text-xs sm:text-sm mt-1 opacity-75">Les rapports d'évaluation apparaîtront ici une fois créés</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {prospectGroups.map((group) => (
                  <Card key={group.prospectName} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <Collapsible>
                      <CollapsibleTrigger
                        className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        onClick={() => toggleProspectExpansion(group.prospectName)}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                          <div className="min-w-0 flex-1 text-left">
                            <h3 className="font-medium text-sm sm:text-base text-gray-900 truncate">
                              {group.prospectName}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {group.reports.length} rapport{group.reports.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            {group.reports.length}
                          </Badge>
                          {group.isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="border-t bg-gray-50/50 p-3 sm:p-4">
                          <div className="grid grid-cols-1 gap-3 sm:gap-4">
                            {group.reports.map((report) => (
                              <Card key={report.id} className="bg-white border border-gray-200 hover:shadow-sm transition-all">
                                <CardContent className="p-3 sm:p-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                        <h4 className="font-medium text-sm sm:text-base text-gray-900 truncate">
                                          {report.title}
                                        </h4>
                                        <Badge 
                                          variant={report.type === 'evaluation' ? 'default' : 'secondary'} 
                                          className="text-xs shrink-0"
                                        >
                                          {report.type}
                                        </Badge>
                                      </div>
                                      {report.description && (
                                        <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                                          {report.description}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500">
                                        Créé le {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <Button
                                        variant="outline"
                                        size={isMobile ? "sm" : "default"}
                                        onClick={() => window.open(report.url, '_blank')}
                                        className="flex items-center gap-1 sm:gap-2"
                                      >
                                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="text-xs sm:text-sm">
                                          {isMobile ? "Voir" : "Visualiser"}
                                        </span>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size={isMobile ? "sm" : "default"}
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = report.url;
                                          link.download = `${report.title}.pdf`;
                                          link.click();
                                        }}
                                        className="flex items-center gap-1 sm:gap-2"
                                      >
                                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="text-xs sm:text-sm">
                                          {isMobile ? "DL" : "Télécharger"}
                                        </span>
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Sheet Editor - Interface principale */}
        <div className="mb-4 sm:mb-6">
          <GoogleSheetEditor
            spreadsheetId={googleSheetsConfig.spreadsheetId}
            sheetName={googleSheetsConfig.sheetName}
          />
        </div>

        {/* Instructions d'utilisation */}
        <Card className="border-0 shadow-sm bg-yellow-50/50">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-yellow-800">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                💡 Instructions d'utilisation
                {isMobile && <span className="text-yellow-600">(Tapez pour développer)</span>}
              </h3>
              <ul className="space-y-1 text-yellow-700 text-xs sm:text-sm">
                <li>• Modifiez directement les cellules dans le tableau ci-dessus</li>
                <li>• Cliquez sur "Sauvegarder" pour synchroniser vos modifications vers Google Sheets</li>
                <li>• Utilisez "Actualiser" pour récupérer les dernières données de Google Sheets</li>
                <li>• Ajoutez de nouvelles lignes avec le bouton "Ajouter"</li>
                <li>• Les changements non sauvegardés sont marqués en rouge</li>
                {isMobile && (
                  <>
                    <li>• Sur mobile, faites défiler horizontalement pour voir toutes les colonnes</li>
                    <li>• Utilisez le zoom de votre navigateur si nécessaire</li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Document Viewer Modal */}
        <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
          <DialogContent className={`
            ${isMobile 
              ? 'max-w-[95vw] max-h-[90vh] p-3' 
              : 'max-w-6xl max-h-[90vh] p-6'
            } 
            overflow-y-auto
          `}>
            <DialogHeader className={isMobile ? 'pb-3' : 'pb-4'}>
              <DialogTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                Préparation de l'appel - Google Sheet
              </DialogTitle>
            </DialogHeader>
            <div className={isMobile ? 'text-xs' : ''}>
              <DocumentLinkViewer
                url={`https://docs.google.com/spreadsheets/d/${googleSheetsConfig.spreadsheetId}/edit`}
                title="Préparation de l'appel - Google Sheet"
                description="Feuille de calcul pour la préparation d'appels avec vos prospects"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};