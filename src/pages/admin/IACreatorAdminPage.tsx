import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette } from 'lucide-react';
import { useIACreatorAdmin } from '@/hooks/useIACreatorAdmin';
import { IACreatorStats } from '@/components/admin/ia-creator/IACreatorStats';
import { IACreatorUsersTable } from '@/components/admin/ia-creator/IACreatorUsersTable';
import { IACreatorGallery } from '@/components/admin/ia-creator/IACreatorGallery';
import { IACreatorLimitsConfig } from '@/components/admin/ia-creator/IACreatorLimitsConfig';
import { IACreatorCharts } from '@/components/admin/ia-creator/IACreatorCharts';

export const IACreatorAdminPage = () => {
  const navigate = useNavigate();
  const {
    stats,
    usersUsage,
    creations,
    limits,
    isLoading,
    moderateCreation,
    deleteCreation,
    updatePackLimits,
    resetUserUsage,
  } = useIACreatorAdmin();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8 text-pink-500" />
            Gestion IA Créateur Pro
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les créations, utilisateurs, limites et modération
          </p>
        </div>
      </div>

      {/* Statistiques globales */}
      <IACreatorStats stats={stats} />

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="gallery">Galerie</TabsTrigger>
          <TabsTrigger value="limits">Limites</TabsTrigger>
          <TabsTrigger value="charts">Graphiques</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utilisation Mensuelle des Utilisateurs</CardTitle>
              <CardDescription>
                Suivi de l'utilisation du module IA Créateur par utilisateur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IACreatorUsersTable
                users={usersUsage}
                onResetUsage={(userId) => resetUserUsage.mutate(userId)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Galerie des Créations</CardTitle>
              <CardDescription>
                Modérez et gérez toutes les créations générées par l'IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IACreatorGallery
                creations={creations}
                onModerate={(creationId, status, notes) =>
                  moderateCreation.mutate({ creationId, status, notes })
                }
                onDelete={(creationId) => deleteCreation.mutate(creationId)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration des Limites par Pack</CardTitle>
              <CardDescription>
                Définissez les quotas mensuels pour chaque plan d'abonnement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IACreatorLimitsConfig
                limits={limits}
                onUpdateLimits={(planName, limits) =>
                  updatePackLimits.mutate({ planName, limits })
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <IACreatorCharts stats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  );
};