
import React from 'react';
import { AdminProvider } from '@/contexts/AdminContext';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const AdminPage: React.FC = () => {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminDashboard />
        </div>
      </div>
    </AdminProvider>
  );
};
