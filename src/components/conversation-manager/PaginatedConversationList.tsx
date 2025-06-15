
import React, { useState, useMemo } from 'react';
import { ConversationList } from './ConversationList';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface BotConversation {
  bot_id: string;
  bot_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  session_id: string;
  total_messages: number;
  last_message_at: string;
  last_message_content: string;
  session_start: string;
  is_active: boolean;
}

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

interface PaginatedConversationListProps {
  conversations: BotConversation[];
  isLoading: boolean;
  onViewConversation: (conversation: BotConversation) => void;
  onContactUser: (contact: ContactInfo) => void;
  searchTerm: string;
  filterBot: string;
}

const PAGE_SIZE = 10;

export const PaginatedConversationList: React.FC<PaginatedConversationListProps> = ({
  conversations,
  isLoading,
  onViewConversation,
  onContactUser,
  searchTerm,
  filterBot
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrer les conversations selon les critères
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const matchesSearch = conv.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           conv.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           conv.bot_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBot = filterBot === 'all' || conv.bot_id === filterBot;
      return matchesSearch && matchesBot;
    });
  }, [conversations, searchTerm, filterBot]);

  // Calculer la pagination
  const totalPages = Math.ceil(filteredConversations.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const currentConversations = filteredConversations.slice(startIndex, endIndex);

  // Réinitialiser la page quand les filtres changent
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBot]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll vers le haut de la liste
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Informations de pagination */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          Affichage {startIndex + 1}-{Math.min(endIndex, filteredConversations.length)} sur {filteredConversations.length} conversations
        </span>
        <span>
          Page {currentPage} sur {totalPages}
        </span>
      </div>

      {/* Liste des conversations */}
      <ConversationList
        conversations={currentConversations}
        isLoading={isLoading}
        onViewConversation={onViewConversation}
        onContactUser={onContactUser}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {generatePageNumbers().map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => handlePageChange(pageNum)}
                  isActive={currentPage === pageNum}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};
