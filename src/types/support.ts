export type TicketCategory = 'incident' | 'anomalie' | 'evolution' | 'question';
export type TicketSeverity = 'critique' | 'majeure' | 'mineure';
export type TicketStatus = 'ouvert' | 'en_cours' | 'resolu' | 'clos' | 'escalade_n3';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  assigned_to: string | null;
  category: TicketCategory;
  severity: TicketSeverity;
  status: TicketStatus;
  module: string | null;
  site: string | null;
  profile: string | null;
  title: string;
  description: string;
  reproduction_steps: string | null;
  attachments: any[];
  origin: 'manual' | 'chatbot_escalation';
  chatbot_session_id: string | null;
  sla_due_at: string | null;
  sla_breached: boolean;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  author_role: 'user' | 'support_agent' | 'admin' | 'system';
  message: string;
  attachments: any[];
  is_internal_note: boolean;
  created_at: string;
}

export interface SupportKnowledgeArticle {
  id: string;
  title: string;
  content: string;
  module: string | null;
  category: string | null;
  source: string | null;
  keywords: string[] | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const SIGDSTS_MODULES = [
  'Connexion',
  'Accueil Donneur',
  'Sélection Médicale',
  'Prélèvement',
  'Préparation PSL',
  'Qualification Biologique',
  'Tri & Validation',
  'Destruction Produit',
  'Stock & Transfert',
  'Distribution',
  'Administration',
  'Sécurité',
  'Autre',
] as const;

export const USER_PROFILES = [
  'Médecin',
  'Infirmier(e) (IDE)',
  'Technicien laboratoire',
  'Administrateur',
  'Point Focal ANTS',
  'Autre',
] as const;

export const SEVERITY_LABELS: Record<TicketSeverity, { label: string; color: string; sla: string }> = {
  critique: { label: 'Critique', color: 'bg-red-500 text-white', sla: '2h' },
  majeure: { label: 'Majeure', color: 'bg-orange-500 text-white', sla: '4h' },
  mineure: { label: 'Mineure', color: 'bg-blue-500 text-white', sla: '24h' },
};

export const STATUS_LABELS: Record<TicketStatus, { label: string; color: string }> = {
  ouvert: { label: 'Ouvert', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  en_cours: { label: 'En cours', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  resolu: { label: 'Résolu', color: 'bg-green-100 text-green-800 border-green-300' },
  clos: { label: 'Clos', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  escalade_n3: { label: 'Escalade N3', color: 'bg-purple-100 text-purple-800 border-purple-300' },
};
