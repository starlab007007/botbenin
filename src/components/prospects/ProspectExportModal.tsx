import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, Table } from 'lucide-react';
import { useProspectExport } from '@/hooks/useProspectExport';

interface ProspectExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProspects?: string[];
  databaseId?: string;
}

export const ProspectExportModal: React.FC<ProspectExportModalProps> = ({ 
  isOpen, 
  onClose, 
  selectedProspects,
  databaseId 
}) => {
  const [format, setFormat] = useState<'csv' | 'excel'>('excel');
  const [includeFields, setIncludeFields] = useState({
    basic: true,
    contact: true,
    company: true,
    notes: false,
    tags: false,
    customFields: true,
    analytics: false
  });
  
  const { exportProspects, isExporting } = useProspectExport();

  const handleExport = async () => {
    const success = await exportProspects({
      format,
      includeFields,
      selectedProspects,
      databaseId
    });
    
    if (success) {
      onClose();
    }
  };

  const getExportDescription = () => {
    if (selectedProspects && selectedProspects.length > 0) {
      return `${selectedProspects.length} prospect(s) sélectionné(s)`;
    }
    if (databaseId) {
      return "Tous les prospects de la base sélectionnée";
    }
    return "Tous les prospects de toutes les bases";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Exporter les Prospects
          </DialogTitle>
          <DialogDescription>
            {getExportDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format d'export */}
          <div>
            <Label className="text-base font-medium">Format d'export</Label>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Card className={`cursor-pointer transition-all ${format === 'csv' ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-4 text-center" onClick={() => setFormat('csv')}>
                  <Table className="w-8 h-8 mx-auto mb-2" />
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-muted-foreground">Tableur compatible</div>
                </CardContent>
              </Card>
              
              <Card className={`cursor-pointer transition-all ${format === 'excel' ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-4 text-center" onClick={() => setFormat('excel')}>
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <div className="font-medium">Excel</div>
                  <div className="text-xs text-muted-foreground">XLSX avec colonnes formatées</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Champs à inclure */}
          <div>
            <Label className="text-base font-medium">Champs à inclure</Label>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="basic"
                    checked={includeFields.basic}
                    onCheckedChange={(checked) => 
                      setIncludeFields(prev => ({ ...prev, basic: checked as boolean }))
                    }
                  />
                  <Label htmlFor="basic">Informations de base</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="contact"
                    checked={includeFields.contact}
                    onCheckedChange={(checked) => 
                      setIncludeFields(prev => ({ ...prev, contact: checked as boolean }))
                    }
                  />
                  <Label htmlFor="contact">Coordonnées</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="company"
                    checked={includeFields.company}
                    onCheckedChange={(checked) => 
                      setIncludeFields(prev => ({ ...prev, company: checked as boolean }))
                    }
                  />
                  <Label htmlFor="company">Entreprise</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notes"
                    checked={includeFields.notes}
                    onCheckedChange={(checked) => 
                      setIncludeFields(prev => ({ ...prev, notes: checked as boolean }))
                    }
                  />
                  <Label htmlFor="notes">Notes</Label>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tags"
                    checked={includeFields.tags}
                    onCheckedChange={(checked) => 
                      setIncludeFields(prev => ({ ...prev, tags: checked as boolean }))
                    }
                  />
                  <Label htmlFor="tags">Tags</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="customFields"
                    checked={includeFields.customFields}
                    onCheckedChange={(checked) => 
                      setIncludeFields(prev => ({ ...prev, customFields: checked as boolean }))
                    }
                  />
                  <Label htmlFor="customFields">Champs personnalisés</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="analytics"
                    checked={includeFields.analytics}
                    onCheckedChange={(checked) => 
                      setIncludeFields(prev => ({ ...prev, analytics: checked as boolean }))
                    }
                  />
                  <Label htmlFor="analytics">Métriques</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="text-sm">
                <div className="font-medium mb-2">Aperçu de l'export:</div>
                <div className="text-muted-foreground">
                  • Format: {format.toUpperCase()}<br/>
                  • Prospects: {getExportDescription()}<br/>
                  • Champs inclus: {Object.values(includeFields).filter(Boolean).length} / {Object.keys(includeFields).length}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Export en cours...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};