import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  RefreshCw, Plus, Trash2, Edit, Search, Package, ShoppingCart, Tag, Users, Store,
  ExternalLink, Loader2
} from 'lucide-react';
import { useEcommerceGoogleSheets, EcommerceSheetRow } from '@/hooks/useEcommerceGoogleSheets';
import { supabase } from '@/integrations/supabase/client';

// Sheet configs matching Excel structure
const SHEET_CONFIGS: Record<string, { label: string; icon: React.ReactNode; fields: { key: string; label: string; type: string; options?: string[] }[] }> = {
  Produits: {
    label: 'Produits',
    icon: <Package className="w-4 h-4" />,
    fields: [
      { key: 'categorie', label: 'Catégorie', type: 'text' },
      { key: 'nom', label: 'Nom', type: 'text' },
      { key: 'prix_fcfa', label: 'Prix (FCFA)', type: 'number' },
      { key: 'tailles', label: 'Tailles', type: 'text' },
      { key: 'couleurs', label: 'Couleurs', type: 'text' },
      { key: 'stock', label: 'Stock', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'url_image', label: 'URL Image', type: 'text' },
      { key: 'disponible', label: 'Disponible', type: 'select', options: ['OUI', 'NON'] },
    ]
  },
  Commandes: {
    label: 'Commandes',
    icon: <ShoppingCart className="w-4 h-4" />,
    fields: [
      { key: 'id_commande', label: 'ID Commande', type: 'text' },
      { key: 'telephone', label: 'Téléphone', type: 'text' },
      { key: 'nom_whatsapp', label: 'Nom WhatsApp', type: 'text' },
      { key: 'produit', label: 'Produit', type: 'text' },
      { key: 'taille', label: 'Taille', type: 'text' },
      { key: 'couleur', label: 'Couleur', type: 'text' },
      { key: 'montant_fcfa', label: 'Montant (FCFA)', type: 'number' },
      { key: 'frais_livraison', label: 'Frais livraison', type: 'number' },
      { key: 'total_fcfa', label: 'Total (FCFA)', type: 'number' },
      { key: 'zone_livraison', label: 'Zone livraison', type: 'text' },
      { key: 'mode_paiement', label: 'Mode paiement', type: 'select', options: ['MTN MoMo', 'Wave', 'Moov Money', 'Paiement livraison', 'Espèces'] },
      { key: 'statut', label: 'Statut', type: 'select', options: ['🟢 Payé — en livraison', '✅ Livré', '🔵 En préparation', '🟡 En attente paiement', '🟠 En route', '❌ Annulé'] },
      { key: 'date_commande', label: 'Date commande', type: 'text' },
    ]
  },
  Promotions: {
    label: 'Promotions',
    icon: <Tag className="w-4 h-4" />,
    fields: [
      { key: 'id_promo', label: 'ID Promo', type: 'text' },
      { key: 'nom_offre', label: 'Nom offre', type: 'text' },
      { key: 'type', label: 'Type', type: 'select', options: ['Remise pourcentage', 'Bundle produits', 'Frais livraison offerts', 'Prix fixe'] },
      { key: 'produits_concernes', label: 'Produits concernés', type: 'text' },
      { key: 'remise_pourcent', label: 'Remise (%)', type: 'number' },
      { key: 'prix_promo_fcfa', label: 'Prix promo (FCFA)', type: 'number' },
      { key: 'date_debut', label: 'Date début', type: 'text' },
      { key: 'date_fin', label: 'Date fin', type: 'text' },
      { key: 'code_promo', label: 'Code promo', type: 'text' },
      { key: 'active', label: 'Active', type: 'select', options: ['OUI', 'NON'] },
    ]
  },
  Clients: {
    label: 'Clients',
    icon: <Users className="w-4 h-4" />,
    fields: [
      { key: 'telephone', label: 'Téléphone', type: 'text' },
      { key: 'nom_whatsapp', label: 'Nom WhatsApp', type: 'text' },
      { key: 'nb_commandes', label: 'Nb commandes', type: 'number' },
      { key: 'valeur_totale_fcfa', label: 'Valeur totale (FCFA)', type: 'number' },
      { key: 'moyen_paiement_prefere', label: 'Paiement préféré', type: 'select', options: ['MTN MoMo', 'Wave', 'Moov Money', 'Paiement livraison', 'Espèces'] },
      { key: 'zone_livraison', label: 'Zone livraison', type: 'text' },
      { key: 'dernier_produit', label: 'Dernier produit', type: 'text' },
      { key: 'date_inscription', label: 'Date inscription', type: 'text' },
      { key: 'statut', label: 'Statut', type: 'select', options: ['ACTIF', 'INACTIF', 'VIP'] },
      { key: 'relance_prevue', label: 'Relance prévue', type: 'text' },
      { key: 'derniere_activite', label: 'Dernière activité', type: 'text' },
    ]
  },
  Infos_Boutique: {
    label: 'Infos Boutique',
    icon: <Store className="w-4 h-4" />,
    fields: [
      { key: 'rubrique', label: 'Rubrique', type: 'text' },
      { key: 'information', label: 'Information', type: 'text' },
      { key: 'notes_details', label: 'Notes / Détails', type: 'text' },
    ]
  }
};

