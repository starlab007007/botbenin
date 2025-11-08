import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Zap } from 'lucide-react';

interface DocumentationHeaderProps {
  onExportPDF: () => void;
  isExporting: boolean;
}

export const DocumentationHeader: React.FC<DocumentationHeaderProps> = ({ 
  onExportPDF,
  isExporting 
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <FileText className="w-4 h-4" />
            <span>Documentation Professionnelle Complète</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            Guide Complet des <span className="text-primary">Fonctionnalités Bot.bj</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Découvrez en détail les 16 modules puissants qui transformeront votre business. 
            Guides pas-à-pas, workflows, cas d'usage et ROI détaillés.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-8">
            <div className="bg-card rounded-lg p-6 border shadow-sm">
              <div className="text-3xl font-bold text-primary">16</div>
              <div className="text-sm text-muted-foreground">Modules Détaillés</div>
            </div>
            <div className="bg-card rounded-lg p-6 border shadow-sm">
              <div className="text-3xl font-bold text-primary">150+</div>
              <div className="text-sm text-muted-foreground">Pages de Documentation</div>
            </div>
            <div className="bg-card rounded-lg p-6 border shadow-sm">
              <div className="text-3xl font-bold text-primary">98%</div>
              <div className="text-sm text-muted-foreground">Satisfaction Client</div>
            </div>
          </div>
          
          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button 
              size="lg" 
              onClick={onExportPDF}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Zap className="w-5 h-5 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Télécharger PDF Complet (200 pages)
                </>
              )}
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#modules">
                <FileText className="w-5 h-5 mr-2" />
                Explorer les Modules
              </a>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
    </div>
  );
};
