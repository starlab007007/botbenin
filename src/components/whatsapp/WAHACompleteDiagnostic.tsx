import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WAHACompleteDiagnostic: React.FC = () => {
  const [sessionName, setSessionName] = useState('test_session_' + Date.now());
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
    setQrCode('');
    setSessions([]);
  };

  // Test 1: Connectivité de base WAHA
  const testWAHAConnection = async () => {
    setLoading(true);
    clearLogs();

    try {
      addLog('🔍 Test de connectivité WAHA de base...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Test simple: liste des sessions
      const response = await fetch('https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waha-dashboard-proxy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          path: '/api/sessions',
          method: 'GET'
        })
      });

      addLog(`📊 Statut de connexion WAHA: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        const sessionsList = Array.isArray(data) ? data : [];
        setSessions(sessionsList);
        addLog(`✅ Connexion WAHA réussie! Sessions trouvées: ${sessionsList.length}`);
        
        if (sessionsList.length > 0) {
          addLog(`📋 Sessions existantes: ${sessionsList.map(s => s.name).join(', ')}`);
        } else {
          addLog('⚠️ Aucune session existante trouvée');
        }
        
        return true;
      } else {
        const errorText = await response.text();
        addLog(`❌ Échec de connexion WAHA: ${errorText}`);
        return false;
      }
    } catch (error: any) {
      addLog(`❌ Erreur de test de connexion: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Création de session
  const createAndStartSession = async () => {
    setLoading(true);

    try {
      addLog(`🚀 Création de la session: ${sessionName}`);
      
      // Créer la session via edge function
      const { data: createData, error: createError } = await supabase.functions.invoke('waha-session-manager', {
        body: { action: 'create', sessionName }
      });

      if (createError) {
        throw new Error(`Création échoué: ${createError.message}`);
      }

      addLog(`✅ Session créée: ${JSON.stringify(createData)}`);

      // Démarrer la session
      addLog(`▶️ Démarrage de la session: ${sessionName}`);
      
      const { data: startData, error: startError } = await supabase.functions.invoke('waha-session-manager', {
        body: { action: 'start', sessionName }
      });

      if (startError) {
        throw new Error(`Démarrage échoué: ${startError.message}`);
      }

      addLog(`✅ Session démarrée: ${JSON.stringify(startData)}`);
      return true;

    } catch (error: any) {
      addLog(`❌ Erreur création/démarrage: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Test 3: Récupération du QR
  const getSessionQR = async () => {
    setLoading(true);

    try {
      addLog(`📱 Récupération du QR pour: ${sessionName}`);
      
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: { action: 'qr', sessionName }
      });

      addLog(`📋 Réponse QR: ${JSON.stringify(data)}`);

      if (error) {
        throw new Error(`QR échoué: ${error.message}`);
      }

      if (data?.success && data?.qrCode) {
        const qrImage = data.qrCode.startsWith('data:image') 
          ? data.qrCode 
          : `data:image/png;base64,${data.qrCode}`;
        
        setQrCode(qrImage);
        addLog(`✅ QR récupéré avec succès! Taille: ${qrImage.length} caractères`);
        toast.success('QR Code généré avec succès!');
        return true;
      } else {
        addLog(`⚠️ Pas de QR dans la réponse: ${JSON.stringify(data)}`);
        return false;
      }

    } catch (error: any) {
      addLog(`❌ Erreur récupération QR: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Test complet automatique
  const runCompleteTest = async () => {
    setLoading(true);
    clearLogs();

    try {
      addLog('🎯 DÉMARRAGE DU TEST COMPLET');
      
      // Étape 1: Test de connectivité
      const connectionOk = await testWAHAConnection();
      if (!connectionOk) {
        addLog('❌ Test arrêté: problème de connectivité WAHA');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause

      // Étape 2: Création et démarrage de session
      const sessionOk = await createAndStartSession();
      if (!sessionOk) {
        addLog('❌ Test arrêté: problème de création de session');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000)); // Pause plus longue

      // Étape 3: Récupération du QR
      const qrOk = await getSessionQR();
      if (qrOk) {
        addLog('🎉 TEST COMPLET RÉUSSI!');
        toast.success('Test complet réussi! QR Code disponible.');
      } else {
        addLog('⚠️ QR non récupéré mais session créée');
        toast.warning('Session créée mais QR non disponible');
      }

    } catch (error: any) {
      addLog(`❌ Erreur test complet: ${error.message}`);
      toast.error('Échec du test complet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 Diagnostic Complet WAHA</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test étape par étape pour identifier et résoudre les problèmes de QR Code
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Input
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Nom de session"
            className="flex-1"
          />
          <Button onClick={clearLogs} variant="outline" disabled={loading}>
            Clear
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <Button onClick={testWAHAConnection} disabled={loading} variant="outline">
            1. Test Connexion
          </Button>
          <Button onClick={createAndStartSession} disabled={loading} variant="outline">
            2. Créer Session
          </Button>
          <Button onClick={getSessionQR} disabled={loading} variant="outline">
            3. Récupérer QR
          </Button>
          <Button onClick={runCompleteTest} disabled={loading} className="bg-primary">
            🎯 Test Complet
          </Button>
        </div>

        {sessions.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-sm">Sessions existantes ({sessions.length}):</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
              {sessions.map((session, idx) => (
                <div key={idx} className="text-xs p-2 bg-white dark:bg-gray-800 rounded border">
                  <div><strong>Nom:</strong> {session.name}</div>
                  <div><strong>Statut:</strong> {session.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-80 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx} className="mb-1">{log}</div>
            ))}
          </div>
        )}

        {qrCode && (
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">
              ✅ QR Code Généré avec Succès!
            </h3>
            <img src={qrCode} alt="QR Code WhatsApp" className="mx-auto max-w-xs border-2 border-green-500 rounded-lg shadow-lg" />
            <p className="text-sm text-green-600 dark:text-green-300 mt-2">
              Scannez ce QR code avec WhatsApp pour connecter la session: <strong>{sessionName}</strong>
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Test en cours...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WAHACompleteDiagnostic;