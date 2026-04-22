import React from 'react';
import { Helmet } from '@/components/SEO';
import { AdminDashboard } from '@/components/support/AdminDashboard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Tickets, BookOpen } from 'lucide-react';

const SupportAdminDashboardPage: React.FC = () => {
  return (
    <>
      <Helmet><title>Dashboard Support — Administrateur | SIGDSTS</title></Helmet>
      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Dashboard Support — Temps réel</h1>
            <p className="text-sm text-muted-foreground">Monitoring des tickets, SLA et performance du chatbot N1</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/support/admin/tickets"><Tickets className="w-4 h-4 mr-2" /> Tous les tickets</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/support/admin/knowledge"><BookOpen className="w-4 h-4 mr-2" /> Base de connaissances</Link>
            </Button>
          </div>
        </div>
        <AdminDashboard />
      </div>
    </>
  );
};

export default SupportAdminDashboardPage;
