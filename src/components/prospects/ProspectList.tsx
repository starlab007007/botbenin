
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar";
import { Mail, Phone, Building, Calendar, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ProspectListProps {
  searchTerm: string;
}

export const ProspectList: React.FC<ProspectListProps> = ({ searchTerm }) => {
  // Mock data - replace with actual data from Supabase
  const mockProspects = [
    {
      id: '1',
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '+33 6 12 34 56 78',
      company: 'Tech Solutions',
      position: 'Directeur Marketing',
      status: 'qualified',
      score: 85,
      lastContact: '2024-01-15',
      tags: ['VIP', 'Marketing'],
    },
    {
      id: '2',
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie.martin@example.com',
      phone: '+33 6 98 76 54 32',
      company: 'Innovation Corp',
      position: 'CEO',
      status: 'new',
      score: 70,
      lastContact: '2024-01-10',
      tags: ['CEO', 'Tech'],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'secondary';
      case 'qualified': return 'default';
      case 'contacted': return 'outline';
      case 'converted': return 'success';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Nouveau';
      case 'qualified': return 'Qualifié';
      case 'contacted': return 'Contacté';
      case 'converted': return 'Converti';
      default: return status;
    }
  };

  const filteredProspects = mockProspects.filter(prospect =>
    prospect.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prospect.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prospect.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prospect.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {filteredProspects.map((prospect) => (
        <Card key={prospect.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <Avatar>
                  <AvatarFallback>
                    <AvatarInitials name={`${prospect.firstName} ${prospect.lastName}`} />
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-lg">
                      {prospect.firstName} {prospect.lastName}
                    </h3>
                    <Badge variant={getStatusColor(prospect.status)}>
                      {getStatusLabel(prospect.status)}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Score: {prospect.score}/100
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Building className="w-4 h-4" />
                      <span>{prospect.company} - {prospect.position}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Mail className="w-4 h-4" />
                      <span>{prospect.email}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4" />
                      <span>{prospect.phone}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Dernier contact: {prospect.lastContact}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1 mt-2">
                    {prospect.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Modifier</DropdownMenuItem>
                  <DropdownMenuItem>Contacter</DropdownMenuItem>
                  <DropdownMenuItem>Voir l'historique</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Supprimer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