interface EcommerceSheetViewerProps {
  knowledgeBaseId: string;
}

export const EcommerceSheetViewer: React.FC<EcommerceSheetViewerProps> = ({ knowledgeBaseId }) => {
  const [userId, setUserId] = useState<string | undefined>();
  const [activeSheet, setActiveSheet] = useState('Produits');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<EcommerceSheetRow | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const {
    data, isLoading, isWriting, connectionStatus, lastSync,
    loadAllSheets, addRow, updateRow, deleteRow, spreadsheetId
  } = useEcommerceGoogleSheets(userId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadAllSheets();
    }
  }, [userId]);

  const currentConfig = SHEET_CONFIGS[activeSheet];
  const currentData = data[activeSheet] || [];
  const filteredData = currentData.filter(row =>
    Object.values(row).some(val =>
      String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const displayFields = currentConfig?.fields.slice(0, 6) || [];

  const handleOpenAdd = () => {
    setEditingRow(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (row: EcommerceSheetRow) => {
    setEditingRow(row);
    setFormData({ ...row });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingRow) {
      await updateRow(activeSheet, editingRow.id, formData);
    } else {
      await addRow(activeSheet, formData);
    }
    setIsDialogOpen(false);
    setFormData({});
    setEditingRow(null);
  };

  const handleDelete = async (rowId: string) => {
    if (confirm('Supprimer cette ligne ?')) {
      await deleteRow(activeSheet, rowId);
    }
  };

  const renderFormField = (field: { key: string; label: string; type: string; options?: string[] }) => {
    if (field.type === 'select' && field.options) {
      return (
        <Select value={formData[field.key] || ''} onValueChange={v => setFormData({ ...formData, [field.key]: v })}>
          <SelectTrigger><SelectValue placeholder={field.label} /></SelectTrigger>
          <SelectContent>
            {field.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (field.type === 'textarea') {
      return (
        <Textarea
          placeholder={field.label}
          value={formData[field.key] || ''}
          onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
          rows={3}
        />
      );
    }
    return (
      <Input
        type={field.type === 'number' ? 'number' : 'text'}
        placeholder={field.label}
        value={formData[field.key] || ''}
        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
      />
    );
  };

  return (
    <Card className="mt-4">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Google Sheets E-commerce
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'} className="text-xs">
                {connectionStatus === 'connected' ? '🟢 Connecté' : connectionStatus === 'connecting' ? '🔄 Connexion...' : '⚪ Déconnecté'}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Données synchronisées avec le Google Sheet • {lastSync ? `Dernier sync: ${lastSync.toLocaleTimeString()}` : 'Non synchronisé'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadAllSheets()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" />
                Ouvrir Sheet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0">
        <Tabs value={activeSheet} onValueChange={setActiveSheet}>
          <div className="overflow-x-auto mb-4">
            <TabsList className="grid grid-cols-5 w-full min-w-max">
              {Object.entries(SHEET_CONFIGS).map(([key, cfg]) => (
                <TabsTrigger key={key} value={key} className="text-xs sm:text-sm whitespace-nowrap gap-1">
                  {cfg.icon} {cfg.label}
                  <Badge variant="outline" className="text-[10px] ml-1">{(data[key] || []).length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {Object.keys(SHEET_CONFIGS).map(sheetKey => (
            <TabsContent key={sheetKey} value={sheetKey}>
              {/* Search + Add */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleOpenAdd} disabled={isWriting}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {/* Table */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Chargement...</span>
                </div>
              ) : filteredData.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {displayFields.map(f => (
                          <TableHead key={f.key} className="min-w-[100px] text-xs sm:text-sm">{f.label}</TableHead>
                        ))}
                        <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((row, idx) => (
                        <TableRow key={row.id || idx}>
                          {displayFields.map(f => (
                            <TableCell key={f.key} className="max-w-[180px] truncate text-xs sm:text-sm">
                              {f.key === 'url_image' && row[f.key] ? (
                                <img src={row[f.key]} alt="" className="w-10 h-10 object-cover rounded" />
                              ) : (
                                String(row[f.key] ?? row[f.label] ?? '-')
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(row)} className="h-8 w-8 p-0">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} className="h-8 w-8 p-0" disabled={isWriting}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchTerm ? 'Aucun résultat trouvé' : 'Aucune donnée dans cette feuille. Cliquez sur "Ajouter" pour commencer.'}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRow ? 'Modifier' : 'Ajouter'} — {currentConfig?.label}</DialogTitle>
            <DialogDescription>Les modifications seront synchronisées avec Google Sheets</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
            {currentConfig?.fields.map(field => (
              <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <Label className="text-sm">{field.label}</Label>
                <div className="mt-1">{renderFormField(field)}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={isWriting}>
              {isWriting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingRow ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
