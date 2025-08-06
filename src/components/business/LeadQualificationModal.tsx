import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { EnhancedLeadQualificationModal } from './EnhancedLeadQualificationModal';
import { 
  Loader2, 
  Mail, 
  Phone, 
  MessageSquare, 
  Users, 
  Target, 
  Sparkles,
  CheckCircle,
  AlertCircle,
  Send,
  Zap
} from 'lucide-react';

interface B2BContact {
  id: string;
  name: string;
  companyName: string;
  jobTitle: string;
  location: string;
  linkedinUrl: string;
  email: string;
  phone: string;
  industry: string;
  companySize: string;
  coordinates?: [number, number];
}

interface LeadQualificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: B2BContact[];
  qualificationType: 'sms' | 'email' | 'whatsapp';
}

const EMAIL_TEMPLATES = [
  {
    id: 'qualification-simple',
    name: 'Qualification Simple',
    subject: 'Êtes-vous intéressé(e) par nos solutions ?',
    template: `Bonjour {name},

Nous avons identifié {companyName} comme une entreprise qui pourrait bénéficier de nos solutions.

Pouvez-vous me confirmer si vous seriez intéressé(e) par :
- Une présentation de 15 minutes de nos services
- L'envoi d'une documentation détaillée
- Un audit gratuit de vos besoins

Merci de répondre simplement par OUI ou NON.

Cordialement,`
  },
  {
    id: 'qualification-budget',
    name: 'Qualification Budget',
    subject: 'Évaluation rapide de vos besoins',
    template: `Bonjour {name},

Nous proposons des solutions adaptées aux entreprises du secteur {industry}.

Pour vous proposer la meilleure approche, pourriez-vous nous indiquer :
1. Votre budget annuel pour ce type de solution (< 5K€, 5-15K€, > 15K€)
2. Votre échéance de décision (3 mois, 6 mois, 12 mois)
3. Votre niveau d'urgence (faible, moyen, élevé)

Réponse attendue : quelques mots suffisent.

Merci,`
  }
];

const SMS_TEMPLATES = [
  {
    id: 'sms-quick',
    name: 'SMS Rapide',
    template: 'Bonjour {name}, {companyName} pourrait bénéficier de nos solutions. Intéressé(e) ? Répondez OUI/NON. Merci!'
  },
  {
    id: 'sms-meeting',
    name: 'SMS Rendez-vous',
    template: 'Bonjour {name} de {companyName}, je peux vous présenter nos solutions en 15min. Disponible cette semaine ? Répondez OUI/NON.'
  }
];

const WHATSAPP_TEMPLATES = [
  {
    id: 'whatsapp-intro',
    name: 'Introduction WhatsApp',
    template: `Bonjour {name} 👋

Je vous contacte car {companyName} pourrait être intéressée par nos solutions pour le secteur {industry}.

Seriez-vous disponible pour un échange rapide de 10 minutes ?

Merci ! 🙂`
  },
  {
    id: 'whatsapp-demo',
    name: 'Démonstration WhatsApp',
    template: `Bonjour {name},

Nous avons développé une solution spécialement pour les entreprises comme {companyName}.

Puis-je vous envoyer une démonstration vidéo de 3 minutes ?

C'est gratuit et sans engagement 😊`
  }
];

export const LeadQualificationModal: React.FC<LeadQualificationModalProps> = ({
  isOpen,
  onClose,
  selectedContacts,
  qualificationType
}) => {
  // Utiliser directement le modal amélioré avec bots automatisés pour la qualification depuis les résultats de recherche
  return (
    <EnhancedLeadQualificationModal
      isOpen={isOpen}
      onClose={onClose}
      selectedContacts={selectedContacts}
      qualificationType={qualificationType}
    />
  );
};