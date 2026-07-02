import React from "react";
import { AgentsSection } from "@/components/whatsapp/agents/AgentsSection";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Bot } from "lucide-react";

const AiAgentsListPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Bot className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Connectez-vous pour voir vos agents IA et leurs conversations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-green-600" />
          Mes Bots — Agents IA
        </h1>
        <p className="text-sm text-muted-foreground">
          Liste de vos agents IA, avec accès direct aux conversations en cours et aux statistiques.
        </p>
      </div>
      <AgentsSection />
    </div>
  );
};

export default AiAgentsListPage;
