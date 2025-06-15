
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface ConversationFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterBot: string;
  onFilterBotChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  activeTab: string;
  availableBots: {id: string, name: string}[];
}

export const ConversationFilters: React.FC<ConversationFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filterBot,
  onFilterBotChange,
  filterStatus,
  onFilterStatusChange,
  activeTab,
  availableBots
}) => {
  return (
    <Card className="mb-4">
      <CardContent className="p-3">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher utilisateurs, emails, bots..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-full text-sm"
            />
          </div>
          
          {activeTab === 'conversations' ? (
            <Select value={filterBot} onValueChange={onFilterBotChange}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Filtrer par bot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les bots</SelectItem>
                {availableBots.map(bot => (
                  <SelectItem key={bot.id} value={bot.id}>{bot.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={filterStatus} onValueChange={onFilterStatusChange}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
