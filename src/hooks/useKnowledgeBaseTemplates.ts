import { useCallback } from 'react';
import { KNOWLEDGE_BASE_TEMPLATES } from '@/config/knowledge-base-templates';
import { KnowledgeBaseTemplate, KnowledgeBase } from '@/types/knowledge-base';

export const useKnowledgeBaseTemplates = () => {
  const templates = KNOWLEDGE_BASE_TEMPLATES;

  const getTemplateById = useCallback((id: string): KnowledgeBaseTemplate | undefined => {
    return templates.find(t => t.id === id);
  }, [templates]);

  const getTemplatesBySector = useCallback((sector: string): KnowledgeBaseTemplate[] => {
    return templates.filter(t => t.sector === sector);
  }, [templates]);

  const calculateCompletion = useCallback((data: Record<string, any[]>, structuralInfo: Record<string, any>, template: KnowledgeBaseTemplate): number => {
    let totalFields = 0;
    let filledFields = 0;

    // Count structural info fields
    template.structuralInfo.forEach(field => {
      totalFields++;
      if (structuralInfo[field.name] && structuralInfo[field.name].toString().trim()) {
        filledFields++;
      }
    });

    // Count table data
    template.tables.forEach(table => {
      if (table.required) {
        totalFields += 10; // Weight required tables more
        const tableData = data[table.id] || [];
        if (tableData.length > 0) {
          filledFields += Math.min(10, tableData.length);
        }
      } else {
        totalFields += 5;
        const tableData = data[table.id] || [];
        if (tableData.length > 0) {
          filledFields += Math.min(5, tableData.length);
        }
      }
    });

    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  }, []);

  const validateData = useCallback((data: Record<string, any[]>, template: KnowledgeBaseTemplate): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check required tables
    template.tables.filter(t => t.required).forEach(table => {
      const tableData = data[table.id] || [];
      if (tableData.length === 0) {
        errors.push(`La table "${table.name}" est requise mais vide`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }, []);

  return {
    templates,
    getTemplateById,
    getTemplatesBySector,
    calculateCompletion,
    validateData
  };
};
