import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Building, 
  Globe, 
  Linkedin, 
  Star,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Target
} from 'lucide-react';

interface GoogleSheetProspectWithUser {
  id: string;
  user_id: string;
  [key: string]: any;
}

interface ProspectAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: GoogleSheetProspectWithUser | null;
  onEvaluate: (prospectId: string) => void;
}

export const ProspectAnalysisModal: React.FC<ProspectAnalysisModalProps> = ({
  isOpen,
  onClose,
  prospect,
  onEvaluate
}) => {
  if (!prospect) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'succès':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in-progress':
      case 'en cours':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    }
  };

  const extractProspectData = () => {
    const data = {
      name: prospect['Nom du Contact'] || prospect['contact_name'] || 'N/A',
      company: prospect['Nom de l\'Entreprise'] || prospect['company_name'] || 'N/A',
      website: prospect['Site Web Entreprise'] || prospect['website'] || 'N/A',
      role: prospect['Rôle / Poste'] || prospect['role'] || 'N/A',
      linkedin: prospect['Profil LinkedIn'] || prospect['linkedin'] || 'N/A',
      relevance: prospect['Pertinence du prospect par rapport à notre offre ? (sur 100)'] || prospect['relevance'] || '0',
      status: prospect['Statut'] || prospect['status'] || 'En attente',
      notes: prospect['Notes'] || prospect['notes'] || ''
    };
    return data;
  };

  const data = extractProspectData();
  const relevanceScore = parseInt(data.relevance) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Analyse du Prospect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* En-tête du prospect */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    {data.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="w-4 h-4" />
                    {data.company}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm font-medium">{data.role}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="flex items-center gap-1">
                    {getStatusIcon(data.status)}
                    {data.status}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    ID: {prospect.id.substring(0, 12)}...
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Score de pertinence */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Score de Pertinence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`text-3xl font-bold p-4 rounded-lg ${getScoreColor(relevanceScore)}`}>
                    {relevanceScore}/100
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Niveau de pertinence</div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${
                            i < relevanceScore / 20 
                              ? 'text-yellow-400 fill-yellow-400' 
                              : 'text-gray-300'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Recommandation</div>
                  <Badge variant={relevanceScore >= 70 ? 'default' : relevanceScore >= 50 ? 'secondary' : 'destructive'}>
                    {relevanceScore >= 70 ? 'Priorité Haute' : relevanceScore >= 50 ? 'Priorité Moyenne' : 'Priorité Faible'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations détaillées */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-green-600" />
                  Informations Web
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Site web</div>
                  {data.website !== 'N/A' ? (
                    <a 
                      href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm break-all"
                    >
                      {data.website}
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-sm">Non renseigné</span>
                  )}
                </div>
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">LinkedIn</div>
                  {data.linkedin !== 'N/A' ? (
                    <a 
                      href={data.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 break-all"
                    >
                      <Linkedin className="w-3 h-3" />
                      Voir le profil
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-sm">Non renseigné</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Notes & Observations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.notes ? (
                  <p className="text-sm leading-relaxed">{data.notes}</p>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Aucune note disponible</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Données brutes (pour debug) */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">
                Données Complètes (Debug)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {Object.entries(prospect)
                  .filter(([key]) => !['id', 'user_id'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="font-mono text-muted-foreground w-32 truncate">{key}:</span>
                      <span className="font-mono ml-2 break-all">{String(value)}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button 
            onClick={() => onEvaluate(prospect.id)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            <Target className="w-4 h-4 mr-2" />
            Procéder à l'Évaluation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};