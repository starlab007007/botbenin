import React, { useMemo, useState } from 'react';
import { Helmet } from '@/components/SEO';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { TicketCard } from '@/components/support/TicketCard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Search, TicketIcon } from 'lucide-react';
import { TicketForm } from '@/components/support/TicketForm';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

const SupportTicketsPage: React.FC = () => {
  const { user } = useAuth();
  const { tickets, loading } = useSupportTickets();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [severity, setSeverity] = useState<string>('all');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (status !== 'all' && t.status !== status) return false;
      if (severity !== 'all' && t.severity !== severity) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        return t.title.toLowerCase().includes(s)
          || t.ticket_number.toLowerCase().includes(s)
          || (t.module ?? '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [tickets, status, severity, search]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <Card className="p-8 text-center">
          <TicketIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-xl font-bold mb-2">Connexion requise</h2>
          <p className="text-sm text-muted-foreground mb-4">Connectez-vous pour accéder à vos tickets de support.</p>
          <Button asChild><Link to="/auth">Se connecter</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mes tickets de support | SIGDSTS</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Mes tickets de support</h1>
            <p className="text-sm text-muted-foreground">Suivez l'état de vos demandes auprès du support N2</p>
          </div>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nouveau ticket</Button>
        </div>

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
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <TicketIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun ticket {tickets.length > 0 ? 'correspondant aux filtres' : 'pour le moment'}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((t) => <TicketCard key={t.id} ticket={t} />)}
          </div>
        )}

        <TicketForm open={open} onOpenChange={setOpen} />
      </div>
    </>
  );
};

export default SupportTicketsPage;
