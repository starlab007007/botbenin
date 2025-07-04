
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Database, Users, Plus } from 'lucide-react';
import { useProspectDatabases } from '@/hooks/useProspectDatabases';

interface LocalBusiness {
  id: string;
  name: string;
  companyName: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  email: string;
  rating: number;
  reviewCount: number;
  hours: string;
  priceRange: string;
  distance: string;
  coordinates?: [number, number];
  jobTitle: string;
  linkedinUrl: string;
  industry: string;
  companySize: string;
}

interface SaveToProspectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBusinesses: LocalBusiness[];
  searchSessionId: string;
}

export const SaveToProspectsModal: React.FC<SaveToProspectsModalProps> = ({
  isOpen,
  onClose,
  selectedBusinesses,
  searchSessionId
}) => {
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateDatabase, setShowCreateDatabase] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [newDatabaseDescription, setNewDatabaseDescription] = useState('');
  const [isCreatingDatabase, setIsCreatingDatabase] = useState(false);
  const { toast } = useToast();
  const { databases, isLoading, createDatabase, fetchDatabases } = useProspectDatabases();

  const handleCreateDatabase = async () => {
    if (!newDatabaseName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez saisir un nom pour la base de données",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingDatabase(true);
    try {
      const newDatabase = await createDatabase(newDatabaseName, newDatabaseDescription);
      setSelectedDatabaseId(newDatabase.id);
      setShowCreateDatabase(false);
      setNewDatabaseName('');
      setNewDatabaseDescription('');
    } catch (error) {
      // Error handled in createDatabase
    } finally {
      setIsCreatingDatabase(false);
    }
  };

  const saveProspectsToDatabase = async () => {
    if (!selectedDatabaseId) {
      toast({
        title: "Base de données requise",
        description: "Veuillez sélectionner une base de données",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const prospectsToSave = selectedBusinesses.map(business => ({
        database_id: selectedDatabaseId,
        first_name: business.name.split(' ')[0] || '',
        last_name: business.name.split(' ').slice(1).join(' ') || '',
        email: business.email,
        phone: business.phone,
        company: business.companyName,
        position: business.jobTitle,
        source: 'local_search',
        status: 'new',
        notes: `Catégorie: ${business.category}\nAdresse: ${business.address}\nNote: ${business.rating}/5 (${business.reviewCount} avis)\nSite web: ${business.website}`,
        custom_fields: {
          rating: business.rating,
          review_count: business.reviewCount,
          hours: business.hours,
          price_range: business.priceRange,
          distance: business.distance,
          coordinates: business.coordinates,
          linkedin_url: business.linkedinUrl,
          industry: business.industry,
          company_size: business.companySize,
          website: business.website
        },
        tags: [business.category, 'local_business']
      }));

      const { error } = await supabase
        .from('prospects')
        .insert(prospectsToSave);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${selectedBusinesses.length} prospects ajoutés à la base de données`,
      });

      onClose();
    } catch (error) {
      console.error('Error saving prospects:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les prospects",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Sauvegarder dans les Prospects
          </DialogTitle>
          <DialogDescription>
            Ajoutez {selectedBusinesses.length} entreprise(s) à votre base de prospects
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showCreateDatabase ? (
            <>
              <div>
                <Label htmlFor="database">Base de données de destination</Label>
                {isLoading ? (
                  <div className="flex items-center space-x-2 p-2 border rounded">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Chargement des bases...</span>
                  </div>
                ) : (
                  <Select value={selectedDatabaseId} onValueChange={setSelectedDatabaseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une base de données" />
                    </SelectTrigger>
                    <SelectContent>
                      {databases.map((db) => (
                        <SelectItem key={db.id} value={db.id}>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            {db.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => setShowCreateDatabase(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer une nouvelle base de données
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="newDbName">Nom de la base de données *</Label>
                <Input
                  id="newDbName"
                  value={newDatabaseName}
                  onChange={(e) => setNewDatabaseName(e.target.value)}
                  placeholder="Ex: Prospects Locaux 2025"
                />
              </div>
              <div>
                <Label htmlFor="newDbDescription">Description (optionnel)</Label>
                <Input
                  id="newDbDescription"
                  value={newDatabaseDescription}
                  onChange={(e) => setNewDatabaseDescription(e.target.value)}
                  placeholder="Description de la base de données"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleCreateDatabase}
                  disabled={isCreatingDatabase}
                  className="flex-1"
                >
                  {isCreatingDatabase ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDatabase(false)}
                  disabled={isCreatingDatabase}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Entreprises sélectionnées:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedBusinesses.map((business, index) => (
                <div key={index} className="text-xs text-gray-600">
                  • {business.companyName} ({business.name})
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Annuler
            </Button>
            <Button 
              onClick={saveProspectsToDatabase} 
              disabled={isSaving || !selectedDatabaseId || showCreateDatabase}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
