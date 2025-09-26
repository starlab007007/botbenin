import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { GoogleSheetEditor } from '@/components/GoogleSheetEditor';
import { GoogleSheetsDiagnostic } from '@/components/GoogleSheetsDiagnostic';
import { GoogleSheetsColumnDiagnostic } from '@/components/GoogleSheetsColumnDiagnostic';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft,
  Settings,
  FileText,
  Link,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProspectPreparationPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // Configuration Google Sheets - utilise le sheet fourni par l'utilisateur
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState({
    spreadsheetId: '14EJzlOtGp3aGQciNLgqafi-yjz6Rc83bGXahWE5OIZ8', // Nouveau Google Sheet fourni
    sheetName: 'Feuille 1'
  });
  const [showConfig, setShowConfig] = useState(false);

  // Redirection si non authentifié - APRÈS tous les hooks
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

  const openGoogleSheet = () => {
    const url = `https://docs.google.com/spreadsheets/d/${googleSheetsConfig.spreadsheetId}/edit`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <Button
              variant="ghost"
              onClick={() => navigate('/ia-prospect-precall')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Google Sheet - Préparation d'Appel IA
              </h1>
              <p className="text-gray-600 mt-1">
                Interface directement synchronisée avec votre Google Sheet
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowConfig(!showConfig)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configuration</span>
            </Button>
            <Button
              onClick={openGoogleSheet}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Ouvrir Google Sheet</span>
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

        {/* Diagnostic complet colonnes et synchronisation */}
        <GoogleSheetsColumnDiagnostic 
          spreadsheetId={googleSheetsConfig.spreadsheetId}
          sheetName={googleSheetsConfig.sheetName}
        />
        
        {/* Interface principale */}
        <GoogleSheetEditor
          spreadsheetId={googleSheetsConfig.spreadsheetId}
          sheetName={googleSheetsConfig.sheetName}
        />

        {/* Instructions d'utilisation */}
        <Card className="border-0 shadow-sm bg-yellow-50/50 mt-6">
          <CardContent className="p-4">
            <div className="text-sm text-yellow-800">
              <h3 className="font-semibold mb-2">💡 Instructions d'utilisation :</h3>
              <ul className="space-y-1 text-yellow-700">
                <li>• Modifiez directement les cellules dans le tableau ci-dessus</li>
                <li>• Cliquez sur "Sauvegarder" pour synchroniser vos modifications vers Google Sheets</li>
                <li>• Utilisez "Actualiser" pour récupérer les dernières données de Google Sheets</li>
                <li>• Ajoutez de nouvelles lignes avec le bouton "Ajouter"</li>
                <li>• Les changements non sauvegardés sont marqués en rouge</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};