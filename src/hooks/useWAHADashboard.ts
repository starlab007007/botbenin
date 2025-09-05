import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WAHASession {
  name: string;
  status: 'WORKING' | 'FAILED' | 'SCAN_QR_CODE' | 'DISCONNECTED' | 'STARTING';
  config?: {
    metadata?: {
      phone_number?: string;
      account?: string;
    };
  };
  metadata?: any;
  server: string;
  lastActivity?: string;
}

export interface QRCodeData {
  qr: string;
  url?: string;
}

export const useWAHADashboard = () => {
  const [sessions, setSessions] = useState<WAHASession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Faire un appel via notre proxy edge function
  const makeWAHARequest = useCallback(async (path: string, options: any = {}) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const url = new URL(`/functions/v1/waha-dashboard-proxy`, 'https://mvynepqulhflxtyymtzs.supabase.co');
      url.searchParams.set('path', path);

      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : null,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('WAHA request error:', error);
      throw error;
    }
  }, []);

  // Charger les sessions
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading WAHA sessions...');
      const data = await makeWAHARequest('/api/sessions');
      
      const sessionsData = Array.isArray(data) ? data : [];
      const formattedSessions: WAHASession[] = sessionsData.map((session: any) => ({
        name: session.name,
        status: session.status || 'DISCONNECTED',
        config: session.config,
        metadata: session.metadata,
        server: 'WAHA',
        lastActivity: session.lastActivity
      }));

      setSessions(formattedSessions);
      console.log(`Loaded ${formattedSessions.length} sessions`);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError(error instanceof Error ? error.message : 'Erreur de chargement');
      toast.error('Erreur lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  }, [makeWAHARequest]);

  // Créer une session
  const createSession = useCallback(async (sessionName: string) => {
    try {
      setLoading(true);
      console.log('Creating WAHA session:', sessionName);
      
      await makeWAHARequest('/api/sessions', {
        method: 'POST',
        body: { name: sessionName }
      });

      toast.success('Session créée avec succès');
      await loadSessions(); // Recharger la liste
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Erreur lors de la création de la session');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [makeWAHARequest, loadSessions]);

  // Démarrer une session
  const startSession = useCallback(async (sessionName: string) => {
    try {
      console.log('Starting WAHA session:', sessionName);
      
      await makeWAHARequest(`/api/sessions/${sessionName}/start`, {
        method: 'POST'
      });

      toast.success('Session démarrée');
      await loadSessions(); // Recharger la liste
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Erreur lors du démarrage de la session');
      throw error;
    }
  }, [makeWAHARequest, loadSessions]);

  // Arrêter une session
  const stopSession = useCallback(async (sessionName: string) => {
    try {
      console.log('Stopping WAHA session:', sessionName);
      
      await makeWAHARequest(`/api/sessions/${sessionName}/stop`, {
        method: 'POST'
      });

      toast.success('Session arrêtée');
      await loadSessions(); // Recharger la liste
    } catch (error) {
      console.error('Error stopping session:', error);
      toast.error('Erreur lors de l\'arrêt de la session');
      throw error;
    }
  }, [makeWAHARequest, loadSessions]);

  // Supprimer une session
  const deleteSession = useCallback(async (sessionName: string) => {
    try {
      console.log('Deleting WAHA session:', sessionName);
      
      await makeWAHARequest(`/api/sessions/${sessionName}`, {
        method: 'DELETE'
      });

      toast.success('Session supprimée');
      await loadSessions(); // Recharger la liste
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Erreur lors de la suppression de la session');
      throw error;
    }
  }, [makeWAHARequest, loadSessions]);

  // Obtenir le QR code
  const getQRCode = useCallback(async (sessionName: string): Promise<QRCodeData> => {
    try {
      console.log('Getting QR code for session:', sessionName);
      
      const data = await makeWAHARequest(`/api/sessions/${sessionName}/auth/qr`);
      
      return {
        qr: data.qr || data.base64 || '',
        url: data.url || `whatsapp://connect/${sessionName}`
      };
    } catch (error) {
      console.error('Error getting QR code:', error);
      toast.error('Erreur lors de la récupération du QR code');
      throw error;
    }
  }, [makeWAHARequest]);

  // Envoyer un message de test via notre edge function dédiée
  const sendTestMessage = useCallback(async (sessionName: string, to: string, message: string) => {
    try {
      console.log('Sending test message via session:', sessionName);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waha-send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionName,
          to,
          message,
          messageType: 'text'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      toast.success('Message de test envoyé');
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      throw error;
    }
  }, []);

  // Actualiser les données
  const refreshData = useCallback(async () => {
    await loadSessions();
  }, [loadSessions]);

  // Charger les données au montage
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    loading,
    error,
    createSession,
    startSession,
    stopSession,
    deleteSession,
    getQRCode,
    sendTestMessage,
    refreshData,
    loadSessions
  };
};