import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AuthModal } from '@/components/AuthModal';
import { GoogleSheetEditor } from '@/components/GoogleSheetEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { 
  FileText, 
  Users, 
  Plus,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';

export const IAProspectPreCallPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateFirst, setShowCreateFirst] = useState(false);
  
  // Configuration par défaut pour Google Sheets
  const DEFAULT_SPREADSHEET_ID = "14EJzlOtGp3aGQciNLgqafi-yjz6Rc83bGXahWE5OIZ8";
  const DEFAULT_SHEET_NAME = "Feuille 1";
  
  const { data: googleSheetsData, isLoading, loadData } = useGoogleSheets(
    { spreadsheetId: DEFAULT_SPREADSHEET_ID, sheetName: DEFAULT_SHEET_NAME }, 
    user?.id
  );
  
  // Rafraîchissement automatique à l'ouverture de la page
  useEffect(() => {
    if (isAuthenticated && user?.id && loadData) {
      console.log('🔄 Rafraîchissement automatique des données à l\'ouverture');
      loadData(false); // Chargement silencieux (pas de notification)
    }
  }, [isAuthenticated, user?.id, loadData]);
  
  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else if (isAuthenticated && googleSheetsData !== undefined && Array.isArray(googleSheetsData) && googleSheetsData.length === 0) {
      // Afficher l'écran "créer premier prospect" seulement si pas encore déclenché
      setShowCreateFirst(true);
    } else if (isAuthenticated && googleSheetsData !== undefined && Array.isArray(googleSheetsData) && googleSheetsData.length > 0) {
      setShowCreateFirst(false);
    }
  }, [isAuthenticated, googleSheetsData]);

  const handleCreateFirstProspect = async () => {
    if (loadData) {
      console.log('🔄 Forcer actualisation Google Sheets au clic du bouton');
      await loadData(true); // Force avec notification
    }
    setShowCreateFirst(false);
  };
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-3 shadow-lg w-16 h-16 mx-auto mb-6">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Connexion requise
              </h2>
              <p className="text-gray-600 mb-6">
                Veuillez vous connecter pour accéder à vos prospects et utiliser l'IA de préparation d'appel.
              </p>
              <AuthModal 
                isOpen={showAuthModal} 
                onClose={() => setShowAuthModal(false)} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showCreateFirst && googleSheetsData !== undefined && Array.isArray(googleSheetsData) && googleSheetsData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-3 shadow-lg w-16 h-16 mx-auto mb-6">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Créez votre premier prospect
              </h2>
              <p className="text-gray-600 mb-6">
                Commencez par ajouter votre premier prospect pour utiliser l'IA de préparation d'appel et toutes les fonctionnalités avancées.
              </p>
              <Button 
                size="lg" 
                onClick={handleCreateFirstProspect}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer mon premier prospect
              </Button>
              <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500">
                <Badge variant="outline" className="border-blue-200 text-blue-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Gratuit
                </Badge>
                <Badge variant="outline" className="border-green-200 text-green-600">
                  <Clock className="w-3 h-3 mr-1" />
                  Configuration rapide
                </Badge>
                <Badge variant="outline" className="border-purple-200 text-purple-600">
                  <Target className="w-3 h-3 mr-1" />
                  IA incluse
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-3 shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Google Sheet - Préparation d'Appel IA
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Gérez vos prospects et préparez vos appels avec l'intelligence artificielle
          </p>
        </div>

        {/* Google Sheets Editor */}
        <GoogleSheetEditor 
          spreadsheetId={DEFAULT_SPREADSHEET_ID}
          sheetName={DEFAULT_SHEET_NAME}
        />
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};