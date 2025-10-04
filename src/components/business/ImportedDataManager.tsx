import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, Mail, Phone, Bot, Trash2, Eye, Download, MessageSquare, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CampaignLauncher } from './CampaignLauncher';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ImportedDatabase {
  id: string;
  name: string;
  template_type?: string;
  data?: any;
  file_name?: string;
  total_records?: number;
  created_at: string;
  metadata?: any;
  description?: string;
  is_active?: boolean;
  updated_at?: string;
  user_id: string;
}

interface ImportedDataManagerProps {
  onBack?: () => void;
  refreshTrigger?: number;
}

export const ImportedDataManager: React.FC<ImportedDataManagerProps> = ({ onBack, refreshTrigger }) => {
  const { toast } = useToast();
  const [databases, setDatabases] = useState<ImportedDatabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDb, setSelectedDb] = useState<ImportedDatabase | null>(null);
  const [showCampaignLauncher, setShowCampaignLauncher] = useState(false);
  const [campaignType, setCampaignType] = useState<'whatsapp' | 'email'>('email');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchDatabases();
  }, [refreshTrigger]);

  const fetchDatabases = async () => {
    try {
      const { data, error } = await supabase
        .from('prospect_databases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDatabases((data || []) as ImportedDatabase[]);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les bases de données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prospect_databases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Supprimé",
        description: "Base de données supprimée avec succès"
      });
      
      fetchDatabases();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la base de données",
        variant: "destructive"
      });
    }
  };

  const handleExport = (db: ImportedDatabase) => {
    const dataStr = JSON.stringify(db.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${db.name}_export.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLaunchCampaign = (db: ImportedDatabase, type: 'whatsapp' | 'email') => {
    setSelectedDb(db);
    setCampaignType(type);
    setShowCampaignLauncher(true);
  };

  const handlePreview = (db: ImportedDatabase) => {
    setSelectedDb(db);
    setShowPreview(true);
  };

  const hasEmails = (db: ImportedDatabase) => {
    if (!db.data || !Array.isArray(db.data)) return false;
    const dataArray = Array.isArray(db.data) ? db.data : [];
    return dataArray.some((row: any) => 
      Object.values(row).some(val => 
        typeof val === 'string' && val.includes('@')
      )
    );
  };

  const hasPhones = (db: ImportedDatabase) => {
    if (!db.data || !Array.isArray(db.data)) return false;
    const dataArray = Array.isArray(db.data) ? db.data : [];
    return dataArray.some((row: any) => 
      Object.values(row).some(val => 
        typeof val === 'string' && /[\d+\-\(\)\s]{8,}/.test(val)
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Bases de Données Importées
            </h2>
            <p className="text-muted-foreground mt-2">
              Gérez vos données et lancez des campagnes
            </p>
          </div>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Retour
            </Button>
          )}
        </div>

        {databases.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Aucune base de données</p>
              <p className="text-sm text-muted-foreground">
                Importez des fichiers pour commencer
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {databases.map((db) => (
              <Card key={db.id} className="border-2 hover:border-primary transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        {db.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {db.file_name && <span className="block">Fichier: {db.file_name}</span>}
                      <span className="block">
                        Template: <Badge variant="secondary">{db.template_type || 'Standard'}</Badge>
                      </span>
                        <span className="block mt-1 text-xs">
                          Importé le {new Date(db.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge className="text-lg">{db.total_records || 0} prospects</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreview(db)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Aperçu
                    </Button>
                    
                    {hasEmails(db) && (
                      <Button
                        size="sm"
                        onClick={() => handleLaunchCampaign(db, 'email')}
                        className="bg-gradient-to-r from-blue-600 to-blue-500"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Campagne Email
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                    
                    {hasPhones(db) && (
                      <Button
                        size="sm"
                        onClick={() => handleLaunchCampaign(db, 'whatsapp')}
                        className="bg-gradient-to-r from-green-600 to-green-500"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Campagne WhatsApp
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                    >
                      <Bot className="w-4 h-4 mr-2" />
                      Créer un Bot
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport(db)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exporter
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(db.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Aperçu des données - {selectedDb?.name}</DialogTitle>
            <DialogDescription>
              {selectedDb?.total_records} enregistrements
            </DialogDescription>
          </DialogHeader>
          {selectedDb && selectedDb.data && selectedDb.data.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(selectedDb.data[0] || {}).map((key) => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDb.data.slice(0, 20).map((row: any, idx: number) => (
                    <TableRow key={idx}>
                      {Object.values(row).map((val: any, valIdx: number) => (
                        <TableCell key={valIdx}>{String(val)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {selectedDb.data.length > 20 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Affichage des 20 premiers enregistrements sur {selectedDb.total_records || selectedDb.data.length}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Campaign Launcher Dialog */}
      <Dialog open={showCampaignLauncher} onOpenChange={setShowCampaignLauncher}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Lancer une campagne {campaignType === 'email' ? 'Email' : 'WhatsApp'}
            </DialogTitle>
            <DialogDescription>
              Configurez votre campagne pour {selectedDb?.total_records || selectedDb?.data?.length || 0} prospects
            </DialogDescription>
          </DialogHeader>
          {selectedDb && (
            <CampaignLauncher
              database={{
                id: selectedDb.id,
                name: selectedDb.name,
                data: Array.isArray(selectedDb.data) ? selectedDb.data : [],
                total_records: selectedDb.total_records || 0
              }}
              campaignType={campaignType}
              onComplete={() => {
                setShowCampaignLauncher(false);
                toast({
                  title: "Campagne lancée",
                  description: "Votre campagne a été créée avec succès"
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
