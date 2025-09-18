import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Building, 
  Globe, 
  Linkedin, 
  Phone, 
  Mail,
  Star,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface ProspectData {
  id: string;
  user_id?: string;
  contactName: string;
  companyName: string;
  companyWebsite: string;
  role: string;
  linkedinUrl: string;
  relevance: string;
  status: string;
  [key: string]: any;
}

interface ProspectAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: ProspectData | null;
  onStartEvaluation: (prospect: ProspectData) => void;
}

export const ProspectAnalysisModal: React.FC<ProspectAnalysisModalProps> = ({
  isOpen,
  onClose,
  prospect,
  onStartEvaluation
}) => {
  const [isEvaluating, setIsEvaluating] = useState(false);

  if (!prospect) return null;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'terminé':
      case 'completed':
      case 'succès':
        return 'bg-green-100 text-green-800';
      case 'en cours':
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'échec':
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRelevanceScore = (relevance: string) => {
    const score = parseInt(relevance) || 0;
    if (score >= 80) return { color: 'text-green-600', icon: TrendingUp };
    if (score >= 60) return { color: 'text-blue-600', icon: Star };
    if (score >= 40) return { color: 'text-yellow-600', icon: AlertTriangle };
    return { color: 'text-red-600', icon: AlertTriangle };
  };

  const handleStartEvaluation = () => {
    setIsEvaluating(true);
    onStartEvaluation(prospect);
    // Simuler l'évaluation
    setTimeout(() => {
      setIsEvaluating(false);
    }, 2000);
  };

  const relevanceData = getRelevanceScore(prospect.relevance);
  const RelevanceIcon = relevanceData.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Analyse du Prospect
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations principales */}
          <div className="lg:col-span-2 space-y-4">
            {/* En-tête du prospect */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {prospect.contactName}
                    </CardTitle>
                    <p className="text-gray-600 mt-1">{prospect.role}</p>
                  </div>
                  <Badge className={getStatusColor(prospect.status)}>
                    {prospect.status || 'En attente'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Entreprise:</span>
                    <span>{prospect.companyName}</span>
                  </div>
                  {prospect.companyWebsite && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Site web:</span>
                      <a 
                        href={prospect.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        Visiter <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Détails de contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations de Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prospect.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Email:</span>
                    <a href={`mailto:${prospect.email}`} className="text-blue-600 hover:text-blue-800">
                      {prospect.email}
                    </a>
                  </div>
                )}
                {prospect.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Téléphone:</span>
                    <a href={`tel:${prospect.phone}`} className="text-blue-600 hover:text-blue-800">
                      {prospect.phone}
                    </a>
                  </div>
                )}
                {prospect.linkedinUrl && (
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">LinkedIn:</span>
                    <a 
                      href={prospect.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      Profil LinkedIn <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Données supplémentaires */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Données Supplémentaires</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(prospect)
                    .filter(([key, value]) => 
                      !['id', 'contactName', 'companyName', 'companyWebsite', 'role', 'linkedinUrl', 'relevance', 'status', 'email', 'phone'].includes(key) &&
                      value && 
                      value.toString().trim() !== ''
                    )
                    .map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <span className="text-sm font-medium text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <p className="text-sm text-gray-800 break-words">{value?.toString()}</p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar d'analyse */}
          <div className="space-y-4">
            {/* Score de pertinence */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RelevanceIcon className={`w-5 h-5 ${relevanceData.color}`} />
                  Score de Pertinence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${relevanceData.color}`}>
                    {prospect.relevance || '0'}%
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Pertinence par rapport à notre offre
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions d'évaluation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleStartEvaluation}
                  disabled={isEvaluating}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isEvaluating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Évaluation en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Procéder à l'Évaluation
                    </>
                  )}
                </Button>
                
                <Button variant="outline" className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Contacter par Email
                </Button>
                
                {prospect.phone && (
                  <Button variant="outline" className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Appeler
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Historique rapide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historique</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ajouté le:</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dernière maj:</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <Badge className={getStatusColor(prospect.status)}>
                      {prospect.status || 'En attente'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};