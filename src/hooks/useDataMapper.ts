import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface TemplateField {
  name: string;
  type: 'text' | 'email' | 'phone' | 'url' | 'date' | 'number';
  required: boolean;
  description?: string;
}

interface Template {
  id: string;
  name: string;
  category: 'prospect' | 'bot' | 'campaign' | 'b2b' | 'b2c';
  fields: TemplateField[];
  description: string;
}

const PLATFORM_TEMPLATES: Template[] = [
  {
    id: 'prospect_standard',
    name: 'Prospect Standard',
    category: 'prospect',
    description: 'Template standard pour la gestion de prospects',
    fields: [
      { name: 'first_name', type: 'text', required: true },
      { name: 'last_name', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'phone', type: 'phone', required: false },
      { name: 'company', type: 'text', required: false },
      { name: 'position', type: 'text', required: false },
      { name: 'notes', type: 'text', required: false }
    ]
  },
  {
    id: 'bot_training',
    name: 'Données d\'entraînement Bot',
    category: 'bot',
    description: 'Format pour enrichir les connaissances d\'un bot',
    fields: [
      { name: 'question', type: 'text', required: true },
      { name: 'answer', type: 'text', required: true },
      { name: 'category', type: 'text', required: false },
      { name: 'keywords', type: 'text', required: false }
    ]
  },
  {
    id: 'campaign_contacts',
    name: 'Contacts de Campagne',
    category: 'campaign',
    description: 'Liste de contacts pour campagnes marketing',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'phone', type: 'phone', required: false },
      { name: 'segment', type: 'text', required: false },
      { name: 'tags', type: 'text', required: false }
    ]
  },
  {
    id: 'b2b_leads',
    name: 'Leads B2B',
    category: 'b2b',
    description: 'Prospects entreprises (B2B)',
    fields: [
      { name: 'company_name', type: 'text', required: true },
      { name: 'contact_person', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'phone', type: 'phone', required: false },
      { name: 'industry', type: 'text', required: false },
      { name: 'company_size', type: 'text', required: false },
      { name: 'website', type: 'url', required: false }
    ]
  },
  {
    id: 'b2c_customers',
    name: 'Clients B2C',
    category: 'b2c',
    description: 'Base clients particuliers',
    fields: [
      { name: 'full_name', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'phone', type: 'phone', required: false },
      { name: 'address', type: 'text', required: false },
      { name: 'date_of_birth', type: 'date', required: false },
      { name: 'preferences', type: 'text', required: false }
    ]
  }
];

export const useDataMapper = () => {
  const { toast } = useToast();
  const [mappedData, setMappedData] = useState<any>(null);
  const [suggestedTemplate, setSuggestedTemplate] = useState<Template | null>(null);

  const analyzeAndSuggestTemplate = useCallback((headers: string[]): Template => {
    const headerLower = headers.map(h => h.toLowerCase());
    
    // Scoring system to find best matching template
    const scores = PLATFORM_TEMPLATES.map(template => {
      let score = 0;
      template.fields.forEach(field => {
        const fieldVariants = [
          field.name,
          field.name.replace('_', ' '),
          field.name.replace('_', ''),
        ];
        
        if (headerLower.some(h => fieldVariants.some(v => h.includes(v)))) {
          score += field.required ? 2 : 1;
        }
      });
      return { template, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].template;
  }, []);

  const mapToTemplate = useCallback((sourceData: any, template: Template, fieldMapping: Record<string, string>) => {
    try {
      const mapped = sourceData.rows.map((row: any) => {
        const mappedRow: any = {};
        
        template.fields.forEach(field => {
          const sourceField = fieldMapping[field.name];
          if (sourceField && row[sourceField] !== undefined) {
            mappedRow[field.name] = row[sourceField];
          } else if (field.required) {
            mappedRow[field.name] = '';
          }
        });
        
        return mappedRow;
      });

      setMappedData(mapped);
      
      toast({
        title: "Mapping réussi",
        description: `${mapped.length} enregistrements mappés vers ${template.name}`,
      });

      return mapped;
    } catch (error) {
      toast({
        title: "Erreur de mapping",
        description: "Impossible de mapper les données au template sélectionné",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  const autoMapFields = useCallback((sourceHeaders: string[], template: Template): Record<string, string> => {
    const mapping: Record<string, string> = {};
    
    template.fields.forEach(field => {
      const fieldVariants = [
        field.name,
        field.name.replace('_', ' '),
        field.name.replace('_', ''),
        field.description?.toLowerCase()
      ].filter(Boolean);

      const match = sourceHeaders.find(header => 
        fieldVariants.some(variant => 
          header.toLowerCase().includes(variant.toLowerCase())
        )
      );

      if (match) {
        mapping[field.name] = match;
      }
    });

    return mapping;
  }, []);

  const validateMapping = useCallback((data: any[], template: Template): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    template.fields.filter(f => f.required).forEach(field => {
      const hasData = data.some(row => row[field.name] && row[field.name].toString().trim());
      if (!hasData) {
        errors.push(`Champ requis manquant: ${field.name}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }, []);

  return {
    mappedData,
    suggestedTemplate,
    templates: PLATFORM_TEMPLATES,
    mapToTemplate,
    analyzeAndSuggestTemplate,
    autoMapFields,
    validateMapping
  };
};
