import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProspectData {
  spreadsheetId: string;
  sheetName: string;
  contact_name: string;
  company_name: string;
}

export const useSimpleProspectAdder = (userId?: string) => {
  const [isAdding, setIsAdding] = useState(false);
  const [lastAddTime, setLastAddTime] = useState<Date | null>(null);

  const addProspect = useCallback(async (prospectData: ProspectData) => {
    // Validation de sécurité
    if (!userId || userId === 'unknown') {
      toast.error('Vous devez être connecté pour ajouter un prospect');
      return false;
    }

    if (isAdding) {
      toast.error('Un ajout est déjà en cours, veuillez patienter');
      return false;
    }

    // Validation des données
    if (!prospectData.contact_name.trim() || !prospectData.company_name.trim()) {
      toast.error('Le nom du contact et de l\'entreprise sont obligatoires');
      return false;
    }

    if (!prospectData.spreadsheetId) {
      toast.error('Configuration Google Sheets manquante');
      return false;
    }

    setIsAdding(true);

    try {
      // Créer le prospect avec toutes les colonnes requises
      const newProspect = {
        id: `user_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        _isOrphan: 'FALSE',
        contact_name: prospectData.contact_name.trim(),
        company_name: prospectData.company_name.trim(),
        company_website: '',
        'Rôle': '',
        linkedin_contact_url: '',
        'Pertinence du prospect par rapport à notre offre ? (sur 100)': '',
        'Préparation de l\'appel': '',
        Run: 'false',
        Statut: 'En attente'
      };

      console.log('🔄 Ajout simple d\'un prospect:', newProspect);

      // Appeler directement l'edge function pour l'ajout
      const { data: result, error } = await supabase.functions.invoke('google-sheets-writer', {
        body: {
          spreadsheetId: prospectData.spreadsheetId,
          sheetName: prospectData.sheetName || 'Feuille 1',
          data: [newProspect], // Un seul prospect
          operation: 'append',
          userId: userId
        }
      });

      if (error) {
        console.error('❌ Erreur Supabase function:', error);
        toast.error(`Erreur lors de l'ajout: ${error.message}`);
        return false;
      }

      if (result?.error) {
        console.error('❌ Erreur function result:', result.error);
        toast.error(`Erreur Google Sheets: ${result.details || result.error}`);
        return false;
      }

      if (result?.success) {
        setLastAddTime(new Date());
        console.log('✅ Prospect ajouté avec succès:', result);
        return true;
      } else {
        toast.error('Réponse inattendue du serveur');
        return false;
      }
    } catch (error) {
      console.error('❌ Exception lors de l\'ajout:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur technique: ${errorMessage}`);
      return false;
    } finally {
      setIsAdding(false);
    }
  }, [userId, isAdding]);

  return {
    isAdding,
    lastAddTime,
    addProspect
  };
};