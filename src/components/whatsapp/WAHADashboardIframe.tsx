import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, ExternalLink, AlertCircle, Loader2, RefreshCw, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const WAHADashboardIframe: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cspBlocked, setCspBlocked] = useState(false);

  // URL directe du dashboard WAHA
  const dashboardUrl = 'https://waha.bot.bj/dashboard/';
  const credentials = { username: 'admin', password: 'Starlab@007' };

  const handleIframeLoad = () => {
    console.log('Dashboard WAHA chargé avec succès');
    setIsLoading(false);
    setCspBlocked(false);
    
    // Tenter d'injecter les identifiants de connexion
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        setTimeout(() => {
          iframe.contentWindow?.postMessage({
            type: 'auto-login',
            username: credentials.username,
            password: credentials.password
          }, 'https://waha.bot.bj');
        }, 2000);
      }
    } catch (e) {
      console.warn('Injection automatique des identifiants impossible:', e);
    }
  };

  const handleIframeError = (e: any) => {
    console.error('Erreur iframe WAHA:', e);
    setError('Erreur de chargement du dashboard WAHA');
    setIsLoading(false);
    
    // Détecter si c'est une erreur CSP
    if (e.message?.includes('CSP') || e.message?.includes('X-Frame-Options')) {
      setCspBlocked(true);
      setError('Dashboard bloqué par les politiques de sécurité (CSP/X-Frame-Options)');
    }
  };

  const openExternalDashboard = () => {
    const newWindow = window.open('https://waha.bot.bj/dashboard/', '_blank');
    if (newWindow) {
      // Afficher les identifiants dans la console pour l'utilisateur
      console.log('🔐 Identifiants WAHA:', credentials);
    }
  };

  const refreshDashboard = () => {
    setIsLoading(true);
    setError(null);
    setCspBlocked(false);
    if (iframeRef.current) {
      iframeRef.current.src = dashboardUrl + '?nocache=' + Date.now();
    }
  };

  // Gérer les erreurs de chargement avec un délai
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setError('Délai de chargement dépassé - Possibles restrictions CSP');
        setCspBlocked(true);
        setIsLoading(false);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Détecter les erreurs CSP via les événements du navigateur
  useEffect(() => {
    const handleSecurityPolicyViolation = (e: SecurityPolicyViolationEvent) => {
      if (e.blockedURI?.includes('waha.bot.bj')) {
        console.error('CSP Violation détectée:', e);
        setCspBlocked(true);
        setError('Dashboard bloqué par Content Security Policy');
        setIsLoading(false);
      }
    };

    document.addEventListener('securitypolicyviolation', handleSecurityPolicyViolation);
    return () => document.removeEventListener('securitypolicyviolation', handleSecurityPolicyViolation);
  }, []);

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            {cspBlocked ? <Shield className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {cspBlocked ? 'Dashboard Bloqué (CSP)' : 'Erreur Dashboard WAHA'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={cspBlocked ? "default" : "destructive"}>
            {cspBlocked ? <Shield className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              {error}
              {cspBlocked && (
                <div className="mt-2 text-sm">
                  <p>Le site waha.bot.bj refuse d'être affiché dans un iframe pour des raisons de sécurité.</p>
                  <p className="mt-1"><strong>Solution:</strong> Utilisez le dashboard externe ci-dessous.</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
          
          {cspBlocked && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📋 Identifiants de connexion WAHA
              </h4>
              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <p><strong>URL:</strong> https://waha.bot.bj/dashboard/</p>
                <p><strong>Nom d'utilisateur:</strong> admin</p>
                <p><strong>Mot de passe:</strong> Starlab@007</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!cspBlocked && (
              <Button onClick={refreshDashboard} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            )}
            <Button onClick={openExternalDashboard} variant="default" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir Dashboard Externe
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-primary" />
            <CardTitle>Dashboard WAHA Intégré</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && !error && (
              <Badge variant="secondary" className="gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Connecté
              </Badge>
            )}
            <Button onClick={refreshDashboard} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={openExternalDashboard} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Externe
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative h-[600px] bg-muted/10 rounded-lg overflow-hidden border">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Connexion au dashboard WAHA...</p>
                <p className="text-xs text-muted-foreground">
                  Authentification automatique (admin/Starlab@007)
                </p>
              </div>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            src={dashboardUrl}
            className="w-full h-full border-0"
            title="Dashboard WAHA"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-downloads"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            loading="eager"
            style={{
              colorScheme: 'light dark'
            }}
          />
        </div>
        
        {/* Informations de connexion */}
        <div className="p-3 bg-muted/50 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>🌐 waha.bot.bj/dashboard</span>
              <span>👤 admin</span>
              <span>🔑 Starlab@007</span>
            </div>
            <span>🔒 Iframe direct</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WAHADashboardIframe;