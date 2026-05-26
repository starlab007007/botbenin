import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RefreshCw, Plus, Trash2, Edit, Search, MessageCircle,
  ExternalLink, Loader2, Upload,
} from 'lucide-react';
import { useWhatsAppDiffusionGoogleSheets, WhatsAppDiffusionRow } from '@/hooks/useWhatsAppDiffusionGoogleSheets';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { normalizeBeninWhatsApp } from '@/lib/phone';
import { ImportWhatsAppContactsDialog } from './ImportWhatsAppContactsDialog';

interface Props { knowledgeBaseId: string; }

const isActive = (statut?: string) => (statut || '').toLowerCase().startsWith('actif');

export const WhatsAppDiffusionSheetViewer: React.FC<Props> = () => {
  const [userId, setUserId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'actif' | 'inactif'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<WhatsAppDiffusionRow | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const isMobile = useIsMobile();

  const { data, isLoading, isWriting, connectionStatus, lastSync, loadSheet, addRow, updateRow, deleteRow, spreadsheetId } =
    useWhatsAppDiffusionGoogleSheets(userId);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, []);

  useEffect(() => { if (userId) loadSheet(); }, [userId]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchSearch = !searchTerm || Object.values(row).some(v =>
        String(v || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'actif' && isActive(row.statut))
        || (statusFilter === 'inactif' && !isActive(row.statut));
      return matchSearch && matchStatus;
    });
  }, [data, searchTerm, statusFilter]);

  const buildDefaults = () => {
    const lastCampaignName = userId
      ? localStorage.getItem(`last_campaign_name_${userId}`) || ''
      : '';
    return {
      id_campagne: `CAMP_${userId?.slice(0, 8) || 'usr'}_${Date.now()}`,
      nom_campagne: lastCampaignName,
      nom_contact: '',
      contact_whatsapp: '+229',
      statut: 'Actif',
    };
  };

  const handleOpenAdd = () => {
    setEditingRow(null);
    setFormData(buildDefaults());
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (row: WhatsAppDiffusionRow) => {
    setEditingRow(row);
    setFormData({ ...row });
    setIsDialogOpen(true);
  };

  const validatePhone = (phone: string) => /^\+229\d{8}$/.test((phone || '').replace(/\s/g, ''));

  const handleSave = async () => {
    if (!formData.nom_contact?.trim()) return;
    if (!validatePhone(formData.contact_whatsapp)) {
      alert('Numéro WhatsApp invalide. Format attendu : +229 suivi de 8 chiffres');
      return;
    }
    const cleanPhone = (formData.contact_whatsapp || '').replace(/\s/g, '');
    const payload = { ...formData, contact_whatsapp: cleanPhone };
    if (editingRow) await updateRow(editingRow.id, payload);
    else await addRow(payload);
    setIsDialogOpen(false);
    setFormData({});
    setEditingRow(null);
  };

  const handleDelete = async (rowId: string) => {
    if (confirm('Supprimer ce contact ?')) await deleteRow(rowId);
  };

  const handleToggleStatus = async (row: WhatsAppDiffusionRow, checked: boolean) => {
    const newStatut = checked ? 'Actif' : 'Inactif';
    await updateRow(row.id, { statut: newStatut });
  };

  return (
    <Card className="mt-4 overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
              <span className="truncate">Contacts Diffusion WhatsApp</span>
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                {connectionStatus === 'connected' ? '🟢' : connectionStatus === 'connecting' ? '🔄' : '⚪'}
              </Badge>
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs mt-0.5">
              {lastSync ? `Sync : ${lastSync.toLocaleTimeString()}` : 'Non synchronisé'} · {data.length} contact{data.length > 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => loadSheet()} disabled={isLoading} className="h-8 text-xs">
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
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher nom, numéro, campagne..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="h-9 text-sm w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="actif">Actifs</SelectItem>
              <SelectItem value="inactif">Inactifs</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleOpenAdd} disabled={isWriting} size="sm" className="h-9">
            <Plus className="w-3.5 h-3.5" />
            <span className="ml-1">Ajouter</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm space-y-1">
            {searchTerm || statusFilter !== 'all' ? (
              <p>Aucun résultat</p>
            ) : connectionStatus === 'error' ? (
              <>
                <p className="text-destructive font-medium">❌ Impossible d'accéder au Google Sheet</p>
                <p className="text-xs">Partagez le Sheet avec le compte de service Google</p>
              </>
            ) : (
              <p>Aucun contact. Cliquez "Ajouter" pour commencer.</p>
            )}
          </div>
        ) : isMobile ? (
          <div className="space-y-2.5">
            {filteredData.map((row) => (
              <div key={row.id} className="bg-card border rounded-xl p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{row.nom_contact || '-'}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.contact_whatsapp || '-'}</p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(row)} className="h-7 w-7 p-0">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} className="h-7 w-7 p-0" disabled={isWriting}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2 pt-2 border-t border-border/50">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">ID Campagne</span>
                    <p className="text-xs truncate font-mono">{row.id_campagne || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Nom Campagne</span>
                    <p className="text-xs truncate">{row.nom_campagne || '-'}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Statut</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={isActive(row.statut) ? 'default' : 'secondary'} className="text-[10px]">
                        {isActive(row.statut) ? 'Actif' : 'Inactif'}
                      </Badge>
                      <Switch
                        checked={isActive(row.statut)}
                        onCheckedChange={(c) => handleToggleStatus(row, c)}
                        disabled={isWriting}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider min-w-[140px]">ID Campagne</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider min-w-[120px]">Nom Campagne</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider min-w-[120px]">Nom Contact</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider min-w-[140px]">WhatsApp</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider min-w-[110px]">Statut</TableHead>
                    <TableHead className="text-right text-xs min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-mono text-muted-foreground max-w-[160px] truncate">
                        {row.id_campagne || '-'}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm max-w-[160px] truncate">
                        {row.nom_campagne ? <Badge variant="outline" className="text-[10px]">{row.nom_campagne}</Badge> : '-'}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm font-medium">{row.nom_contact || '-'}</TableCell>
                      <TableCell className="text-xs sm:text-sm font-mono">{row.contact_whatsapp || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isActive(row.statut)}
                            onCheckedChange={(c) => handleToggleStatus(row, c)}
                            disabled={isWriting}
                          />
                          <span className="text-xs">{isActive(row.statut) ? 'Actif' : 'Inactif'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(row)} className="h-7 w-7 p-0">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} className="h-7 w-7 p-0" disabled={isWriting}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="flex flex-col w-[95vw] max-w-[calc(100vw-1rem)] sm:max-w-md h-[90dvh] sm:h-auto max-h-[90dvh] sm:max-h-[85vh] overflow-hidden p-0 rounded-2xl sm:rounded-lg">
          <div className="shrink-0 p-4 sm:p-6 pb-3 border-b bg-background">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2 pr-8">
                <MessageCircle className="w-4 h-4 text-green-600" />
                {editingRow ? 'Modifier le contact' : 'Ajouter un contact'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Synchronisé avec Google Sheets (vos données uniquement)
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6">
            <div className="space-y-3 py-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">ID Campagne (auto)</Label>
                <Input
                  value={formData.id_campagne || ''}
                  disabled
                  className="mt-1 font-mono text-xs bg-muted/40"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Nom Campagne (auto)</Label>
                <Input
                  value={formData.nom_campagne || ''}
                  disabled
                  placeholder="Sera rempli après création de campagne"
                  className="mt-1 bg-muted/40"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Nom du contact *</Label>
                <Input
                  value={formData.nom_contact || ''}
                  onChange={(e) => setFormData({ ...formData, nom_contact: e.target.value })}
                  placeholder="Ex: Adjoua Koffi"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">WhatsApp * (format +229XXXXXXXX)</Label>
                <Input
                  value={formData.contact_whatsapp || ''}
                  onChange={(e) => setFormData({ ...formData, contact_whatsapp: e.target.value })}
                  placeholder="+22997XXXXXXX"
                  className="mt-1 font-mono"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-xs font-medium">Statut</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formData.statut === 'Actif' ? 'Recevra les campagnes' : 'Exclu des campagnes'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{formData.statut || 'Inactif'}</span>
                  <Switch
                    checked={formData.statut === 'Actif'}
                    onCheckedChange={(c) => setFormData({ ...formData, statut: c ? 'Actif' : 'Inactif' })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 sm:px-6 border-t bg-background">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto h-11 sm:h-10">
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isWriting} className="w-full sm:w-auto h-11 sm:h-10">
              {isWriting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingRow ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
