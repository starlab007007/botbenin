import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import * as XLSX from 'xlsx';

interface ExportOptions {
  format: 'csv' | 'excel';
  includeFields: {
    basic: boolean;
    contact: boolean;
    company: boolean;
    notes: boolean;
    tags: boolean;
    customFields: boolean;
    analytics: boolean;
  };
  selectedProspects?: string[];
  databaseId?: string;
}

export function useProspectExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportProspects = async (options: ExportOptions) => {
    setIsExporting(true);
    
    try {
      // Récupérer les prospects
      let query = supabase.from('prospects').select('*');
      
      if (options.selectedProspects && options.selectedProspects.length > 0) {
        query = query.in('id', options.selectedProspects);
      } else if (options.databaseId) {
        query = query.eq('database_id', options.databaseId);
      }
      
      const { data: prospects, error } = await query;
      
      if (error) throw error;
      if (!prospects || prospects.length === 0) {
        toast({
          title: "Aucune donnée",
          description: "Aucun prospect à exporter.",
          variant: "destructive"
        });
        return;
      }

      // Formater les données pour l'export
      const exportData = prospects.map(prospect => {
        const row: any = {};
        
        // Champs de base
        if (options.includeFields.basic) {
          row['ID'] = prospect.id;
          row['Prénom'] = prospect.first_name;
          row['Nom'] = prospect.last_name;
          row['Statut'] = prospect.status;
          row['Score'] = prospect.score;
          row['Source'] = prospect.source;
          row['Date de création'] = new Date(prospect.created_at).toLocaleDateString('fr-FR');
        }
        
        // Coordonnées
        if (options.includeFields.contact) {
          row['Email'] = prospect.email || '';
          row['Téléphone'] = prospect.phone || '';
          row['Position'] = prospect.position || '';
        }
        
        // Entreprise
        if (options.includeFields.company) {
          row['Entreprise'] = prospect.company || '';
        }
        
        // Notes
        if (options.includeFields.notes && prospect.notes) {
          row['Notes'] = prospect.notes;
        }
        
        // Tags
        if (options.includeFields.tags && prospect.tags) {
          row['Tags'] = Array.isArray(prospect.tags) 
            ? prospect.tags.join(', ') 
            : JSON.stringify(prospect.tags);
        }
        
        // Champs personnalisés
        if (options.includeFields.customFields && prospect.custom_fields) {
          const customFields = prospect.custom_fields as any;
          
          // Contact info
          if (customFields.contact_info) {
            row['LinkedIn'] = customFields.contact_info.linkedin_url || '';
            row['Secteur'] = customFields.contact_info.industry || '';
            row['Taille entreprise'] = customFields.contact_info.company_size || '';
          }
          
          // Business info
          if (customFields.business_info) {
            row['Adresse'] = customFields.business_info.address || '';
            row['Horaires'] = customFields.business_info.hours || '';
            row['Gamme de prix'] = customFields.business_info.price_range || '';
            if (customFields.business_info.coordinates) {
              row['Coordonnées GPS'] = JSON.stringify(customFields.business_info.coordinates);
            }
          }
          
          // Metrics
          if (customFields.metrics) {
            row['Note'] = customFields.metrics.rating || '';
            row['Nombre d\'avis'] = customFields.metrics.review_count || '';
            row['Distance'] = customFields.metrics.distance || '';
          }
          
          // Metadata
          if (customFields.metadata) {
            row['Catégorie'] = customFields.metadata.category || '';
            row['Site web'] = customFields.metadata.website || '';
          }
        }
        
        // Analytics
        if (options.includeFields.analytics) {
          row['Dernier contact'] = prospect.last_contact_date 
            ? new Date(prospect.last_contact_date).toLocaleDateString('fr-FR') 
            : '';
          row['Prochain suivi'] = prospect.next_follow_up 
            ? new Date(prospect.next_follow_up).toLocaleDateString('fr-FR') 
            : '';
        }
        
        return row;
      });

      // Générer le fichier
      if (options.format === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Prospects');
        
        // Ajuster la largeur des colonnes
        const maxWidth = 50;
        const colWidths = Object.keys(exportData[0] || {}).map(key => ({
          wch: Math.min(
            Math.max(
              key.length,
              ...exportData.map(row => String(row[key] || '').length)
            ),
            maxWidth
          )
        }));
        worksheet['!cols'] = colWidths;
        
        // Télécharger le fichier
        XLSX.writeFile(workbook, `prospects_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        // CSV
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `prospects_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
      }

      toast({
        title: "Export réussi",
        description: `${prospects.length} prospect(s) exporté(s) au format ${options.format.toUpperCase()}.`,
      });
      
      return true;
    } catch (error: any) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "Erreur d'export",
        description: error.message || "Une erreur est survenue lors de l'export.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportProspects,
    isExporting
  };
}