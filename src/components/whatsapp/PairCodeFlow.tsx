import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, RefreshCw, CheckCircle2, Smartphone, KeyRound, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWahaPairingStatus } from '@/hooks/useWahaPairingStatus';

interface PairCodeFlowProps {
  sessionName: string;
  /** Called when WAHA reports the session as connected. */
  onConnected?: () => void;
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

const PairCodeFlow: React.FC<PairCodeFlowProps> = ({ sessionName, onConnected }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(0);

  const { connected } = useWahaPairingStatus(sessionName, !!code && !!sessionName);

  useEffect(() => {
    if (connected) {
      toast.success('WhatsApp connecté avec succès !');
      onConnected?.();
    }
  }, [connected, onConnected]);

  // expiry countdown
  useEffect(() => {
    if (expiresIn <= 0) return;
    const id = setInterval(() => setExpiresIn((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [expiresIn]);

  const requestCode = async () => {
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.length < 8) {
      toast.error('Numéro invalide. Format international, ex: 229 90 00 00 00');
      return;
    }
    setLoading(true);
    setError(null);
    setCode(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('waha-connect', {
        body: { action: 'pair-code', sessionName, phoneNumber: digits },
      });
      if (invokeError) throw invokeError;
      if ((data as any)?.code) {
        setCode((data as any).code);
        setExpiresIn(Number((data as any).expires_in) || 300);
      } else {
        throw new Error((data as any)?.error || 'Code introuvable');
      }
    } catch (e: any) {
      const msg = e?.message || 'Échec de génération du code';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.replace('-', ''));
      toast.success('Code copié');
    } catch {
      /* ignore */
    }
  };

  if (connected) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-3 animate-scale-in" />
          <h3 className="font-semibold text-green-800 text-lg mb-1">Connexion réussie 🎉</h3>
          <p className="text-green-700 text-sm">
            Session <span className="font-mono font-semibold">{sessionName}</span> active.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Numéro WhatsApp (format international)
        </label>
        <Input
          inputMode="tel"
          placeholder="+229 90 00 00 00"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading || !!code}
        />
        <p className="text-xs text-muted-foreground">
          Saisissez le numéro du compte WhatsApp que vous souhaitez lier.
        </p>
      </div>

      {!code && (
        <Button onClick={requestCode} disabled={loading} className="w-full h-11 gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {loading ? 'Génération…' : 'Obtenir le code'}
        </Button>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {code && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-5 space-y-4">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-emerald-700 mb-2">
                Votre code à 8 chiffres
              </p>
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-2 font-mono text-3xl md:text-4xl font-bold tracking-[0.25em] text-emerald-900 hover:opacity-80"
              >
                {code}
                <Copy className="h-4 w-4 opacity-60" />
              </button>
              <p className="text-xs text-emerald-700 mt-2">
                Expire dans <span className="font-mono">{formatTime(expiresIn)}</span>
              </p>
            </div>

            <div className="rounded-lg bg-white/70 p-3 text-sm space-y-1.5">
              <p className="font-medium">Sur votre téléphone :</p>
              <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                <li>Ouvrez WhatsApp</li>
                <li>Menu (⋮) → <strong>Appareils liés</strong></li>
                <li>Touchez <strong>Lier un appareil</strong> → <strong>Lier avec numéro de téléphone</strong></li>
                <li>Saisissez le code <span className="font-mono">{code}</span></li>
              </ol>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              En attente de la confirmation WhatsApp…
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={requestCode} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Régénérer un code
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PairCodeFlow;
