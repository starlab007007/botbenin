
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export class SystemRepairService {
  /**
   * Répare automatiquement les problèmes du système pour un utilisateur
   */
  static async repairUserSystem(userId: string): Promise<boolean> {
    try {
      console.log('[SystemRepair] Démarrage de la réparation automatique pour:', userId);

      // 1. Vérifier et créer le bot_owner si manquant
      await this.ensureBotOwnerExists(userId);

      // 2. Réparer les politiques RLS si nécessaire
      await this.repairRLSPolicies();

      // 3. Nettoyer les sessions orphelines
      await this.cleanupOrphanedSessions();

      // 4. Tester la création de bot après réparation
      const testSuccess = await this.testBotCreation();
      
      console.log('[SystemRepair] Réparation automatique terminée avec succès');
      return testSuccess;

    } catch (error) {
      console.error('[SystemRepair] Erreur lors de la réparation:', error);
      return false;
    }
  }

  /**
   * S'assure qu'un bot_owner existe pour l'utilisateur
   */
  private static async ensureBotOwnerExists(userId: string): Promise<void> {
    try {
      // Vérifier si le bot_owner existe
      const { data: existingOwner } = await supabase
        .from('bot_owners')
        .select('id, max_bots')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingOwner) {
        console.log('[SystemRepair] Création du bot_owner manquant pour:', userId);
        
        const { error: createError } = await supabase
          .from('bot_owners')
          .insert({
            user_id: userId,
            subscription_plan: 'free',
            max_bots: 10
          });

        if (createError) {
          console.error('[SystemRepair] Erreur création bot_owner:', createError);
          throw createError;
        }

        console.log('[SystemRepair] Bot_owner créé avec succès');
      } else {
        // Mettre à jour max_bots à 10 si différent
        if (existingOwner.max_bots !== 10) {
          await supabase
            .from('bot_owners')
            .update({ max_bots: 10 })
            .eq('user_id', userId);

          console.log('[SystemRepair] Max_bots mis à jour à 10');
        }
      }

    } catch (error) {
      console.error('[SystemRepair] Erreur ensureBotOwnerExists:', error);
      throw error;
    }
  }

  /**
   * Répare les politiques RLS en utilisant la fonction de réparation finale
   */
  private static async repairRLSPolicies(): Promise<void> {
    try {
      console.log('[SystemRepair] Réparation des politiques RLS...');
      
      const { error } = await supabase.rpc('repair_system_final');
      
      if (error) {
        console.warn('[SystemRepair] Avertissement réparation RLS:', error);
        // Ne pas faire échouer la réparation pour cette erreur
      } else {
        console.log('[SystemRepair] Politiques RLS réparées');
      }

    } catch (error) {
      console.warn('[SystemRepair] Erreur réparation RLS (non critique):', error);
      // Cette erreur n'est pas critique, on continue
    }
  }

  /**
   * Nettoie les sessions orphelines
   */
  private static async cleanupOrphanedSessions(): Promise<void> {
    try {
      console.log('[SystemRepair] Nettoyage des sessions orphelines...');
      
      const { error } = await supabase.rpc('cleanup_orphaned_sessions');
      
      if (error) {
        console.warn('[SystemRepair] Avertissement nettoyage sessions:', error);
      } else {
        console.log('[SystemRepair] Sessions orphelines nettoyées');
      }

    } catch (error) {
      console.warn('[SystemRepair] Erreur nettoyage sessions (non critique):', error);
    }
  }

  /**
   * Teste la création d'un bot pour vérifier que le système fonctionne
   */
  static async testBotCreation(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('test_bot_creation_fixed');
      
      if (error) {
        console.error('[SystemRepair] Erreur test création bot:', error);
        return false;
      }

      const hasFailures = data?.some((result: any) => result.status === 'failed');
      
      if (hasFailures) {
        console.warn('[SystemRepair] Certains tests ont échoué:', data);
        return false;
      }

      console.log('[SystemRepair] Test de création de bot réussi');
      return true;

    } catch (error) {
      console.error('[SystemRepair] Erreur lors du test:', error);
      return false;
    }
  }

  /**
   * Réparation complète automatique avec feedback utilisateur
   */
  static async performCompleteRepair(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur d'authentification",
          description: "Vous devez être connecté pour effectuer cette réparation",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Réparation en cours...",
        description: "Correction automatique des problèmes système",
      });

      // Effectuer la réparation
      const repairSuccess = await this.repairUserSystem(user.id);
      
      if (!repairSuccess) {
        toast({
          title: "Réparation échouée",
          description: "Impossible de réparer automatiquement le système",
          variant: "destructive",
        });
        return false;
      }

      // Tester la création de bot
      const testSuccess = await this.testBotCreation();
      
      if (testSuccess) {
        toast({
          title: "Système réparé !",
          description: "Tous les problèmes ont été corrigés automatiquement",
        });
        return true;
      } else {
        toast({
          title: "Réparation partielle",
          description: "Système partiellement réparé, veuillez réessayer",
          variant: "destructive",
        });
        return false;
      }

    } catch (error) {
      console.error('[SystemRepair] Erreur réparation complète:', error);
      toast({
        title: "Erreur de réparation",
        description: "Une erreur est survenue lors de la réparation automatique",
        variant: "destructive",
      });
      return false;
    }
  }

  /**
   * Diagnostic avancé des problèmes système
   */
  static async diagnoseSystemIssues(): Promise<{ 
    hasIssues: boolean; 
    issues: string[]; 
    canAutoRepair: boolean 
  }> {
    const issues: string[] = [];
    let canAutoRepair = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        issues.push("Utilisateur non authentifié");
        canAutoRepair = false;
        return { hasIssues: true, issues, canAutoRepair };
      }

      // Vérifier l'existence du bot_owner
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id, max_bots')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!ownerData) {
        issues.push("Compte propriétaire de bot manquant");
      } else if (ownerData.max_bots !== 10) {
        issues.push("Limite de bots incorrecte");
      }

      // Tester les politiques RLS
      try {
        const { error: testError } = await supabase.rpc('test_bot_creation_fixed');
        if (testError) {
          issues.push("Problème avec les politiques RLS");
        }
      } catch (error) {
        issues.push("Erreur critique des politiques de sécurité");
        canAutoRepair = false;
      }

    } catch (error) {
      issues.push("Erreur système critique");
      canAutoRepair = false;
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      canAutoRepair
    };
  }
}
