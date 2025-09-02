import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useWhatsAppAutoProvisioning = () => {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isProvisioned, setIsProvisioned] = useState(false);
  const [provisioningError, setProvisioningError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const checkProvisioningStatus = async () => {
    if (!user || !isAuthenticated) return;

    try {
      const { data: accounts, error } = await supabase
        .from('whatsapp_accounts')
        .select('id')
        .limit(1);

      if (error) throw error;
      
      setIsProvisioned(accounts && accounts.length > 0);
    } catch (error: any) {
      console.error('Failed to check provisioning status:', error);
      setProvisioningError(error.message);
    }
  };

  const autoProvision = async () => {
    if (!user || !isAuthenticated || isProvisioning) return;

    setIsProvisioning(true);
    setProvisioningError(null);

    try {
      // Generate a unique session name based on user ID
      const sessionName = `user_${user.id.substring(0, 8)}_main`;

      // Check if session already exists
      const { data: existingAccount, error: existingErr } = await supabase
        .from('whatsapp_accounts')
        .select('id, session_name')
        .eq('session_name', sessionName)
        .maybeSingle();

      if (existingErr) {
        console.warn('Existing account lookup warning:', existingErr.message);
      }

      if (existingAccount) {
        setIsProvisioned(true);
        setIsProvisioning(false);
        return;
      }

      // Get auth headers
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('AUTH_REQUIRED');

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Create WAHA session via edge function
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'create',
          sessionName,
        },
        headers,
      });

      if (error) throw error;

      if (data.success) {
        setIsProvisioned(true);
        toast({
          title: "WhatsApp configuré",
          description: "Votre session WhatsApp a été créée automatiquement",
        });
      } else {
        const errMsg = data.error || 'Failed to create session';
        throw new Error(errMsg);
      }
    } catch (error: any) {
      console.error('Auto-provisioning failed:', error);
      setProvisioningError(error.message);
      toast({
        title: "Erreur de configuration",
        description: error.message || "Impossible de configurer WhatsApp automatiquement",
        variant: "destructive",
      });
    } finally {
      setIsProvisioning(false);
    }
  };
  useEffect(() => {
    if (isAuthenticated && user) {
      checkProvisioningStatus();
    }
  }, [isAuthenticated, user]);

  return {
    isProvisioning,
    isProvisioned,
    provisioningError,
    autoProvision,
    checkProvisioningStatus,
  };
};