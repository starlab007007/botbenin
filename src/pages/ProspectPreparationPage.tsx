import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { GoogleSheetEditor } from '@/components/GoogleSheetEditor';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft,
  Settings,
  FileText,
  Link,
  ExternalLink,
  Shield,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProspectPreparationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Configuration Google Sheets - utilise un sheet unique par utilisateur
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState({
    spreadsheetId: '14EJzlOtGp3aGQciNLgqafi-yjz6Rc83bGXahWE5OIZ8', // Google Sheet partagé
    sheetName: user?.id ? `Prospects_${user.id.slice(0, 8)}` : 'Feuille 1' // Feuille unique par utilisateur
  });
  const [showConfig, setShowConfig] = useState(false);

  // Rediriger si pas connecté
  if (!user) {
    navigate('/auth');
    return null;
  }

  const openGoogleSheet = () => {
    const url = `https://docs.google.com/spreadsheets/d/${googleSheetsConfig.spreadsheetId}/edit`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 lg:mb-8">
          <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-0 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={() => navigate('/ia-prospect-precall')}
              className="p-2 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                Google Sheet - Préparation d'Appel IA
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-600">
                  Vos prospects privés - {user.email}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <Button
              onClick={() => setShowConfig(!showConfig)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 flex-1 sm:flex-none"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configuration</span>
            </Button>
            <Button
              onClick={openGoogleSheet}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 flex-1 sm:flex-none"
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
                    className="w-full font-mono text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sheet-name" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    Votre feuille personnelle
                  </Label>
                  <Input
                    id="sheet-name"
                    value={googleSheetsConfig.sheetName}
                    onChange={(e) => setGoogleSheetsConfig(prev => ({ ...prev, sheetName: e.target.value }))}
                    placeholder={`Prospects_${user.id.slice(0, 8)}`}
                    className="w-full"
                    readOnly
                  />
                  <p className="text-xs text-gray-500">
                    Feuille automatiquement assignée à votre compte
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Google Sheet Editor - Interface principale */}
        <GoogleSheetEditor
          spreadsheetId={googleSheetsConfig.spreadsheetId}
          sheetName={googleSheetsConfig.sheetName}
        />

        {/* Instructions d'utilisation */}
        <Card className="border-0 shadow-sm bg-yellow-50/50 mt-6">
          <CardContent className="p-3 sm:p-4">
            <div className="text-sm text-yellow-800">
              <h3 className="font-semibold mb-2">💡 Instructions d'utilisation :</h3>
              <ul className="space-y-1 text-yellow-700 text-xs sm:text-sm">
                <li>• Modifiez directement les cellules dans le tableau ci-dessus</li>
                <li>• Cliquez sur "Sauvegarder" pour synchroniser vos modifications vers Google Sheets</li>
                <li>• Utilisez "Actualiser" pour récupérer les dernières données de Google Sheets</li>
                <li>• Ajoutez de nouvelles lignes avec le bouton "Ajouter"</li>
                <li>• Cliquez sur "Analyser" pour évaluer un prospect en détail</li>
                <li>• Vos données sont privées et isolées par utilisateur</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};