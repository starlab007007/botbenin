import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WidgetConfig {
  actionText: string;
  startCallText: string;
  endCallText: string;
  listeningText: string;
  speakingText: string;
  variant: 'compact' | 'expanded';
}

interface PersonalAgent {
  id: string;
  name: string;
  elevenlabs_agent_id: string;
  widget_config: WidgetConfig;
  created_at: string;
  is_active: boolean;
  description?: string;
}

export const usePersonalAgents = () => {
  const [agents, setAgents] = useState<PersonalAgent[]>([]);
  const [activeAgent, setActiveAgent] = useState<PersonalAgent | null>(null);
  const [sharedAgent, setSharedAgent] = useState<PersonalAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAgents = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Récupérer le bot_owner de l'utilisateur
      const { data: botOwner } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!botOwner) {
        setAgents([]);
        setIsLoading(false);
        return;
      }

      // Récupérer les agents personnels
      const { data, error: fetchError } = await supabase
        .from('bots')
        .select('id, name, elevenlabs_agent_id, widget_config, created_at, is_active, description')
        .eq('owner_id', botOwner.id)
        .eq('is_personal_agent', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const personalAgents: PersonalAgent[] = (data || []).map(bot => ({
        id: bot.id,
        name: bot.name,
        elevenlabs_agent_id: bot.elevenlabs_agent_id || '',
        widget_config: (bot.widget_config as any) || {
          actionText: 'Nouvel appel',
          startCallText: 'Démarrer la conversation',
          endCallText: 'Terminer la conversation',
          listeningText: 'J\'écoute…',
          speakingText: 'L\'agent vous parle',
          variant: 'expanded'
        },
        created_at: bot.created_at,
        is_active: bot.is_active,
        description: bot.description
      }));

      setAgents(personalAgents);
      
      // Définir le premier agent actif comme agent par défaut
      const defaultAgent = personalAgents.find(agent => agent.is_active) || personalAgents[0];
      if (defaultAgent && !activeAgent) {
        setActiveAgent(defaultAgent);
      }

    } catch (error: any) {
      console.error('Erreur lors de la récupération des agents:', error);
      setError(error.message || 'Erreur lors de la récupération des agents');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSharedAgent = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_personal_agent_by_id', { agent_uuid: agentId });

      if (error) throw error;
      if (data && data.length > 0) {
        const agentData = data[0];
        const sharedAgentFormatted: PersonalAgent = {
          id: agentData.id,
          name: agentData.name,
          elevenlabs_agent_id: agentData.elevenlabs_agent_id || '',
          widget_config: (agentData.widget_config as any) || {
            actionText: 'Nouvel appel',
            startCallText: 'Démarrer la conversation',
            endCallText: 'Terminer la conversation',
            listeningText: 'J\'écoute…',
            speakingText: 'L\'agent vous parle',
            variant: 'expanded'
          },
          created_at: agentData.created_at,
          is_active: agentData.is_active,
          description: agentData.description
        };
        setSharedAgent(sharedAgentFormatted);
        return sharedAgentFormatted;
      }
      return null;
    } catch (err) {
      console.error('Erreur lors du chargement de l\'agent partagé:', err);
      return null;
    }
  };

  const deleteAgent = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      // Mettre à jour la liste locale
      const updatedAgents = agents.filter(agent => agent.id !== agentId);
      setAgents(updatedAgents);

      // Si l'agent supprimé était l'agent actif, sélectionner un autre
      if (activeAgent?.id === agentId) {
        setActiveAgent(updatedAgents[0] || null);
      }

      toast({
        title: "Agent supprimé",
        description: "L'agent a été supprimé avec succès"
      });

    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression de l'agent",
        variant: "destructive"
      });
    }
  };

  const updateAgent = async (agentId: string, updates: Partial<PersonalAgent>) => {
    try {
      const { error } = await supabase
        .from('bots')
        .update({
          name: updates.name,
          widget_config: updates.widget_config as any,
          is_active: updates.is_active,
          description: updates.description
        })
        .eq('id', agentId);

      if (error) throw error;

      // Mettre à jour la liste locale
      const updatedAgents = agents.map(agent => 
        agent.id === agentId ? { ...agent, ...updates } : agent
      );
      setAgents(updatedAgents);

      // Mettre à jour l'agent actif si c'est celui qui a été modifié
      if (activeAgent?.id === agentId) {
        setActiveAgent({ ...activeAgent, ...updates });
      }

      toast({
        title: "Agent mis à jour",
        description: "Les modifications ont été sauvegardées"
      });

    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour de l'agent",
        variant: "destructive"
      });
    }
  };

  const selectAgent = (agent: PersonalAgent) => {
    setActiveAgent(agent);
  };

  const hasPersonalAgents = agents.length > 0;

  useEffect(() => {
    fetchAgents();
  }, [user?.id]);

  return {
    agents,
    activeAgent,
    sharedAgent,
    isLoading,
    error,
    hasPersonalAgents,
    fetchAgents,
    fetchSharedAgent,
    deleteAgent,
    updateAgent,
    selectAgent
  };
};