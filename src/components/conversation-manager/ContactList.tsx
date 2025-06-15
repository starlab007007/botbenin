
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Users, Calendar, Activity, Mail } from 'lucide-react';

interface ContactInfo {
  user_id: string;
  user_name: string;
  user_email: string;
  session_count: number;
  message_count: number;
  first_interaction: string;
  last_interaction: string;
  status: 'active' | 'inactive';
}

interface ContactListProps {
  contacts: ContactInfo[];
  isLoading: boolean;
  onContactUser: (contact: ContactInfo) => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  isLoading,
  onContactUser
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun contact trouvé
          </h3>
          <p className="text-gray-600 text-sm">
            Aucun contact ne correspond à vos critères de recherche.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact) => (
        <Card key={contact.user_id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  contact.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <User className={`w-5 h-5 ${
                    contact.status === 'active' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm break-words">
                      {contact.user_name}
                    </h3>
                    <Badge variant={contact.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {contact.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-xs mb-2 break-all">{contact.user_email}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-gray-500">Sessions:</span>
                      <span className="ml-2 font-medium">{contact.session_count}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Messages:</span>
                      <span className="ml-2 font-medium">{contact.message_count}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Premier: {new Date(contact.first_interaction).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span>Dernier: {new Date(contact.last_interaction).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              
              <Button
                onClick={() => onContactUser(contact)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contacter
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
