import { useNavigate, useParams } from "react-router-dom";
import { BarChart3, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AgentInsightsDialog } from "@/components/whatsapp/agents/AgentInsightsDialog";
import { useAiAgents } from "@/hooks/useAiAgents";

export default function WaouhAgentInsightsPage() {
  const { agentId = "" } = useParams();
  const navigate = useNavigate();
  const { agents, loading } = useAiAgents();
  const agent = agents.find((item) => item.id === agentId);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 p-6 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-bold">Agent introuvable</h1>
        <p className="text-sm text-muted-foreground">Cet agent n’est pas accessible avec votre compte.</p>
        <Button onClick={() => navigate("/app/agents")}>Retour aux Agents IA</Button>
      </div>
    );
  }

  return <AgentInsightsDialog agent={agent} onClose={() => navigate("/app/agents")} />;
}
