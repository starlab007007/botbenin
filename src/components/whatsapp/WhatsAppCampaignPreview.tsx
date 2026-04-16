
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCheck, Search, X, Send, ArrowLeft, Video, Image, Users } from 'lucide-react';

interface Contact {
  name: string;
  whatsapp: string;
}

interface PreviewProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (contacts: Contact[]) => void;
  campaignName: string;
  campaignType: string;
  message: string;
  mediaFile: File | null;
}

export const WhatsAppCampaignPreview: React.FC<PreviewProps> = ({
  open,
  onClose,
  onSubmit,
  campaignName,
  campaignType,
  message,
  mediaFile,
}) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // Load media preview (regenerate when dialog opens to avoid revoked URLs)
  useEffect(() => {
    if (!mediaFile || !open) { setMediaPreview(null); return; }
    const reader = new FileReader();
    reader.onload = () => setMediaPreview(reader.result as string);
    reader.readAsDataURL(mediaFile);
  }, [mediaFile, open]);

  // Load contacts from Google Sheet
  useEffect(() => {
    if (!open || !user) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('google-sheets-reader', {
          body: {
            spreadsheetId: '1cXuo8Kot_ypgMaCoChjuf4ah4C2XlOMFyJLAjQ-lo1k',
            sheetName: 'Sheet1',
          },
        });
        if (error) throw error;
        const rows: any[] = data?.data || data || [];
        const userRows = rows.filter((r: any) => r.user_id === user.id);
        const parsed: Contact[] = userRows
          .filter((r: any) => r.NOM_CONTACT && r.CONTACT_WHATSAPP)
          .map((r: any) => ({
            name: String(r.NOM_CONTACT).trim(),
            whatsapp: String(r.CONTACT_WHATSAPP).trim(),
          }));
        setContacts(parsed);
      } catch (err) {
        console.error('Error loading contacts:', err);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, user]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(q) || c.whatsapp.includes(q));
  }, [contacts, search]);

  const toggleContact = (idx: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((_, i) => i)));
    }
  };

  const handleSubmit = () => {
    const selected = filtered.filter((_, i) => selectedIds.has(i));
    onSubmit(selected);
  };

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg p-0 gap-0 max-h-[95dvh] flex flex-col overflow-hidden rounded-xl">
        {/* WhatsApp Mockup Header */}
        <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3 shrink-0 rounded-t-xl">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            {campaignName?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{campaignName || 'Campagne'}</p>
            <p className="text-[10px] opacity-70">Aperçu de la campagne</p>
          </div>
        </div>

        {/* Chat area - WhatsApp style */}
        <div className="bg-[#ECE5DD] flex-shrink-0 p-3 sm:p-4" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 20h1v1h-1zM60 40h1v1h-1zM100 10h1v1h-1zM140 60h1v1h-1zM180 30h1v1h-1zM30 80h1v1h-1zM70 100h1v1h-1zM110 70h1v1h-1zM150 110h1v1h-1zM190 90h1v1h-1zM40 140h1v1h-1zM80 160h1v1h-1zM120 130h1v1h-1zM160 170h1v1h-1zM10 180h1v1h-1z\' fill=\'%23d4ccba\' opacity=\'.3\'/%3E%3C/svg%3E")' }}>
          <div className="flex justify-end">
            <div className="bg-[#DCF8C6] rounded-lg rounded-tr-none max-w-[85%] shadow-sm">
              {/* Media preview */}
              {mediaFile && campaignType === 'photo' && mediaPreview && (
                <div className="p-1">
                  <img src={mediaPreview} alt="preview" className="rounded-md max-h-48 w-full object-cover" />
                </div>
              )}
              {mediaFile && campaignType === 'video' && (
                <div className="p-1">
                  <div className="bg-black/10 rounded-md h-36 flex items-center justify-center relative overflow-hidden">
                    {mediaPreview ? (
                      <video src={mediaPreview} className="max-h-36 w-full object-cover rounded-md" muted />
                    ) : (
                      <Video className="w-10 h-10 text-gray-500" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-gray-700 ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Text */}
              <div className="px-3 py-2">
                <p className="text-[14px] text-gray-900 whitespace-pre-wrap break-words leading-[1.35]">{message || '...'}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[11px] text-gray-500">{timeStr}</span>
                  <CheckCheck className="w-4 h-4 text-[#53BDEB]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contacts section */}
        <div className="flex-1 flex flex-col min-h-0 border-t">
          {/* Contacts header */}
          <div className="px-4 py-3 bg-background border-b shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                Destinataires
              </h3>
              <Badge variant="secondary" className="text-xs">
                {selectedIds.size}/{filtered.length}
              </Badge>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Select all */}
          <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={filtered.length > 0 && selectedIds.size === filtered.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium">Tout sélectionner ({filtered.length})</span>
            </label>
          </div>

          {/* Contact list */}
          <ScrollArea className="flex-1 min-h-0 max-h-[35vh]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="animate-spin w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full" />
                <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {contacts.length === 0 ? 'Aucun contact trouvé' : 'Aucun résultat'}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((c, i) => (
                  <label
                    key={`${c.whatsapp}-${i}`}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(i)}
                      onCheckedChange={() => toggleContact(i)}
                    />
                    <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.whatsapp}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer buttons */}
        <div className="p-3 sm:p-4 border-t bg-background flex gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 text-sm">
            <X className="w-4 h-4 mr-1.5" />
            Fermer et modifier
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0}
            className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-white text-sm"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Valider et soumettre
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
