
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter, Users, Database } from 'lucide-react';
import { ProspectList } from "@/components/prospects/ProspectList";
import { ProspectDatabaseList } from "@/components/prospects/ProspectDatabaseList";
import { CreateProspectModal } from "@/components/prospects/CreateProspectModal";
import { CreateDatabaseModal } from "@/components/prospects/CreateDatabaseModal";

export const ProspectsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateProspectOpen, setIsCreateProspectOpen] = useState(false);
  const [isCreateDatabaseOpen, setIsCreateDatabaseOpen] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Prospects</h1>
          <p className="text-muted-foreground">Gérez vos prospects et bases de données</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDatabaseOpen(true)} variant="outline">
            <Database className="w-4 h-4 mr-2" />
            Nouvelle Base
          </Button>
          <Button onClick={() => setIsCreateProspectOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Prospect
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+20% ce mois</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
            <Badge variant="secondary">New</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">Cette semaine</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualifiés</CardTitle>
            <Badge variant="default">Qualified</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">+5% ce mois</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bases de données</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Actives</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des prospects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filtres
        </Button>
      </div>

      <Tabs defaultValue="prospects" className="w-full">
        <TabsList>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="databases">Bases de données</TabsTrigger>
        </TabsList>
        
        <TabsContent value="prospects" className="space-y-4">
          <ProspectList searchTerm={searchTerm} />
        </TabsContent>
        
        <TabsContent value="databases" className="space-y-4">
          <ProspectDatabaseList />
        </TabsContent>
      </Tabs>

      <CreateProspectModal 
        isOpen={isCreateProspectOpen} 
        onClose={() => setIsCreateProspectOpen(false)} 
      />
      
      <CreateDatabaseModal 
        isOpen={isCreateDatabaseOpen} 
        onClose={() => setIsCreateDatabaseOpen(false)} 
      />
    </div>
  );
};
