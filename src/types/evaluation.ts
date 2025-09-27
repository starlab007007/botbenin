export interface ProspectData {
  id: string;
  contact_name: string;
  company_name: string;
  linkedin_url?: string;
  website?: string;
  [key: string]: any;
}

export interface EvaluationAnalysis {
  relevance_score: number;
  opportunity_level: 'high' | 'medium' | 'low';
  key_insights: string[];
  discussion_points: string[];
  approach_strategy: string;
  call_recommendations: string[];
}

export interface EvaluationDocuments {
  google_doc_url?: string;
  pdf_url?: string;
  summary_doc?: string;
}

export interface EvaluationMetadata {
  generated_at: string;
  processing_time: number;
  data_sources: string[];
}

export interface EvaluationResult {
  id: string;
  prospect: ProspectData;
  analysis: EvaluationAnalysis;
  documents: EvaluationDocuments;
  metadata: EvaluationMetadata;
  status: 'completed' | 'processing' | 'error';
  version?: number; // Pour l'historique des évaluations
}

export interface EvaluationHistory {
  prospectId: string;
  evaluations: EvaluationResult[];
  currentEvaluation?: EvaluationResult;
  lastEvaluatedAt?: string;
}

export interface WebhookConfig {
  url: string;
  isActive: boolean;
  name: string;
}