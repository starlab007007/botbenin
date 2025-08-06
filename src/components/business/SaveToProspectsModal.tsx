
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Database, Users, Plus } from 'lucide-react';
import { CreateDatabaseModal } from '../prospects/CreateDatabaseModal';
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

interface ProspectDatabase {
  id: string;
  name: string;
  description?: string;
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();
  const { databases, isLoading, fetchDatabases } = useProspectDatabases();

  React.useEffect(() => {
    if (isOpen) {
      fetchDatabases();
    }
  }, [isOpen, fetchDatabases]);

  const handleCreateDatabase = () => {
    setShowCreateModal(true);
  };

  const handleDatabaseCreated = () => {
    setShowCreateModal(false);
    fetchDatabases(); // Rafraîchir la liste
  };

  const saveBusinessesToDatabase = async () => {
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
      console.log('🚀 Début sauvegarde des entreprises');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      
      if (!user) {
        throw new Error("Vous devez être connecté pour sauvegarder des entreprises");
      }

      console.log('👤 Utilisateur connecté:', user.id);
      console.log('📊 Entreprises à sauvegarder:', selectedBusinesses.length);
      console.log('🗄️ Base de destination:', selectedDatabaseId);

      // Vérifier que la base de données existe et appartient à l'utilisateur
      const { data: dbCheck, error: dbError } = await supabase
        .from('prospect_databases')
        .select('id, name')
        .eq('id', selectedDatabaseId)
        .eq('user_id', user.id)
        .single();

      if (dbError || !dbCheck) {
        throw new Error("Base de données non trouvée ou accès refusé");
      }

      console.log('✅ Base de données vérifiée:', dbCheck.name);

      // Préparer les données d'entreprises
      const businessesToSave = selectedBusinesses.map(business => ({
        user_id: user.id,
        search_session_id: searchSessionId,
        name: business.name,
        company_name: business.companyName,
        category: business.category,
        address: business.address,
        phone: business.phone,
        website: business.website,
        email: business.email,
        rating: business.rating,
        review_count: business.reviewCount,
        hours: business.hours,
        price_range: business.priceRange,
        distance: business.distance,
        coordinates: business.coordinates ? { lat: business.coordinates[1], lng: business.coordinates[0] } : null,
        job_title: business.jobTitle,
        linkedin_url: business.linkedinUrl,
        industry: business.industry,
        company_size: business.companySize
      }));

      console.log('💾 Sauvegarde dans local_businesses...');
      const { data: savedBusinesses, error: saveError } = await supabase
        .from('local_businesses')
        .insert(businessesToSave)
        .select('id');

      if (saveError) {
        console.error('❌ Erreur sauvegarde local_businesses:', saveError);
        throw saveError;
      }

      console.log('✅ Entreprises sauvegardées:', savedBusinesses?.length);

      // Transférer vers prospects en utilisant la fonction RPC
      const businessIds = savedBusinesses?.map(b => b.id) || [];
      console.log('🔄 Transfert vers prospects...');
      
      const { data: transferResult, error: transferError } = await supabase
        .rpc('transfer_local_businesses_to_prospects', {
          business_ids: businessIds,
          target_database_id: selectedDatabaseId
        });

      if (transferError) {
        console.error('❌ Erreur transfert:', transferError);
        throw transferError;
      }

      console.log('✅ Transfert terminé:', transferResult, 'prospects créés');

      toast({
        title: "Succès",
        description: `${transferResult || selectedBusinesses.length} entreprises ajoutées à la base "${dbCheck.name}"`,
      });

      onClose();
    } catch (error: any) {
      console.error('💥 Erreur sauvegarde:', error);
      
      let errorMessage = "Impossible de sauvegarder les entreprises";
      if (error?.code === 'PGRST301') {
        errorMessage = "Problème de permissions. Veuillez vous reconnecter.";
      } else if (error?.message?.includes('duplicate key')) {
        errorMessage = "Certaines entreprises existent déjà dans cette base";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
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
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="database">Base de données de destination</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCreateDatabase}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nouvelle base
              </Button>
            </div>
            {isLoading ? (
              <div className="flex items-center space-x-2 p-2 border rounded">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Chargement des bases...</span>
              </div>
            ) : databases.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-sm text-gray-500 mb-2">Aucune base de données trouvée</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreateDatabase}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Créer votre première base
                </Button>
              </div>
            ) : (
              <Select value={selectedDatabaseId} onValueChange={setSelectedDatabaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une base de données" />
                </SelectTrigger>
                <SelectContent>
                  {databases.filter(db => db.is_active).map((db) => (
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
            <Button onClick={saveBusinessesToDatabase} disabled={isSaving || !selectedDatabaseId}>
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
      
      <CreateDatabaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleDatabaseCreated}
      />
    </Dialog>
  );
};
