import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSimpleProspectAdder } from '@/hooks/useSimpleProspectAdder';
import { 
  User, 
  Building, 
  Plus,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Phone,
  Zap
} from 'lucide-react';

interface IACallPreparationFormProps {
  spreadsheetId: string;
  sheetName: string;
}

export const IACallPreparationForm: React.FC<IACallPreparationFormProps> = ({
  spreadsheetId,
  sheetName
}) => {
  const { user } = useAuth();
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [recentAdditions, setRecentAdditions] = useState<Array<{
    id: string;
    contact_name: string;
    company_name: string;
    timestamp: Date;
  }>>([]);

  const {
    isAdding,
    lastAddTime,
    addProspect
  } = useSimpleProspectAdder(user?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation basique
    if (!contactName.trim() || !companyName.trim()) {
      toast.error('Veuillez remplir le nom du contact et le nom de l\'entreprise');
      return;
    }

    // Vérifier les doublons récents
    const isDuplicate = recentAdditions.some(
      addition => 
        addition.contact_name.toLowerCase() === contactName.toLowerCase() &&
        addition.company_name.toLowerCase() === companyName.toLowerCase()
    );

    if (isDuplicate) {
      toast.error('Ce prospect a déjà été ajouté récemment');
      return;
    }

    const success = await addProspect({
      spreadsheetId,
      sheetName,
      contact_name: contactName.trim(),
      company_name: companyName.trim()
    });

    if (success) {
      // Ajouter à la liste des ajouts récents
      const newAddition = {
        id: `recent_${Date.now()}`,
        contact_name: contactName.trim(),
        company_name: companyName.trim(),
        timestamp: new Date()
      };
      
      setRecentAdditions(prev => [newAddition, ...prev.slice(0, 4)]); // Garder seulement les 5 derniers
      
      // Réinitialiser le formulaire
      setContactName('');
      setCompanyName('');
      
      toast.success('Prospect ajouté avec succès pour la préparation d\'appel !');
    }
  };

  const getTimeSinceAdd = (timestamp: Date): string => {
    const diff = Date.now() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `Il y a ${hours}h`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Formulaire principal */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Phone className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Préparation d'Appel IA
          </CardTitle>
          <p className="text-muted-foreground">
            Ajoutez rapidement un prospect pour préparer votre appel avec l'IA
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom du contact */}
            <div className="space-y-2">
              <Label htmlFor="contact-name" className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4 text-blue-600" />
                Nom du contact
              </Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                disabled={isAdding}
                className="h-12 text-base"
                required
              />
            </div>

            {/* Nom de l'entreprise */}
            <div className="space-y-2">
              <Label htmlFor="company-name" className="flex items-center gap-2 text-sm font-medium">
                <Building className="w-4 h-4 text-purple-600" />
                Nom de l'entreprise
              </Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Acme Corporation"
                disabled={isAdding}
                className="h-12 text-base"
                required
              />
            </div>

            {/* Bouton d'ajout */}
            <Button
              type="submit"
              disabled={isAdding || !contactName.trim() || !companyName.trim()}
              className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Ajouter le prospect
                </>
              )}
            </Button>
          </form>

          {/* Statut */}
          {isAdding && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center text-blue-700">
                <Clock className="w-4 h-4 mr-2" />
                Synchronisation en cours avec Google Sheets...
              </div>
            </div>
          )}

          {lastAddTime && !isAdding && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-center text-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Dernier ajout: {getTimeSinceAdd(lastAddTime)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ajouts récents */}
      {recentAdditions.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Prospects ajoutés récemment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAdditions.map((addition, index) => (
                <div
                  key={addition.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      #{recentAdditions.length - index}
                    </Badge>
                    <div>
                      <div className="font-medium text-sm">{addition.contact_name}</div>
                      <div className="text-xs text-muted-foreground">{addition.company_name}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getTimeSinceAdd(addition.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-0 shadow-sm bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <h4 className="font-semibold mb-1">Mode préparation d'appel :</h4>
              <ul className="space-y-1 text-amber-700">
                <li>• Un seul prospect peut être ajouté à la fois</li>
                <li>• Les données sont synchronisées automatiquement avec Google Sheets</li>
                <li>• L'IA pourra analyser ce prospect pour préparer votre appel</li>
                <li>• Les doublons récents sont automatiquement détectés</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};