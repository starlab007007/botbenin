import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProspects } from '@/hooks/useProspects';
import { useProspectDatabases } from '@/hooks/useProspectDatabases';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface B2BContact {
  id: string;
  name: string;
  companyName: string;
  jobTitle: string;
  location: string;
  email: string;
  phone: string;
  industry: string;
  companySize: string;
  linkedinUrl?: string;
  coordinates?: [number, number];
}

interface SaveB2BProspectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: B2BContact[];
  onSuccess?: () => void;
}

export const SaveB2BProspectsModal: React.FC<SaveB2BProspectsModalProps> = ({ 
  isOpen, 
  onClose,
  contacts,
  onSuccess 
}) => {
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; skipped: number }>({ 
    success: 0, 
    failed: 0,
    skipped: 0 
  });
  const [showResults, setShowResults] = useState(false);
  
  const { toast } = useToast();
  const { createProspect } = useProspects({});
  const { databases } = useProspectDatabases();

  const handleSave = async () => {
    if (!selectedDatabaseId) {
      toast({
        title: "Base de données requise",
        description: "Veuillez sélectionner une base de données",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setShowResults(false);
    
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    try {
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        
        // Séparer le prénom et nom
        const nameParts = contact.name.trim().split(' ');
        const firstName = nameParts[0] || contact.name;
        const lastName = nameParts.slice(1).join(' ') || '';

        // Transformer les données B2B en format prospect
        const prospectData = {
          database_id: selectedDatabaseId,
          first_name: firstName,
          last_name: lastName,
          email: contact.email || '',
          phone: contact.phone || '',
          company: contact.companyName || '',
          position: contact.jobTitle || '',
          source: 'b2b_targeting',
          status: 'new',
          score: 50,
          notes: `Localisation: ${contact.location}\nSecteur: ${contact.industry}\nTaille: ${contact.companySize}`,
          tags: [contact.industry, 'b2b', contact.companySize].filter(Boolean),
          custom_fields: {
            linkedin_url: contact.linkedinUrl,
            coordinates: contact.coordinates,
            original_location: contact.location
          }
        };

        try {
          const result = await createProspect(prospectData);
          
          if (result) {
            successCount++;
          } else {
            // createProspect retourne null si le prospect existe déjà
            skippedCount++;
          }
        } catch (error: any) {
          console.error('Erreur création prospect:', error);
          
          // Si c'est un doublon, on le compte comme skipped au lieu de failed
          if (error?.message?.includes('duplicate') || error?.message?.includes('déjà existant')) {
            skippedCount++;
          } else {
            failedCount++;
          }
        }

        // Mise à jour de la progression
        setProgress(((i + 1) / contacts.length) * 100);
        
        // Petit délai pour éviter de surcharger la base
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setResults({ success: successCount, failed: failedCount, skipped: skippedCount });
      setShowResults(true);

      if (successCount > 0) {
        toast({
          title: "Enregistrement terminé",
          description: `${successCount} prospect(s) ajouté(s) avec succès${skippedCount > 0 ? `, ${skippedCount} doublons ignorés` : ''}`,
        });

        if (onSuccess) {
          onSuccess();
        }
      } else if (skippedCount > 0) {
        toast({
          title: "Aucun nouveau prospect",
          description: "Tous les contacts sont déjà dans votre base de données",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Échec de l'enregistrement",
          description: "Aucun prospect n'a pu être ajouté",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Erreur lors de l\'enregistrement batch:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setShowResults(false);
      setResults({ success: 0, failed: 0, skipped: 0 });
      setProgress(0);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Enregistrer les prospects B2B
          </DialogTitle>
          <DialogDescription>
            {showResults 
              ? "Résultats de l'enregistrement"
              : `Sélectionnez la base de données où enregistrer ${contacts.length} contact(s)`
            }
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="database">Base de données de destination *</Label>
              <Select 
                value={selectedDatabaseId} 
                onValueChange={setSelectedDatabaseId}
                disabled={isProcessing}
              >
                <SelectTrigger id="database">
                  <SelectValue placeholder="Sélectionner une base" />
                </SelectTrigger>
                <SelectContent>
                  {databases.map((db) => (
                    <SelectItem key={db.id} value={db.id}>
                      {db.name} ({db.prospect_count || 0} prospects)
                    </SelectItem>
                  ))}
                  {databases.length === 0 && (
                    <SelectItem value="none" disabled>
                      Aucune base de données disponible
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg space-y-2">
              <p className="text-sm font-medium text-blue-900">
                📊 {contacts.length} contact(s) à enregistrer
              </p>
              <p className="text-xs text-blue-700">
                Les doublons seront automatiquement détectés et ignorés
              </p>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progression</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-gray-500">
                  Enregistrement en cours, veuillez patienter...
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{results.success}</p>
                <p className="text-xs text-green-600">Ajoutés</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <AlertCircle className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-700">{results.skipped}</p>
                <p className="text-xs text-orange-600">Doublons</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">{results.failed}</p>
                <p className="text-xs text-red-600">Erreurs</p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 text-center">
                {results.success > 0 && `✅ ${results.success} prospect(s) enregistré(s) avec succès`}
                {results.success === 0 && results.skipped > 0 && "ℹ️ Tous les contacts sont déjà dans votre base"}
                {results.success === 0 && results.skipped === 0 && "❌ Aucun prospect n'a pu être ajouté"}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!showResults ? (
            <>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isProcessing}
              >
                Annuler
              </Button>
              <Button 
                type="button" 
                onClick={handleSave}
                disabled={isProcessing || !selectedDatabaseId || databases.length === 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Enregistrer {contacts.length} contact(s)
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Fermer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
