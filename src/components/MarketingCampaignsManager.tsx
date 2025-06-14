
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit3 } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  segment: any;
  results: any;
}

export const MarketingCampaignsManager: React.FC = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<Partial<Campaign>>({
    name: "",
    type: "",
    status: "draft",
    start_date: "",
    end_date: ""
  });

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les campagnes", variant: "destructive" });
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Ensure required fields are present
    const { name, type, status, start_date, end_date, segment, results } = form;
    if (!name || !type || !status || !start_date) {
      toast({ title: "Erreur", description: "Nom, type, statut et date de début requis.", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (editing) {
      const { error } = await supabase
        .from("campaigns")
        .update({
          name,
          type,
          status,
          start_date,
          end_date: end_date || null,
          segment: segment ?? {},
          results: results ?? {},
          updated_at: new Date().toISOString()
        })
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Erreur", description: "Échec lors de la mise à jour", variant: "destructive" });
      } else {
        toast({ title: "Mis à jour", description: "Campagne modifiée" });
        setShowForm(false);
        setEditing(null);
        fetchCampaigns();
      }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        toast({ title: "Erreur", description: "Utilisateur non authentifié", variant: "destructive" });
        setLoading(false);
        return;
      }
      // Explicitly provide all required fields
      const insertObj = {
        user_id: userId,
        name,
        type,
        status,
        start_date,
        end_date: end_date || null,
        segment: segment ?? {},
        results: results ?? {},
      };
      const { error } = await supabase
        .from("campaigns")
        .insert([insertObj]);
      if (error) {
        toast({ title: "Erreur", description: "Échec lors de la création", variant: "destructive" });
      } else {
        toast({ title: "Succès", description: "Campagne créée" });
        setShowForm(false);
        fetchCampaigns();
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette campagne ?")) return;
    setLoading(true);
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: "Suppression échouée", variant: "destructive" });
    } else {
      toast({ title: "Supprimé", description: "Campagne supprimée" });
      fetchCampaigns();
    }
    setLoading(false);
  };

  const openEdit = (item: Campaign) => { setEditing(item); setForm(item); setShowForm(true); };
  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", type: "", status: "draft", start_date: "", end_date: "" });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-bold">Campagnes Marketing</h2>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nouvelle campagne</Button>
      </div>
      {showForm && (
        <Card className="p-6 mb-4 max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold">Nom*</label>
              <Input name="name" value={form.name || ""} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="block text-xs">Type*</label>
              <Input name="type" value={form.type || ""} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="block text-xs">Statut</label>
              <select name="status" value={form.status || "draft"} onChange={handleInputChange} className="w-full border rounded py-2 px-2">
                {["draft", "scheduled", "running", "paused", "finished"].map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs">Début</label>
                <Input type="date" name="start_date" value={form.start_date || ""} onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-xs">Fin</label>
                <Input type="date" name="end_date" value={form.end_date || ""} onChange={handleInputChange} />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>{editing ? "Mettre à jour" : "Ajouter"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Annuler</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map(campaign => (
          <Card key={campaign.id} className="p-4 group relative">
            <div className="flex justify-between items-center mb-1">
              <div className="font-semibold text-gray-900">{campaign.name}</div>
              <div className={`text-xs px-2 py-0.5 rounded
                ${campaign.status === "draft" ? "bg-gray-100 text-gray-700"
                  : campaign.status === "running" ? "bg-green-100 text-green-700"
                  : campaign.status === "scheduled" ? "bg-blue-100 text-blue-700"
                  : campaign.status === "finished" ? "bg-purple-100 text-purple-700"
                  : "bg-orange-100 text-orange-700"}`}>{campaign.status}
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-1">Type: <span>{campaign.type}</span></div>
            <div className="text-xs mb-1">
              {campaign.start_date && <>Débute: <span>{campaign.start_date}</span>{" | "}</>}
              {campaign.end_date && <>Termine: <span>{campaign.end_date}</span></>}
            </div>
            <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition">
              <Button onClick={() => openEdit(campaign)} size="icon" variant="ghost"><Edit3 className="w-4 h-4" /></Button>
              <Button onClick={() => handleDelete(campaign.id)} size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-red-400" /></Button>
            </div>
          </Card>
        ))}
      </div>
      {loading && <div className="text-gray-400 mt-4">Chargement…</div>}
      {!loading && campaigns.length === 0 && <div className="text-sm text-gray-500 mt-3">Aucune campagne trouvée.</div>}
    </div>
  );
};
// End of MarketingCampaignsManager.tsx
