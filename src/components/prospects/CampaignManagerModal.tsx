import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, 
  Phone, 
  MessageSquare,
  Calendar,
  Users,
  BarChart3,
  Play,
  Pause,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { CreateCampaignModal } from './CreateCampaignModal';

interface CampaignManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CampaignManagerModal: React.FC<CampaignManagerModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { campaigns, stats, isLoading } = useCampaigns();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'phone': return Phone;
      case 'sms': return MessageSquare;
      default: return Mail;
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    switch (activeTab) {
      case 'active': return campaign.status === 'active';
      case 'paused': return campaign.status === 'paused';
      case 'completed': return campaign.status === 'completed';
      case 'draft': return campaign.status === 'draft';
      default: return true;
    }
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">Gestionnaire de Campagnes</DialogTitle>
                <DialogDescription>
                  Gérez et suivez toutes vos campagnes marketing
                </DialogDescription>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle campagne
              </Button>
            </div>
          </DialogHeader>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.statusCounts.active || 0}
                </div>
                <div className="text-sm text-muted-foreground">Actives</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.statusCounts.paused || 0}
                </div>
                <div className="text-sm text-muted-foreground">En pause</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.statusCounts.completed || 0}
                </div>
                <div className="text-sm text-muted-foreground">Terminées</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {stats.statusCounts.draft || 0}
                </div>
                <div className="text-sm text-muted-foreground">Brouillons</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs pour filtrer les campagnes */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active" className="flex items-center space-x-2">
                <span>Actives</span>
                <Badge variant="secondary">{stats.statusCounts.active || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="paused" className="flex items-center space-x-2">
                <span>En pause</span>
                <Badge variant="secondary">{stats.statusCounts.paused || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center space-x-2">
                <span>Terminées</span>
                <Badge variant="secondary">{stats.statusCounts.completed || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="draft" className="flex items-center space-x-2">
                <span>Brouillons</span>
                <Badge variant="secondary">{stats.statusCounts.draft || 0}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Aucune campagne {activeTab === 'active' ? 'active' : activeTab}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Créez votre première campagne pour commencer à engager vos prospects.
                    </p>
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Créer une campagne
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCampaigns.map((campaign) => {
                    const TypeIcon = getTypeIcon(campaign.type);
                    return (
                      <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <TypeIcon className="w-5 h-5 text-primary" />
                              <div>
                                <h3 className="font-semibold">{campaign.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1)}
                                </p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {/* Métriques de base */}
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-lg font-semibold">
                                {campaign.metrics?.sent || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">Envoyés</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-green-600">
                                {campaign.metrics?.opened || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">Ouverts</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-blue-600">
                                {campaign.metrics?.clicked || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">Clics</div>
                            </div>
                          </div>

                          {/* Dates */}
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(campaign.start_date).toLocaleDateString('fr-FR')}
                            </div>
                            {campaign.end_date && (
                              <div>
                                Fin: {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex space-x-1">
                              {campaign.status === 'active' ? (
                                <Button variant="outline" size="sm">
                                  <Pause className="w-4 h-4 mr-1" />
                                  Pause
                                </Button>
                              ) : campaign.status === 'paused' ? (
                                <Button variant="outline" size="sm">
                                  <Play className="w-4 h-4 mr-1" />
                                  Reprendre
                                </Button>
                              ) : null}
                              <Button variant="ghost" size="sm" className="text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </>
  );
};