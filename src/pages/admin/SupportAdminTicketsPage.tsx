import React, { useMemo, useState } from 'react';
import { Helmet } from '@/components/SEO';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { TicketCard } from '@/components/support/TicketCard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, TicketIcon } from 'lucide-react';

const SupportAdminTicketsPage: React.FC = () => {
  const { tickets, loading } = useSupportTickets({ adminMode: true });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [severity, setSeverity] = useState<string>('all');

  const filtered = useMemo(() => tickets.filter((t) => {
    if (status !== 'all' && t.status !== status) return false;
    if (severity !== 'all' && t.severity !== severity) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return t.title.toLowerCase().includes(s) || t.ticket_number.toLowerCase().includes(s) || (t.module ?? '').toLowerCase().includes(s);
    }
    return true;
  }), [tickets, status, severity, search]);

  return (
    <>
      <Helmet><title>Tous les tickets — Admin | SIGDSTS</title></Helmet>
      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-7xl">
        <h1 className="text-2xl lg:text-3xl font-bold mb-1">Tous les tickets</h1>
        <p className="text-sm text-muted-foreground mb-5">{tickets.length} ticket(s) au total</p>

        <Card className="p-3 mb-4 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="ouvert">Ouvert</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="resolu">Résolu</SelectItem>
              <SelectItem value="clos">Clos</SelectItem>
              <SelectItem value="escalade_n3">Escalade N3</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sévérités</SelectItem>
              <SelectItem value="critique">Critique</SelectItem>
              <SelectItem value="majeure">Majeure</SelectItem>
              <SelectItem value="mineure">Mineure</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <TicketIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun ticket</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t) => <TicketCard key={t.id} ticket={t} basePath="/support/admin/tickets" />)}
          </div>
        )}
      </div>
    </>
  );
};

export default SupportAdminTicketsPage;
