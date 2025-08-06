import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Database, 
  Target, 
  Calendar,
  Download,
  Mail,
  Phone,
  Building2,
  Activity
} from 'lucide-react';
import { useProspectDatabases } from '@/hooks/useProspectDatabases';
import { useProspects } from '@/hooks/useProspects';

interface GlobalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalReportModal: React.FC<GlobalReportModalProps> = ({ isOpen, onClose }) => {
  const { databases, stats: dbStats } = useProspectDatabases();
  const { stats: prospectStats } = useProspects({});
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    // Simuler la génération du rapport
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(false);
  };

  const conversionRate = prospectStats.totalProspects > 0 
    ? ((prospectStats.convertedProspects / prospectStats.totalProspects) * 100).toFixed(1)
    : 0;

  const topPerformingDatabases = databases
    .sort((a, b) => (b.prospect_count || 0) - (a.prospect_count || 0))
    .slice(0, 5);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Rapport Global des Prospects
          </DialogTitle>
          <DialogDescription>
            Vue d'ensemble complète de vos données prospects et performances
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="databases">Bases de données</TabsTrigger>
            <TabsTrigger value="prospects">Prospects</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPIs principaux */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Database className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{dbStats.totalDatabases}</div>
                  <div className="text-sm text-muted-foreground">Bases de données</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{dbStats.totalProspects}</div>
                  <div className="text-sm text-muted-foreground">Total prospects</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{conversionRate}%</div>
                  <div className="text-sm text-muted-foreground">Taux conversion</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">{dbStats.activeDatabases}</div>
                  <div className="text-sm text-muted-foreground">Bases actives</div>
                </CardContent>
              </Card>
            </div>

            {/* Répartition par statut */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition des Prospects par Statut</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{prospectStats.newProspects}</div>
                    <Badge variant="outline" className="mt-1">Nouveaux</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{prospectStats.contactedProspects}</div>
                    <Badge variant="outline" className="mt-1">Contactés</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{prospectStats.qualifiedProspects}</div>
                    <Badge variant="outline" className="mt-1">Qualifiés</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{prospectStats.convertedProspects}</div>
                    <Badge variant="outline" className="mt-1">Convertis</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{prospectStats.statusCounts.lost || 0}</div>
                    <Badge variant="outline" className="mt-1">Perdus</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="databases" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bases de Données les Plus Performantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformingDatabases.map((db, index) => (
                    <div key={db.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{db.name}</div>
                          <div className="text-sm text-muted-foreground">{db.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{db.prospect_count || 0} prospects</div>
                        <Badge variant={db.is_active ? "default" : "secondary"}>
                          {db.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prospects" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sources d'Acquisition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Réseaux sociaux</span>
                      <span className="font-medium">35%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Site web</span>
                      <span className="font-medium">28%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Référencement</span>
                      <span className="font-medium">22%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prospection directe</span>
                      <span className="font-medium">15%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Secteurs d'Activité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Technologie</span>
                      <span className="font-medium">42%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Services</span>
                      <span className="font-medium">31%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Commerce</span>
                      <span className="font-medium">18%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Industrie</span>
                      <span className="font-medium">9%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Campagnes Email
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-sm text-muted-foreground">Campagnes actives</div>
                    <Badge variant="outline">Taux ouverture: 24.5%</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    Appels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">186</div>
                    <div className="text-sm text-muted-foreground">Appels ce mois</div>
                    <Badge variant="outline">Taux connexion: 68%</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    ROI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">+245%</div>
                    <div className="text-sm text-muted-foreground">Retour sur investissement</div>
                    <Badge variant="default">En hausse</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Rapport généré le {new Date().toLocaleDateString('fr-FR')}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button 
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Génération...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};