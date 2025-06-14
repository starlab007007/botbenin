
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit3 } from "lucide-react";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  source: string;
  owner_id: string;
  notes: string;
  tags: string[];
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-700",
  converted: "bg-purple-100 text-purple-700",
  lost: "bg-red-100 text-red-700"
};

export const LeadsManager: React.FC = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<Partial<Lead>>({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    status: "new",
    source: "",
    notes: "",
    tags: []
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les leads", variant: "destructive" });
    } else {
      // Ensure that tags is always a string[]
      setLeads(
        (data || []).map((lead: any) => ({
          ...lead,
          tags: Array.isArray(lead.tags)
            ? lead.tags
            : typeof lead.tags === "string"
              ? []
              : Array.isArray(lead.tags)
                ? lead.tags
                : lead.tags && typeof lead.tags === "object" && lead.tags !== null && "length" in lead.tags
                  ? Array.from(lead.tags)
                  : []
        }))
      );
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Ensure required fields are present
    const { full_name, status, email, phone, company, source, notes, tags } = form;
    if (!full_name) {
      toast({ title: "Erreur", description: "Nom complet requis.", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (editingLead) {
      const { error } = await supabase
        .from("leads")
        .update({
          full_name,
          status: status ?? "new",
          email: email ?? "",
          phone: phone ?? "",
          company: company ?? "",
          source: source ?? "",
          notes: notes ?? "",
          tags: tags ?? [],
          updated_at: new Date().toISOString()
        })
        .eq("id", editingLead.id);
      if (error) {
        toast({ title: "Erreur", description: "Échec lors de la mise à jour", variant: "destructive" });
      } else {
        toast({ title: "Succès", description: "Lead mis à jour" });
        setShowForm(false);
        setEditingLead(null);
        fetchLeads();
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
        full_name,
        status: status ?? "new",
        email: email ?? "",
        phone: phone ?? "",
        company: company ?? "",
        source: source ?? "",
        notes: notes ?? "",
        tags: tags ?? []
      };
      const { error } = await supabase
        .from("leads")
        .insert([insertObj]);
      if (error) {
        toast({ title: "Erreur", description: "Échec lors de la création", variant: "destructive" });
      } else {
        toast({ title: "Succès", description: "Lead ajouté" });
        setShowForm(false);
        fetchLeads();
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce lead ?")) return;
    setLoading(true);
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: "Suppression échouée", variant: "destructive" });
    } else {
      toast({ title: "Supprimé", description: "Lead supprimé" });
      fetchLeads();
    }
    setLoading(false);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm(lead);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingLead(null);
    setForm({
      full_name: "",
      email: "",
      phone: "",
      company: "",
      status: "new",
      source: "",
      notes: "",
      tags: []
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-bold">Gestion des Leads (CRM)</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau lead
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-4 max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold">Nom complet*</label>
              <Input name="full_name" value={form.full_name || ""} onChange={handleInputChange} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs">Email</label>
                <Input type="email" name="email" value={form.email || ""} onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-xs">Téléphone</label>
                <Input name="phone" value={form.phone || ""} onChange={handleInputChange} />
              </div>
            </div>
            <div>
              <label className="block text-xs">Entreprise</label>
              <Input name="company" value={form.company || ""} onChange={handleInputChange} />
            </div>
            <div>
              <label className="block text-xs">Source</label>
              <Input name="source" value={form.source || ""} onChange={handleInputChange} />
            </div>
            <div>
              <label className="block text-xs">Statut</label>
              <select name="status" value={form.status || "new"} onChange={handleInputChange} className="w-full py-2 px-2 border rounded">
                {["new", "contacted", "qualified", "converted", "lost"].map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs">Tags (séparés par virgule)</label>
              <Input name="tags" value={(form.tags as string[])?.join(", ") || ""} onChange={handleTagInput} />
            </div>
            <div>
              <label className="block text-xs">Notes</label>
              <textarea name="notes" value={form.notes || ""} onChange={handleInputChange} className="w-full border rounded px-2 py-2" />
            </div>
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>{editingLead ? "Mettre à jour" : "Ajouter"}</Button>
              <Button type="button" onClick={() => { setShowForm(false); setEditingLead(null); }} variant="outline">Annuler</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.map(lead => (
          <Card key={lead.id} className="p-4 group relative">
            <div className="flex justify-between items-center mb-1">
              <div className="font-semibold text-gray-900">{lead.full_name}</div>
              <Badge className={statusColors[lead.status] || "bg-gray-100 text-gray-800"}>
                {lead.status}
              </Badge>
            </div>
            <div className="text-xs text-gray-600 mb-1">
              {lead.company && <span className="mr-2">{lead.company}</span>}
              {lead.email && <span className="mr-2">{lead.email}</span>}
              {lead.phone && <span>{lead.phone}</span>}
            </div>
            <div className="text-xs mb-1">{lead.source && <>Source: <span className="text-blue-700">{lead.source}</span></>}</div>
            {lead.tags && lead.tags.length > 0 && (
              <div className="text-xs space-x-1 mb-1">
                {lead.tags.map((tag, i) => <Badge key={i} className="bg-gray-200 text-gray-700">{tag}</Badge>)}
              </div>
            )}
            <div className="text-xs text-gray-700">{lead.notes}</div>
            <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition">
              <Button onClick={() => openEdit(lead)} size="icon" variant="ghost"><Edit3 className="w-4 h-4" /></Button>
              <Button onClick={() => handleDelete(lead.id)} size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-red-400" /></Button>
            </div>
          </Card>
        ))}
      </div>
      {loading && <div className="text-gray-400 mt-4">Chargement…</div>}
      {!loading && leads.length === 0 && <div className="text-sm text-gray-500 mt-3">Aucun lead pour l’instant.</div>}
    </div>
  );
};
// End of LeadsManager.tsx
