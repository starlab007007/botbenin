export interface KnowledgeField {
  name: string;
  type: 'text' | 'number' | 'phone' | 'email' | 'url' | 'date' | 'time' | 'datetime' | 'price' | 'image' | 'file' | 'address' | 'select' | 'multiselect' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  description?: string;
}

export interface KnowledgeTable {
  id: string;
  name: string;
  description: string;
  fields: KnowledgeField[];
  required: boolean;
  icon: string;
  sampleData?: Record<string, any>[];
}

export interface StructuralField {
  name: string;
  type: string;
  category: 'contact' | 'hours' | 'policy' | 'location' | 'faq';
  required: boolean;
  description: string;
  placeholder?: string;
}

export interface KnowledgeBaseTemplate {
  id: string;
  sector: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  structuralInfo: StructuralField[];
  tables: KnowledgeTable[];
}

export interface KnowledgeBase {
  id: string;
  user_id: string;
  name: string;
  sector: string;
  template_id: string;
  description?: string;
  data: Record<string, any[]>;
  structural_info: Record<string, any>;
  is_active: boolean;
  completion_percentage: number;
  last_trained_at?: string;
  bot_id?: string;
  created_at: string;
  updated_at: string;
}
