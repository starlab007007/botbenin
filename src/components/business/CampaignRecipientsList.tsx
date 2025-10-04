import React, { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Building2,
  MapPin,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  trackingParameters?: any;
}

interface CampaignRecipientsListProps {
  campaign: Campaign;
}

export const CampaignRecipientsList: React.FC<CampaignRecipientsListProps> = ({ campaign }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  // Récupérer les contacts depuis trackingParameters
  const recipients = useMemo(() => {
    const contacts = campaign.trackingParameters?.targetContacts || [];
    return contacts.filter((contact: any) => 
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [campaign.trackingParameters, searchTerm]);

  const stats = useMemo(() => {
    const total = recipients.length;
    const sent = recipients.filter((r: any) => r.status === 'sent').length;
    const opened = recipients.filter((r: any) => r.status === 'opened').length;
    const clicked = recipients.filter((r: any) => r.status === 'clicked').length;
    const pending = recipients.filter((r: any) => !r.status || r.status === 'pending').length;
    
    return { total, sent, opened, clicked, pending };
  }, [recipients]);

  return (
    <div className="space-y-6">
      {/* Statistiques des destinataires */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-700 font-medium">Envoyés</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{stats.sent}</p>
        </Card>

        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-purple-700 font-medium">Ouverts</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{stats.opened}</p>
        </Card>

        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-orange-700 font-medium">Cliqués</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">{stats.clicked}</p>
        </Card>

        <Card className="p-4 bg-gray-50 border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-700 font-medium">En attente</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
        </Card>
      </div>

      {/* Barre de recherche */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            Exporter la liste
          </Button>
        </div>
      </Card>

      {/* Liste des destinataires */}
      <div className="space-y-3">
        {recipients.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">
              {searchTerm ? "Aucun contact trouvé" : "Aucun destinataire dans cette campagne"}
            </p>
          </Card>
        ) : (
          recipients.map((recipient: any, index: number) => {
            const status = recipient.status || 'pending';
            const statusConfig = {
              sent: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Envoyé' },
              opened: { icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Ouvert' },
              clicked: { icon: CheckCircle2, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Cliqué' },
              failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Échec' },
              pending: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', label: 'En attente' }
            };

            const StatusIcon = statusConfig[status as keyof typeof statusConfig]?.icon || Clock;
            const statusColor = statusConfig[status as keyof typeof statusConfig]?.color || 'text-gray-600';
            const statusBg = statusConfig[status as keyof typeof statusConfig]?.bg || 'bg-gray-50';
            const statusLabel = statusConfig[status as keyof typeof statusConfig]?.label || 'En attente';

            return (
              <Card key={index} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* En-tête du contact */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">{recipient.name}</h4>
                        <p className="text-sm text-gray-600">{recipient.jobTitle}</p>
                      </div>
                      <Badge className={`${statusBg} ${statusColor} flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusLabel}
                      </Badge>
                    </div>

                    {/* Informations du contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="w-4 h-4" />
                        <span>{recipient.companyName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Briefcase className="w-4 h-4" />
                        <span>{recipient.industry}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{recipient.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{recipient.location}</span>
                      </div>
                    </div>

                    {/* Message personnalisé */}
                    {recipient.personalizedMessage && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Voir le message personnalisé
                        </summary>
                        <div className="mt-2 bg-gray-50 p-3 rounded text-sm">
                          <div className="font-medium mb-1">Objet: {recipient.personalizedSubject}</div>
                          <div className="whitespace-pre-wrap text-gray-700">
                            {recipient.personalizedMessage}
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};