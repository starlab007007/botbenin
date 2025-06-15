
import React, { useState, useMemo } from 'react';
import { ContactList } from './ContactList';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

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

interface PaginatedContactListProps {
  contacts: ContactInfo[];
  isLoading: boolean;
  onContactUser: (contact: ContactInfo) => void;
  searchTerm: string;
  filterStatus: string;
}

const PAGE_SIZE = 10;

export const PaginatedContactList: React.FC<PaginatedContactListProps> = ({
  contacts,
  isLoading,
  onContactUser,
  searchTerm,
  filterStatus
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrer les contacts selon les critères
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = contact.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contact.user_email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || contact.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [contacts, searchTerm, filterStatus]);

  // Calculer la pagination
  const totalPages = Math.ceil(filteredContacts.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const currentContacts = filteredContacts.slice(startIndex, endIndex);

  // Réinitialiser la page quand les filtres changent
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

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
          Affichage {startIndex + 1}-{Math.min(endIndex, filteredContacts.length)} sur {filteredContacts.length} contacts
        </span>
        <span>
          Page {currentPage} sur {totalPages}
        </span>
      </div>

      {/* Liste des contacts */}
      <ContactList
        contacts={currentContacts}
        isLoading={isLoading}
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
