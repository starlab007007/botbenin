import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  RefreshCw, Plus, Trash2, Edit, Search, UtensilsCrossed, ShoppingCart, Users, CalendarDays, Store,
  ExternalLink, Loader2
} from 'lucide-react';
import { useRestaurationGoogleSheets, RestaurationSheetRow } from '@/hooks/useRestaurationGoogleSheets';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

const SHEET_CONFIGS: Record<string, { label: string; icon: React.ReactNode; fields: { key: string; label: string; type: string; options?: string[] }[] }> = {
  Menu: {
    label: 'Menu', icon: <UtensilsCrossed className="w-4 h-4" />,
    fields: [
      { key: 'categorie', label: 'Catégorie', type: 'select', options: ['Entrées', 'Plats', 'Desserts', 'Boissons', 'Spécialités', 'Petit-déjeuner', 'Accompagnements'] },
      { key: 'nom', label: 'Nom', type: 'text' }, { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'prix', label: 'Prix (FCFA)', type: 'number' }, { key: 'allergenes', label: 'Allergènes', type: 'text' },
      { key: 'disponible', label: 'Disponible', type: 'select', options: ['Oui', 'Non'] }, { key: 'image', label: 'Image URL', type: 'text' },
    ]
  },
  Commandes: {
    label: 'Commandes', icon: <ShoppingCart className="w-4 h-4" />,
    fields: [
      { key: 'id_commande', label: 'ID Commande', type: 'text' }, { key: 'telephone', label: 'Téléphone', type: 'text' },
      { key: 'nom_client', label: 'Nom client', type: 'text' }, { key: 'plats', label: 'Plats commandés', type: 'text' },
      { key: 'montant_fcfa', label: 'Montant (FCFA)', type: 'number' },
      { key: 'type_commande', label: 'Type', type: 'select', options: ['Sur place', 'À emporter', 'Livraison'] },
      { key: 'mode_paiement', label: 'Paiement', type: 'select', options: ['Espèces', 'MTN MoMo', 'Wave', 'Moov Money', 'CB'] },
      { key: 'statut', label: 'Statut', type: 'select', options: ['🔵 En préparation', '🟢 Prêt', '🟠 En livraison', '✅ Servi/Livré', '❌ Annulé'] },
      { key: 'date_commande', label: 'Date', type: 'text' },
    ]
  },
  Clients: {
    label: 'Clients', icon: <Users className="w-4 h-4" />,
    fields: [
      { key: 'telephone', label: 'Téléphone', type: 'text' }, { key: 'nom_client', label: 'Nom client', type: 'text' },
      { key: 'nb_visites', label: 'Nb visites', type: 'number' }, { key: 'montant_total_fcfa', label: 'Total dépensé (FCFA)', type: 'number' },
      { key: 'plat_prefere', label: 'Plat préféré', type: 'text' }, { key: 'date_derniere_visite', label: 'Dernière visite', type: 'text' },
      { key: 'statut', label: 'Statut', type: 'select', options: ['ACTIF', 'INACTIF', 'VIP', 'FIDÈLE'] },
    ]
  },
  Reservations: {
    label: 'Réservations', icon: <CalendarDays className="w-4 h-4" />,
    fields: [
      { key: 'id_reservation', label: 'ID', type: 'text' }, { key: 'nom_client', label: 'Nom client', type: 'text' },
      { key: 'telephone', label: 'Téléphone', type: 'text' }, { key: 'date_reservation', label: 'Date', type: 'text' },
      { key: 'heure', label: 'Heure', type: 'text' }, { key: 'nb_personnes', label: 'Nb personnes', type: 'number' },
      { key: 'zone', label: 'Zone', type: 'select', options: ['Intérieur', 'Terrasse', 'VIP', 'Privé'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'statut', label: 'Statut', type: 'select', options: ['✅ Confirmée', '🟡 En attente', '❌ Annulée', '🟢 Terminée'] },
    ]
  },
  Infos_Restaurant: {
    label: 'Infos', icon: <Store className="w-4 h-4" />,
    fields: [
      { key: 'rubrique', label: 'Rubrique', type: 'text' }, { key: 'information', label: 'Information', type: 'text' },
      { key: 'notes_details', label: 'Notes / Détails', type: 'text' },
    ]
  }
};

interface RestaurationSheetViewerProps { knowledgeBaseId: string; }

export const RestaurationSheetViewer: React.FC<RestaurationSheetViewerProps> = ({ knowledgeBaseId }) => {
  const [userId, setUserId] = useState<string | undefined>();
  const [activeSheet, setActiveSheet] = useState('Menu');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<RestaurationSheetRow | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const isMobile = useIsMobile();

  const { data, isLoading, isWriting, connectionStatus, lastSync, loadAllSheets, addRow, updateRow, deleteRow, spreadsheetId } = useRestaurationGoogleSheets(userId);

  useEffect(() => { const getUser = async () => { const { data: { user } } = await supabase.auth.getUser(); if (user) setUserId(user.id); }; getUser(); }, []);
  useEffect(() => { if (userId) loadAllSheets(); }, [userId]);

  const currentConfig = SHEET_CONFIGS[activeSheet];
  const currentData = data[activeSheet] || [];
  const filteredData = currentData.filter(row => Object.values(row).some(val => String(val || '').toLowerCase().includes(searchTerm.toLowerCase())));
  const displayFields = currentConfig?.fields.slice(0, isMobile ? 3 : 6) || [];

  const handleOpenAdd = () => { setEditingRow(null); setFormData({}); setIsDialogOpen(true); };
  const handleOpenEdit = (row: RestaurationSheetRow) => { setEditingRow(row); setFormData({ ...row }); setIsDialogOpen(true); };
  const handleSave = async () => {
    if (editingRow) await updateRow(activeSheet, editingRow.id, formData);
    else await addRow(activeSheet, formData);
    setIsDialogOpen(false); setFormData({}); setEditingRow(null);
  };
  const handleDelete = async (rowId: string) => { if (confirm('Supprimer cette ligne ?')) await deleteRow(activeSheet, rowId); };

  const renderFormField = (field: { key: string; label: string; type: string; options?: string[] }) => {
    if (field.type === 'select' && field.options) {
      return (<Select value={formData[field.key] || ''} onValueChange={v => setFormData({ ...formData, [field.key]: v })}><SelectTrigger><SelectValue placeholder={field.label} /></SelectTrigger><SelectContent>{field.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent></Select>);
    }
    if (field.type === 'textarea') {
      return <Textarea placeholder={field.label} value={formData[field.key] || ''} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} rows={3} />;
    }
    return <Input type={field.type === 'number' ? 'number' : 'text'} placeholder={field.label} value={formData[field.key] || ''} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} />;
  };

  const renderMobileCards = () => (
    <div className="space-y-2.5">
      {filteredData.map((row, idx) => {
        const primary = currentConfig?.fields[0];
        const secondary = currentConfig?.fields[1];
        return (
          <div key={row.id || idx} className="bg-card border rounded-xl p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{primary ? (row[primary.key] ?? '-') : '-'}</p>
                {secondary && <p className="text-xs text-muted-foreground truncate">{row[secondary.key] ?? '-'}</p>}
              </div>
              <div className="flex gap-0.5 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(row)} className="h-7 w-7 p-0"><Edit className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} className="h-7 w-7 p-0" disabled={isWriting}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            </div>
            {currentConfig && currentConfig.fields.length > 2 && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-border/50">
                {currentConfig.fields.slice(2, 6).map(f => (
                  <div key={f.key}><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</span><p className="text-xs truncate">{String(row[f.key] ?? '-')}</p></div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <Card className="mt-4 overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0" />
              <span className="truncate">Google Sheets Restauration</span>
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                {connectionStatus === 'connected' ? '🟢' : connectionStatus === 'connecting' ? '🔄' : '⚪'}
              </Badge>
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs mt-0.5">
              {lastSync ? `Sync: ${lastSync.toLocaleTimeString()}` : 'Non synchronisé'}
            </CardDescription>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => loadAllSheets()} disabled={isLoading} className="h-8 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {!isMobile && <span className="ml-1">Sync</span>}
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs">
              <a href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                {!isMobile && <span className="ml-1">Sheet</span>}
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-5 pt-0">
        <Tabs value={activeSheet} onValueChange={setActiveSheet}>
          <div className="overflow-x-auto -mx-1 px-1 mb-3">
            <TabsList className={`${isMobile ? 'flex w-max gap-0.5' : 'grid grid-cols-5 w-full'}`}>
              {Object.entries(SHEET_CONFIGS).map(([key, cfg]) => (
                <TabsTrigger key={key} value={key} className="text-[10px] sm:text-xs whitespace-nowrap gap-1 px-2 sm:px-3">
                  {cfg.icon}
                  <span className="text-[10px] sm:text-xs">{cfg.label}</span>
                  <Badge variant="outline" className="text-[9px] ml-0.5 h-4 px-1 hidden sm:inline-flex">{(data[key] || []).length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {Object.keys(SHEET_CONFIGS).map(sheetKey => (
            <TabsContent key={sheetKey} value={sheetKey}>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-9 text-sm" />
                </div>
                <Button onClick={handleOpenAdd} disabled={isWriting} size="sm" className="h-9">
                  <Plus className="w-3.5 h-3.5" />
                  {!isMobile && <span className="ml-1">Ajouter</span>}
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /><span className="ml-2 text-sm text-muted-foreground">Chargement...</span></div>
              ) : filteredData.length > 0 ? (
                isMobile ? renderMobileCards() : (
                  <div className="border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            {displayFields.map(f => <TableHead key={f.key} className="min-w-[90px] text-xs font-semibold uppercase tracking-wider">{f.label}</TableHead>)}
                            <TableHead className="text-right min-w-[70px] text-xs">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.map((row, idx) => (
                            <TableRow key={row.id || idx} className="hover:bg-muted/20">
                              {displayFields.map(f => (
                                <TableCell key={f.key} className="max-w-[160px] truncate text-xs sm:text-sm">
                                  {f.key === 'image' && row[f.key] ? <img src={row[f.key]} alt="" className="w-9 h-9 object-cover rounded-lg" /> : String(row[f.key] ?? row[f.label] ?? '-')}
                                </TableCell>
                              ))}
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-0.5">
                                  <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(row)} className="h-7 w-7 p-0"><Edit className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} className="h-7 w-7 p-0" disabled={isWriting}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm space-y-1">
                  {searchTerm ? <p>Aucun résultat</p> : connectionStatus === 'error' ? (
                    <><p className="text-destructive font-medium">❌ Impossible d'accéder au Google Sheet</p><p className="text-xs">Partagez le Sheet avec le compte de service</p></>
                  ) : <p>Aucune donnée. Cliquez "Ajouter" pour commencer.</p>}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base">{editingRow ? 'Modifier' : 'Ajouter'} — {currentConfig?.label}</DialogTitle>
            <DialogDescription className="text-xs">Synchronisé avec Google Sheets</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3">
            {currentConfig?.fields.map(field => (
              <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <Label className="text-xs font-medium">{field.label}</Label>
                <div className="mt-1">{renderFormField(field)}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleSave} disabled={isWriting} className="w-full sm:w-auto">
              {isWriting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingRow ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
