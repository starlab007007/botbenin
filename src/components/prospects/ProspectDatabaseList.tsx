
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Users, Calendar, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const ProspectDatabaseList: React.FC = () => {
  // Mock data - replace with actual data from Supabase
  const mockDatabases = [
    {
      id: '1',
      name: 'Prospects Tech 2024',
      description: 'Base de prospects du secteur technologique',
      prospectCount: 245,
      isActive: true,
      createdAt: '2024-01-01',
      lastUpdated: '2024-01-15',
    },
    {
      id: '2',
      name: 'Leads Marketing Digital',
      description: 'Prospects intéressés par le marketing digital',
      prospectCount: 89,
      isActive: true,
      createdAt: '2024-01-10',
      lastUpdated: '2024-01-14',
    },
    {
      id: '3',
      name: 'Archive Q4 2023',
      description: 'Anciens prospects Q4 2023',
      prospectCount: 156,
      isActive: false,
      createdAt: '2023-10-01',
      lastUpdated: '2023-12-31',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {mockDatabases.map((database) => (
        <Card key={database.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <CardTitle className="text-lg">{database.name}</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={database.isActive ? "default" : "secondary"}>
                {database.isActive ? 'Actif' : 'Inactif'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Modifier</DropdownMenuItem>
                  <DropdownMenuItem>Exporter</DropdownMenuItem>
                  <DropdownMenuItem>Dupliquer</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Supprimer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{database.description}</p>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{database.prospectCount} prospects</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{database.lastUpdated}</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1">
                Voir les prospects
              </Button>
              <Button size="sm" className="flex-1">
                Gérer
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
