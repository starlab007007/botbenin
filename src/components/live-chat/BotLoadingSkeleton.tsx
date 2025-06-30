
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const BotLoadingSkeleton: React.FC = () => {
  return (
    <div className="w-full py-8">
      <div className="text-center mb-4">
        <p className="text-gray-600">Chargement des assistants IA publics...</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white border border-gray-200 animate-pulse">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-24"></div>
                  <div className="h-3 bg-gray-300 rounded w-32"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-3 bg-gray-300 rounded w-full"></div>
                <div className="h-8 bg-gray-300 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
