import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useCampaignDetails } from '@/hooks/useCampaignDetails';
import { CampaignSendStatus } from './CampaignSendStatus';
import { BarChart3, Users, Eye, AlertCircle, RefreshCw, CheckCheck, MessageCircle, Send, Smartphone } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  campaign: any | null;
}

export const CampaignDetailsDialog: React.FC<Props> = ({ open, onClose, campaign }) => {
  const { jobs, stats, retryFailed, retryOne, refresh } = useCampaignDetails(campaign?.id ?? null);

  const errorGroups = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of jobs) {
      if (j.status === 'failed' && j.last_error) {
        const key = j.last_error.slice(0, 80);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [jobs]);

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92dvh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            {campaign.name}
            <Badge variant="outline" className="ml-2">{campaign.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 grid grid-cols-4 w-auto">
            <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1" />Vue</TabsTrigger>
            <TabsTrigger value="recipients"><Users className="w-4 h-4 mr-1" />Destinataires</TabsTrigger>
            <TabsTrigger value="preview"><Smartphone className="w-4 h-4 mr-1" />Aperçu</TabsTrigger>
            <TabsTrigger value="errors"><AlertCircle className="w-4 h-4 mr-1" />Erreurs {stats.failed > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[10px]">{stats.failed}</Badge>}</TabsTrigger>
          </TabsList>

          {/* === OVERVIEW === */}
          <TabsContent value="overview" className="flex-1 overflow-auto p-4 space-y-4 mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Kpi label="Cibles" value={stats.total} icon={<Users className="w-4 h-4" />} />
              <Kpi label="Envoyés" value={stats.sent} pct={stats.pct('sent')} icon={<Send className="w-4 h-4 text-muted-foreground" />} />
              <Kpi label="Livrés" value={stats.delivered} pct={stats.pct('delivered')} icon={<CheckCheck className="w-4 h-4 text-muted-foreground" />} />
              <Kpi label="Lus" value={stats.read} pct={stats.pct('read')} icon={<CheckCheck className="w-4 h-4 text-[#53BDEB]" />} highlight />
              <Kpi label="Répondus" value={stats.replied} icon={<MessageCircle className="w-4 h-4 text-blue-600" />} />
              <Kpi label="En attente" value={stats.queued + stats.sending} />
              <Kpi label="Échecs" value={stats.failed} variant="destructive" />
              <Kpi label="Ignorés" value={stats.skipped} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Progression d'envoi</span><span>{stats.pct('sent')}%</span></div>
              <Progress value={stats.pct('sent')} />
              <div className="flex justify-between text-sm"><span>Taux de lecture</span><span>{stats.pct('read')}%</span></div>
              <Progress value={stats.pct('read')} className="[&>div]:bg-[#53BDEB]" />
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="w-4 h-4 mr-1" />Actualiser</Button>
              {stats.failed > 0 && (
                <Button size="sm" variant="destructive" onClick={retryFailed}>
                  <RefreshCw className="w-4 h-4 mr-1" />Relancer {stats.failed} échec(s)
                </Button>
              )}
            </div>
          </TabsContent>

          {/* === RECIPIENTS === */}
          <TabsContent value="recipients" className="flex-1 min-h-0 mt-0 p-4">
            <ScrollArea className="h-full border rounded-md">
              <div className="divide-y">
                {jobs.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">Aucun envoi planifié</div>}
                {jobs.map((j) => (
                  <div key={j.id} className="p-3 flex items-center gap-3 hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{j.contact_name || '—'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{j.to_phone}</div>
                      {j.last_error && <div className="text-[11px] text-destructive truncate mt-0.5">{j.last_error}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <CampaignSendStatus
                        status={j.status}
                        sentAt={j.sent_at} deliveredAt={j.delivered_at} readAt={j.read_at} repliedAt={j.replied_at}
                        showLabel
                      />
                      {j.read_at && <span className="text-[10px] text-muted-foreground">Lu {new Date(j.read_at).toLocaleString('fr-FR')}</span>}
                      {!j.read_at && j.sent_at && <span className="text-[10px] text-muted-foreground">{new Date(j.sent_at).toLocaleString('fr-FR')}</span>}
                    </div>
                    {(j.status === 'failed' || j.status === 'skipped') && (
                      <Button size="sm" variant="outline" onClick={() => retryOne(j.id)}>
                        <RefreshCw className="w-3 h-3 mr-1" />Renvoyer
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === PREVIEW === */}
          <TabsContent value="preview" className="flex-1 overflow-auto p-4 mt-0">
            <div className="max-w-sm mx-auto">
              <div className="bg-[#075E54] text-white px-4 py-3 rounded-t-xl flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                  {campaign.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{campaign.name}</div>
                  <div className="text-[10px] opacity-70">Aperçu chez le destinataire</div>
                </div>
              </div>
              <div className="bg-[#ECE5DD] p-4 min-h-[300px]">
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] rounded-lg rounded-tr-none max-w-[85%] shadow-sm">
                    {campaign.media_url && (campaign.type === 'photo' || campaign.type === 'video') && (
                      <div className="p-1">
                        {campaign.type === 'photo'
                          ? <img src={campaign.media_url} alt="" className="rounded-md max-h-48 w-full object-cover" />
                          : <video src={campaign.media_url} className="rounded-md max-h-48 w-full" muted />}
                      </div>
                    )}
                    <div className="px-3 py-2">
                      <p className="text-[14px] text-gray-900 whitespace-pre-wrap break-words leading-snug">{campaign.body}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[11px] text-gray-500">12:34</span>
                        <CheckCheck className="w-4 h-4 text-[#53BDEB]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center mt-3">
                Variables ({'{nom}'}, {'{prenom}'}, {'{tag}'}) sont remplacées par destinataire.
              </div>
            </div>
          </TabsContent>

          {/* === ERRORS === */}
          <TabsContent value="errors" className="flex-1 overflow-auto p-4 mt-0 space-y-3">
            {errorGroups.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">Aucune erreur 🎉</div>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button size="sm" variant="destructive" onClick={retryFailed}>
                    <RefreshCw className="w-4 h-4 mr-1" />Tout relancer ({stats.failed})
                  </Button>
                </div>
                {errorGroups.map(([err, count]) => (
                  <div key={err} className="border rounded-md p-3 bg-destructive/5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Badge variant="destructive" className="mb-1">{count} envoi(s)</Badge>
                        <div className="text-sm font-mono break-words">{err}</div>
                        <div className="text-xs text-muted-foreground mt-1">{suggestFix(err)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const Kpi: React.FC<{ label: string; value: number; pct?: number; icon?: React.ReactNode; variant?: 'default' | 'destructive'; highlight?: boolean }> =
  ({ label, value, pct, icon, variant, highlight }) => (
    <div className={`border rounded-lg p-3 ${highlight ? 'bg-[#53BDEB]/10 border-[#53BDEB]/40' : ''} ${variant === 'destructive' ? 'bg-destructive/5 border-destructive/30' : ''}`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>{icon}
      </div>
      <div className={`text-2xl font-bold ${variant === 'destructive' ? 'text-destructive' : ''}`}>{value}</div>
      {pct !== undefined && <div className="text-[11px] text-muted-foreground">{pct}%</div>}
    </div>
  );

function suggestFix(err: string): string {
  const e = err.toLowerCase();
  if (e.includes('not on whatsapp') || e.includes('not exist') || e.includes('numberexists')) return '💡 Vérifiez les numéros via le bouton « Vérifier WhatsApp » dans Contacts.';
  if (e.includes('rate') || e.includes('throttle') || e.includes('429')) return '💡 Diminuez le throttle (envois/h) ou augmentez les délais.';
  if (e.includes('session') || e.includes('not authenticated') || e.includes('not_authenticated')) return '💡 La session WAHA est déconnectée. Rescannez le QR dans l\'onglet Sessions.';
  if (e.includes('media') || e.includes('file')) return '💡 URL du média invalide ou inaccessible. Vérifiez le lien public.';
  return '💡 Cliquez sur « Renvoyer » sur chaque destinataire ou « Tout relancer ».';
}
