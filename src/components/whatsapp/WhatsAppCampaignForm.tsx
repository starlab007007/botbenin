
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Send, Upload, FileText, Image, Video, Settings, Phone, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppCampaignPreview } from './WhatsAppCampaignPreview';

const MAX_MESSAGE_LENGTH = 1024;
const MAX_PHOTO_SIZE_MB = 16;
const MAX_VIDEO_SIZE_MB = 64;

interface WASession {
  id: string;
  session_name: string;
  phone_number: string | null;
  status: string;
}

export const WhatsAppCampaignForm: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<string>('');
  const [message, setMessage] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [selectedSession, setSelectedSession] = useState('');
  const [reportNumber, setReportNumber] = useState('+229');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookLocked, setWebhookLocked] = useState(false);
  const [sessions, setSessions] = useState<WASession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Load webhook from localStorage
  useEffect(() => {
    if (!user) return;
    const key = `whatsapp_campaign_webhook_${user.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      setWebhookUrl(parsed.url);
      setWebhookLocked(parsed.locked);
    }
  }, [user]);

  // Load user sessions
  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      setLoadingSessions(true);
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('id, session_name, phone_number, status')
        .eq('user_id', user.id);
      if (!error && data) {
        setSessions(data as WASession[]);
      }
      setLoadingSessions(false);
    };
    fetchSessions();
  }, [user]);

  const handleLockWebhook = () => {
    if (!user || !webhookUrl.trim()) return;
    const key = `whatsapp_campaign_webhook_${user.id}`;
    localStorage.setItem(key, JSON.stringify({ url: webhookUrl.trim(), locked: true }));
    setWebhookLocked(true);
    toast({ title: 'Webhook verrouillé', description: 'Le webhook a été enregistré et verrouillé.' });
  };

  const handleUnlockWebhook = () => {
    if (!user) return;
    const key = `whatsapp_campaign_webhook_${user.id}`;
    localStorage.removeItem(key);
    setWebhookLocked(false);
    setWebhookUrl('');
    toast({ title: 'Webhook déverrouillé' });
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxBytes = campaignType === 'video'
      ? MAX_VIDEO_SIZE_MB * 1024 * 1024
      : MAX_PHOTO_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title: 'Fichier trop volumineux',
        description: `Taille max : ${campaignType === 'video' ? MAX_VIDEO_SIZE_MB : MAX_PHOTO_SIZE_MB} Mo`,
        variant: 'destructive',
      });
      return;
    }
    setMediaFile(file);
  };

  const validateBeninPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('229');
  };

  const handlePreviewSubmit = async (contacts: { name: string; whatsapp: string }[]) => {
    if (!user) return;
    setShowPreview(false);
    setLoading(true);
    try {
      let mediaBase64: string | null = null;
      let mediaName: string | null = null;
      let mediaMimeType: string | null = null;

      if (mediaFile && (campaignType === 'photo' || campaignType === 'video')) {
        mediaBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(mediaFile);
        });
        mediaName = mediaFile.name;
        mediaMimeType = mediaFile.type;
      }

      const payload = {
        campaignName: campaignName.trim(),
        campaignType,
        message: message.trim(),
        media: mediaBase64 ? { base64: mediaBase64, name: mediaName, mimeType: mediaMimeType } : null,
        sessionId: selectedSession,
        reportNumber: reportNumber.trim(),
        contacts: contacts.map(c => ({ name: c.name, whatsapp: c.whatsapp })),
        userId: user.id,
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Erreur ${res.status}`);

      toast({ title: 'Campagne soumise ✅', description: 'Votre campagne a été envoyée avec succès.' });
      setCampaignName('');
      setCampaignType('');
      setMessage('');
      setMediaFile(null);
      setSelectedSession('');
      setReportNumber('+229');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Échec de la soumission.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const showMediaField = campaignType === 'photo' || campaignType === 'video';
  const mediaAccept = campaignType === 'photo' ? 'image/*' : campaignType === 'video' ? 'video/*' : '';

  return (
    <Card className="w-[90vw] max-w-2xl mx-auto shadow-lg border-green-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl sm:text-2xl text-center text-green-700 flex items-center justify-center gap-2">
          <Send className="w-5 h-5" />
          Nouvelle Campagne WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nom de la campagne */}
          <div className="space-y-2">
            <Label htmlFor="campaignName" className="flex items-center gap-1.5 text-sm font-semibold">
              <FileText className="w-4 h-4 text-green-600" />
              Nom de la campagne *
            </Label>
            <Input
              id="campaignName"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Ex: Promo Noël 2026"
              required
              className="w-full"
            />
          </div>

          {/* Type de campagne */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <Image className="w-4 h-4 text-green-600" />
              Type de campagne *
            </Label>
            <Select value={campaignType} onValueChange={setCampaignType} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="texte">
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Texte</span>
                </SelectItem>
                <SelectItem value="photo">
                  <span className="flex items-center gap-2"><Image className="w-4 h-4" /> Photo</span>
                </SelectItem>
                <SelectItem value="video">
                  <span className="flex items-center gap-2"><Video className="w-4 h-4" /> Vidéo</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-green-600" />
                Message *
              </span>
              <Badge variant={message.length > MAX_MESSAGE_LENGTH ? 'destructive' : 'secondary'} className="text-xs">
                {message.length}/{MAX_MESSAGE_LENGTH}
              </Badge>
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              placeholder="Saisissez votre message de campagne..."
              rows={4}
              required
              className="w-full resize-none"
            />
          </div>

          {/* Fichier média */}
          {showMediaField && (
            <div className="space-y-2">
              <Label htmlFor="mediaFile" className="flex items-center gap-1.5 text-sm font-semibold">
                <Upload className="w-4 h-4 text-green-600" />
                Fichier média
                <Badge variant="outline" className="text-xs ml-auto">
                  Max {campaignType === 'video' ? `${MAX_VIDEO_SIZE_MB} Mo` : `${MAX_PHOTO_SIZE_MB} Mo`}
                </Badge>
              </Label>
              <Input
                id="mediaFile"
                type="file"
                accept={mediaAccept}
                onChange={handleMediaChange}
                className="w-full file:mr-3 file:rounded-md file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-green-700 hover:file:bg-green-100"
              />
              {mediaFile && (
                <p className="text-xs text-muted-foreground">
                  📎 {mediaFile.name} ({(mediaFile.size / 1024 / 1024).toFixed(1)} Mo)
                </p>
              )}
            </div>
          )}

          {/* Session WAHA */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <Phone className="w-4 h-4 text-green-600" />
              Session WAHA *
            </Label>
            <Select value={selectedSession} onValueChange={setSelectedSession} required disabled={loadingSessions}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingSessions ? 'Chargement...' : 'Choisissez une session'} />
              </SelectTrigger>
              <SelectContent>
                {sessions.length === 0 ? (
                  <SelectItem value="none" disabled>Aucune session disponible</SelectItem>
                ) : (
                  sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.session_name} {s.phone_number ? `(${s.phone_number})` : ''}
                      {s.status === 'connected' && ' ✅'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Numéro de rapport */}
          <div className="space-y-2">
            <Label htmlFor="reportNumber" className="flex items-center gap-1.5 text-sm font-semibold">
              <Phone className="w-4 h-4 text-green-600" />
              Numéro de rapport WhatsApp *
            </Label>
            <Input
              id="reportNumber"
              type="tel"
              value={reportNumber}
              onChange={(e) => setReportNumber(e.target.value)}
              placeholder="+229 XX XX XX XX"
              required
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Format : +229 suivi de 8 chiffres</p>
          </div>

          {/* Webhook configuration */}
          <div className="space-y-2 p-3 sm:p-4 rounded-lg bg-muted/50 border border-dashed border-green-300">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <Settings className="w-4 h-4 text-green-600" />
              Configuration Webhook
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://ia.bot.bj/form/form-campagne-wa-v2"
                readOnly={webhookLocked}
                className={`w-full ${webhookLocked ? 'bg-muted cursor-not-allowed' : ''}`}
              />
              {webhookLocked ? (
                <Button type="button" variant="outline" size="sm" onClick={handleUnlockWebhook} className="shrink-0">
                  <Lock className="w-4 h-4 mr-1" /> Déverrouiller
                </Button>
              ) : (
                <Button type="button" variant="default" size="sm" onClick={handleLockWebhook} disabled={!webhookUrl.trim()} className="shrink-0 bg-green-600 hover:bg-green-700">
                  <Unlock className="w-4 h-4 mr-1" /> Verrouiller
                </Button>
              )}
            </div>
            {webhookLocked && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Webhook enregistré et verrouillé
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading || !campaignName || !campaignType || !message || !selectedSession || !webhookLocked}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Envoi en cours...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Soumettre la campagne
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
