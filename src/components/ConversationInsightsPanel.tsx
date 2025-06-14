import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Search } from "lucide-react";

interface Insight {
  id: string;
  type: string;
  summary: string;
  data: any;
  created_at: string;
}

export const ConversationInsightsPanel: React.FC = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("conversation_insights")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les insights", variant: "destructive" });
    } else {
      setInsights(data || []);
    }
    setLoading(false);
  };

  const filtered = insights.filter(i => i.type?.toLowerCase().includes(search.toLowerCase()) || i.summary?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          Insights Conversationnels
        </h2>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <Input
            placeholder="Recherche mot-clé ou type"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-56 pl-10"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(insight => (
          <Card key={insight.id} className="p-4">
            <div className="flex justify-between mb-2">
              <Badge className="bg-blue-50 text-blue-800">{insight.type}</Badge>
              <span className="text-xs text-gray-500">{new Date(insight.created_at).toLocaleString("fr-FR")}</span>
            </div>
            <div className="font-semibold text-sm mb-1">{insight.summary}</div>
            <div className="text-xs text-gray-700 mb-1">
              {insight.data && typeof insight.data === 'object'
                ? <pre className="overflow-auto max-h-40 bg-gray-50 rounded p-2 text-xs">{JSON.stringify(insight.data, null, 2)}</pre>
                : String(insight.data)}
            </div>
          </Card>
        ))}
      </div>
      {loading && <div className="text-gray-400 mt-4">Chargement…</div>}
      {!loading && filtered.length === 0 && <div className="text-sm text-gray-500 mt-3">Aucun insight trouvé.</div>}
    </div>
  );
};
