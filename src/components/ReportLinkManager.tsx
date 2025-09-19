import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentLinkViewer } from './DocumentLinkViewer';
import { toast } from 'sonner';
import { 
  FileText, 
  Trash2, 
  Plus, 
  RefreshCw,
  FolderOpen,
  History
} from 'lucide-react';

interface ReportLink {
  id: string;
  url: string;
  title: string;
  description?: string;
  createdAt: Date;
  prospectName?: string;
  type: 'evaluation' | 'analysis' | 'other';
}

interface ReportLinkManagerProps {
  prospectId?: string;
  className?: string;
}

export const ReportLinkManager: React.FC<ReportLinkManagerProps> = ({
  prospectId,
  className = ""
}) => {
  const [reports, setReports] = useState<ReportLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Simuler le chargement des rapports depuis le stockage local
  useEffect(() => {
    loadReports();
  }, [prospectId]);

  const loadReports = () => {
    setIsLoading(true);
    try {
      const savedReports = localStorage.getItem('prospect_reports');
      const allReports: ReportLink[] = savedReports ? JSON.parse(savedReports) : [];
      
      // Filtrer par prospect si spécifié
      const filteredReports = prospectId 
        ? allReports.filter(report => report.id.includes(prospectId))
        : allReports;
      
      setReports(filteredReports);
    } catch (error) {
      console.error('Erreur lors du chargement des rapports:', error);
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setIsLoading(false);
    }
  };

  const saveReports = (updatedReports: ReportLink[]) => {
    try {
      const savedReports = localStorage.getItem('prospect_reports');
      const allReports: ReportLink[] = savedReports ? JSON.parse(savedReports) : [];
      
      // Fusionner avec les rapports existants
      const mergedReports = [...allReports];
      updatedReports.forEach(newReport => {
        const existingIndex = mergedReports.findIndex(r => r.id === newReport.id);
        if (existingIndex >= 0) {
          mergedReports[existingIndex] = newReport;
        } else {
          mergedReports.push(newReport);
        }
      });
      
      localStorage.setItem('prospect_reports', JSON.stringify(mergedReports));
      setReports(prospectId 
        ? mergedReports.filter(report => report.id.includes(prospectId))
        : mergedReports
      );
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const addReport = (url: string, title: string, description?: string, type: 'evaluation' | 'analysis' | 'other' = 'evaluation') => {
    const newReport: ReportLink = {
      id: `${prospectId || 'global'}_${Date.now()}`,
      url,
      title,
      description,
      createdAt: new Date(),
      type
    };
    
    saveReports([...reports, newReport]);
    toast.success('Rapport ajouté avec succès');
  };

  const removeReport = (reportId: string) => {
    const updatedReports = reports.filter(report => report.id !== reportId);
    saveReports(updatedReports);
    toast.success('Rapport supprimé');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'evaluation':
        return 'bg-blue-100 text-blue-800';
      case 'analysis':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'evaluation':
        return <FileText className="w-3 h-3" />;
      case 'analysis':
        return <FileText className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  if (reports.length === 0 && !isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">Aucun rapport disponible</p>
          <p className="text-sm text-gray-400 mt-1">
            Les rapports d'évaluation apparaîtront automatiquement ici
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Rapports et Documents
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadReports}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reports.map(report => (
          <div key={report.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${getTypeColor(report.type)}`}>
                  {getTypeIcon(report.type)}
                  <span className="ml-1">
                    {report.type === 'evaluation' ? 'Évaluation' : 
                     report.type === 'analysis' ? 'Analyse' : 'Document'}
                  </span>
                </Badge>
                <span className="text-xs text-gray-500">
                  {report.createdAt.toLocaleDateString('fr-FR')}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeReport(report.id)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 h-6 w-6 p-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            
            <DocumentLinkViewer
              url={report.url}
              title={report.title}
              description={report.description}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// Hook utilitaire pour ajouter des rapports
export const useReportManager = () => {
  const addReport = (
    url: string, 
    title: string, 
    prospectId?: string, 
    description?: string, 
    type: 'evaluation' | 'analysis' | 'other' = 'evaluation'
  ) => {
    try {
      const savedReports = localStorage.getItem('prospect_reports');
      const allReports: ReportLink[] = savedReports ? JSON.parse(savedReports) : [];
      
      const newReport: ReportLink = {
        id: `${prospectId || 'global'}_${Date.now()}`,
        url,
        title,
        description,
        createdAt: new Date(),
        type
      };
      
      allReports.push(newReport);
      localStorage.setItem('prospect_reports', JSON.stringify(allReports));
      
      toast.success('Rapport enregistré avec succès');
      return newReport;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du rapport:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return null;
    }
  };

  return { addReport };
};