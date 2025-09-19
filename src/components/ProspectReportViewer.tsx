import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportLinkManager } from './ReportLinkManager';
import { DocumentLinkViewer } from './DocumentLinkViewer';
import { FileText, History } from 'lucide-react';

interface ProspectReportViewerProps {
  prospectId: string;
  prospectName: string;
  className?: string;
  showHeader?: boolean;
}

export const ProspectReportViewer: React.FC<ProspectReportViewerProps> = ({
  prospectId,
  prospectName,
  className = "",
  showHeader = true
}) => {
  // Exemple de rapport existant à afficher
  const sampleReportUrl = "https://docs.google.com/document/d/1BcDefGhIjKlMnOpQrStUvWxYz/edit?usp=sharing";

  if (!showHeader) {
    return (
      <ReportLinkManager 
        prospectId={prospectId}
        className={className}
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Rapports - {prospectName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ReportLinkManager prospectId={prospectId} />
        
        {/* Exemple d'affichage direct d'un document */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Document de démonstration</h4>
          <DocumentLinkViewer
            url={sampleReportUrl}
            title="Exemple de rapport d'évaluation"
            description="Démonstration des fonctionnalités de visualisation et téléchargement"
          />
        </div>
      </CardContent>
    </Card>
  );
};