import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { KnowledgeBase } from '@/types/knowledge-base';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const useKnowledgeBases = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchKnowledgeBases = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setKnowledgeBases((data || []) as KnowledgeBase[]);
    } catch (error: any) {
      console.error('Error fetching knowledge bases:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les bases de connaissances',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  const createKnowledgeBase = useCallback(async (knowledgeBaseData: Partial<KnowledgeBase>): Promise<KnowledgeBase | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('knowledge_bases')
        .insert({
          user_id: user.id,
          ...knowledgeBaseData,
          data: knowledgeBaseData.data || {},
          structural_info: knowledgeBaseData.structural_info || {}
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Base de connaissances créée avec succès'
      });

      await fetchKnowledgeBases();
      return data as KnowledgeBase;
    } catch (error: any) {
      console.error('Error creating knowledge base:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer la base de connaissances',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast, fetchKnowledgeBases]);

  const updateKnowledgeBase = useCallback(async (id: string, updates: Partial<KnowledgeBase>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('knowledge_bases')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Base de connaissances mise à jour'
      });

      await fetchKnowledgeBases();
      return true;
    } catch (error: any) {
      console.error('Error updating knowledge base:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la base',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, fetchKnowledgeBases]);

  const deleteKnowledgeBase = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('knowledge_bases')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Base de connaissances supprimée'
      });

      await fetchKnowledgeBases();
      return true;
    } catch (error: any) {
      console.error('Error deleting knowledge base:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la base',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, fetchKnowledgeBases]);

  const exportKnowledgeBase = useCallback(async (kb: KnowledgeBase, format: 'json' | 'csv' | 'excel' | 'pdf' = 'json') => {
    try {
      const fileName = `${kb.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'json') {
        const dataStr = JSON.stringify(kb, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv' || format === 'excel') {
        // Create workbook with multiple sheets
        const wb = XLSX.utils.book_new();
        
        // Structural info sheet
        const structuralData = Object.entries(kb.structural_info).map(([key, value]) => ({
          'Champ': key,
          'Valeur': value
        }));
        const ws1 = XLSX.utils.json_to_sheet(structuralData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Informations');
        
        // Data tables sheets
        Object.entries(kb.data).forEach(([tableName, tableData]) => {
          if (Array.isArray(tableData) && tableData.length > 0) {
            const ws = XLSX.utils.json_to_sheet(tableData);
            XLSX.utils.book_append_sheet(wb, ws, tableName.substring(0, 31));
          }
        });
        
        if (format === 'excel') {
          XLSX.writeFile(wb, `${fileName}.xlsx`);
        } else {
          XLSX.writeFile(wb, `${fileName}.csv`);
        }
      } else if (format === 'pdf') {
        const doc = new jsPDF();
        let yPosition = 20;
        
        // Title
        doc.setFontSize(18);
        doc.text(kb.name, 14, yPosition);
        yPosition += 10;
        
        doc.setFontSize(12);
        doc.text(`Secteur: ${kb.sector}`, 14, yPosition);
        yPosition += 7;
        doc.text(`Complétion: ${kb.completion_percentage}%`, 14, yPosition);
        yPosition += 10;
        
        // Structural info
        doc.setFontSize(14);
        doc.text('Informations Essentielles', 14, yPosition);
        yPosition += 7;
        
        doc.setFontSize(10);
        Object.entries(kb.structural_info).forEach(([key, value]) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(`${key}: ${value}`, 14, yPosition);
          yPosition += 7;
        });
        
        // Data tables
        Object.entries(kb.data).forEach(([tableName, tableData]) => {
          if (Array.isArray(tableData) && tableData.length > 0) {
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 20;
            }
            
            yPosition += 10;
            doc.setFontSize(14);
            doc.text(tableName, 14, yPosition);
            yPosition += 7;
            
            const headers = Object.keys(tableData[0]);
            const rows = tableData.map(row => headers.map(h => row[h] || ''));
            
            autoTable(doc, {
              head: [headers],
              body: rows,
              startY: yPosition,
              theme: 'grid',
              styles: { fontSize: 8 }
            });
            
            yPosition = (doc as any).lastAutoTable.finalY + 10;
          }
        });
        
        doc.save(`${fileName}.pdf`);
      }

      toast({
        title: 'Succès',
        description: `Base de connaissances exportée en ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter la base',
        variant: 'destructive'
      });
    }
  }, [toast]);

  return {
    knowledgeBases,
    loading,
    fetchKnowledgeBases,
    createKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    exportKnowledgeBase
  };
};
