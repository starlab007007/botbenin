
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Users, Plus } from 'lucide-react';
import { useProspectDatabases } from '@/hooks/useProspectDatabases';
import { CreateDatabaseModal } from '@/components/prospects/CreateDatabaseModal';

interface SelectedBusiness {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
}

interface SaveToProspectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBusinesses: SelectedBusiness[];
  searchSessionId: string;
  onTransfer?: (databaseId: string) => Promise<void>;
}

export const SaveToProspectsModal: React.FC<SaveToProspectsModalProps> = ({
  isOpen,
  onClose,
  selectedBusinesses,
  searchSessionId,
  onTransfer
}) => {
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isCreateDatabaseOpen, setIsCreateDatabaseOpen] = useState(false);
  
  const { databases, fetchDatabases } = useProspectDatabases();

  const handleTransfer = async () => {
    if (!selectedDatabaseId || !onTransfer) return;
    
    setIsTransferring(true);
    try {
      await onTransfer(selectedDatabaseId);
      onClose();
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDatabaseCreated = () => {
    fetchDatabases();
    setIsCreateDatabaseOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Sauvegarder dans les Prospects
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Sélection des entreprises */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Entreprises sélectionnées
                  <Badge className="ml-2">{selectedBusinesses.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedBusinesses.map((business) => (
                    <div key={business.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{business.name}</div>
                        <div className="text-sm text-gray-600">{business.companyName}</div>
                        <div className="text-xs text-gray-500">
                          {business.email} • {business.phone}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sélection de la base de données */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Base de données de destination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Select value={selectedDatabaseId} onValueChange={setSelectedDatabaseId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choisir une base de données..." />
                    </SelectTrigger>
                    <SelectContent>
                      {databases.map((db) => (
                        <SelectItem key={db.id} value={db.id}>
                          <div className="flex items-center">
                            <Database className="w-4 h-4 mr-2" />
                            <div>
                              <div className="font-medium">{db.name}</div>
                              {db.description && (
                                <div className="text-xs text-gray-500">{db.description}</div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDatabaseOpen(true)}
                    className="flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle
                  </Button>
                </div>

                {databases.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune base de données trouvée</p>
                    <p className="text-sm">Créez votre première base de données</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informations sur le transfert */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Database className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">Que va-t-il se passer ?</p>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Les entreprises seront ajoutées comme nouveaux prospects</li>
                      <li>• Les informations complètes seront préservées</li>
                      <li>• Le statut sera défini sur "Nouveau"</li>
                      <li>• La source sera marquée comme "Recherche Locale"</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={!selectedDatabaseId || selectedBusinesses.length === 0 || isTransferring}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isTransferring ? (
                  'Transfert en cours...'
                ) : (
                  `Transférer ${selectedBusinesses.length} entreprise${selectedBusinesses.length > 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateDatabaseModal
        isOpen={isCreateDatabaseOpen}
        onClose={() => setIsCreateDatabaseOpen(false)}
        onDatabaseCreated={handleDatabaseCreated}
      />
    </>
  );
};
