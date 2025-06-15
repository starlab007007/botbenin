
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface LastActivityCardProps {
  lastActivity: string | null;
}

export const LastActivityCard: React.FC<LastActivityCardProps> = ({
  lastActivity
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        <span>Dernière activité</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="text-lg font-semibold text-gray-900">
          {lastActivity 
            ? new Date(lastActivity).toLocaleString('fr-FR')
            : 'Aucune activité'
          }
        </div>
        <p className="text-gray-600 text-sm">
          {lastActivity 
            ? 'Dernière interaction utilisateur enregistrée'
            : 'Aucune interaction utilisateur détectée'
          }
        </p>
      </div>
    </CardContent>
  </Card>
);
