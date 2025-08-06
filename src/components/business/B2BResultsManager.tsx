import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckSquare, 
  Square, 
  Database, 
  Mail, 
  Phone, 
  MessageSquare, 
  Users, 
  Building2,
  MapPin,
  Globe,
  Download,
  Sparkles,
  Target,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SaveToProspectsModal } from './SaveToProspectsModal';
import { CreateCampaignModal } from './CreateCampaignModal';
import { LeadQualificationModal } from './LeadQualificationModal';

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

interface B2BResultsManagerProps {
  contacts: B2BContact[];
  onExport: () => void;
  searchSessionId: string;
}

export const B2BResultsManager: React.FC<B2BResultsManagerProps> = ({
  contacts,
  onExport,
  searchSessionId
}) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showQualificationModal, setShowQualificationModal] = useState(false);
  const [qualificationType, setQualificationType] = useState<'sms' | 'email' | 'whatsapp'>('email');
  const { toast } = useToast();

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(contact => contact.id));
    }
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const getSelectedContactsData = () => {
    return contacts.filter(contact => selectedContacts.includes(contact.id));
  };

  const extractPhoneNumbers = () => {
    const selectedContactsData = getSelectedContactsData();
    const phoneNumbers = selectedContactsData
      .filter(contact => contact.phone && contact.phone.trim() !== '')
      .map(contact => contact.phone);
    
    return phoneNumbers;
  };

  const extractEmails = () => {
    const selectedContactsData = getSelectedContactsData();
    const emails = selectedContactsData
      .filter(contact => contact.email && contact.email.trim() !== '')
      .map(contact => contact.email);
    
    return emails;
  };

  const handleSaveToProspects = () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un contact",
        variant: "destructive",
      });
      return;
    }
    setShowSaveModal(true);
  };

  const handleCreateCampaign = () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un contact",
        variant: "destructive",
      });
      return;
    }
    setShowCampaignModal(true);
  };

  const handleQualification = (type: 'sms' | 'email' | 'whatsapp') => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un contact",
        variant: "destructive",
      });
      return;
    }

    const selectedData = getSelectedContactsData();
    
    if (type === 'email') {
      const emailCount = selectedData.filter(c => c.email && c.email.trim() !== '').length;
      if (emailCount === 0) {
        toast({
          title: "Aucun email",
          description: "Aucun contact sélectionné n'a d'adresse email",
          variant: "destructive",
        });
        return;
      }
    } else {
      const phoneCount = selectedData.filter(c => c.phone && c.phone.trim() !== '').length;
      if (phoneCount === 0) {
        toast({
          title: "Aucun téléphone",
          description: "Aucun contact sélectionné n'a de numéro de téléphone",
          variant: "destructive",
        });
        return;
      }
    }

    setQualificationType(type);
    setShowQualificationModal(true);
  };

  const isAllSelected = selectedContacts.length === contacts.length && contacts.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Gestion des Résultats B2B
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="bg-green-600">
                {contacts.length} contacts trouvés
              </Badge>
              <Badge variant="outline">
                {selectedContacts.length} sélectionnés
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Button>
            
            <Button
              onClick={handleSaveToProspects}
              disabled={selectedContacts.length === 0}
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Sauvegarder dans Prospects
            </Button>
            
            <Button
              onClick={handleCreateCampaign}
              disabled={selectedContacts.length === 0}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Créer une Campagne
            </Button>
            
            <Button
              onClick={onExport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
            
            <Button
              onClick={() => handleQualification('email')}
              disabled={selectedContacts.length === 0}
              variant="default"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <Sparkles className="w-4 h-4" />
              Qualification IA
            </Button>
          </div>

          {/* Lead Qualification Section */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Qualification Intelligente des Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => handleQualification('email')}
                  disabled={selectedContacts.length === 0}
                  variant="outline"
                  className="flex items-center gap-2 h-auto p-4 flex-col"
                >
                  <Mail className="w-6 h-6 text-blue-600" />
                  <div className="text-center">
                    <p className="font-medium">Qualification Email</p>
                    <p className="text-xs text-gray-600">{extractEmails().length} emails détectés</p>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleQualification('sms')}
                  disabled={selectedContacts.length === 0}
                  variant="outline"
                  className="flex items-center gap-2 h-auto p-4 flex-col"
                >
                  <Phone className="w-6 h-6 text-green-600" />
                  <div className="text-center">
                    <p className="font-medium">Qualification SMS</p>
                    <p className="text-xs text-gray-600">{extractPhoneNumbers().length} téléphones détectés</p>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleQualification('whatsapp')}
                  disabled={selectedContacts.length === 0}
                  variant="outline"
                  className="flex items-center gap-2 h-auto p-4 flex-col"
                >
                  <MessageSquare className="w-6 h-6 text-green-500" />
                  <div className="text-center">
                    <p className="font-medium">Qualification WhatsApp</p>
                    <p className="text-xs text-gray-600">{extractPhoneNumbers().length} téléphones détectés</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Liste des Contacts ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nom entreprise</TableHead>
                  <TableHead>Secteur</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>lien Google Maps</TableHead>
                  <TableHead>Site web / Facebook</TableHead>
                  <TableHead>Instagram</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow 
                    key={contact.id}
                    className={selectedContacts.includes(contact.id) ? 'bg-blue-50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={() => handleSelectContact(contact.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{contact.companyName}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{contact.industry}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3" />
                        {contact.phone || ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{contact.location}</p>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <a 
                          href={`https://maps.google.com/?q=${encodeURIComponent(contact.location)}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          Maps
                        </a>
                      </Button>
                    </TableCell>
                    <TableCell>
                      {contact.linkedinUrl && contact.linkedinUrl.trim() !== '' && !contact.linkedinUrl.includes('linkedin.com/in/') ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer">
                            <Globe className="w-3 h-3 mr-1" />
                            Site web
                          </a>
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">-</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Summary */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Analyse des Données
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{contacts.length}</p>
              <p className="text-sm text-gray-600">Contacts total</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <Mail className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{extractEmails().length}</p>
              <p className="text-sm text-gray-600">Emails disponibles</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg text-center">
              <Phone className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">{extractPhoneNumbers().length}</p>
              <p className="text-sm text-gray-600">Téléphones disponibles</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <Building2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{new Set(contacts.map(c => c.companyName)).size}</p>
              <p className="text-sm text-gray-600">Entreprises uniques</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <SaveToProspectsModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        selectedBusinesses={getSelectedContactsData().map(contact => ({
          id: contact.id,
          name: contact.name,
          companyName: contact.companyName,
          category: contact.industry,
          address: contact.location,
          phone: contact.phone,
          website: contact.linkedinUrl,
          email: contact.email,
          rating: 0,
          reviewCount: 0,
          hours: '',
          priceRange: '',
          distance: '',
          coordinates: contact.coordinates,
          jobTitle: contact.jobTitle,
          linkedinUrl: contact.linkedinUrl,
          industry: contact.industry,
          companySize: contact.companySize
        }))}
        searchSessionId={searchSessionId}
      />

      <CreateCampaignModal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        selectedContacts={getSelectedContactsData()}
      />

      <LeadQualificationModal
        isOpen={showQualificationModal}
        onClose={() => setShowQualificationModal(false)}
        selectedContacts={getSelectedContactsData()}
        qualificationType={qualificationType}
      />
    </div>
  );
};