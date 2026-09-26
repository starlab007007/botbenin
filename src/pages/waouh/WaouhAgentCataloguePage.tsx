import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, ImagePlus, Loader2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { stockRepository, type StockProduct } from "@/lib/waouh/stockRepository";

type ManualProduct = {
  id: string;
  name: string;
  price_fcfa: number | null;
  description: string | null;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result || "").split(",").pop() || "");
    reader.readAsDataURL(file);
  });

export default function WaouhAgentCataloguePage() {
  const { agentId = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<ManualProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Connectez-vous pour gérer le catalogue.");

      const [partnerProducts, links, manualProducts] = await Promise.all([
        stockRepository.fetchProducts(),
        (supabase as any)
          .from("waouh_ai_agent_partner_products")
          .select("product_id")
          .eq("agent_id", agentId)
          .eq("user_id", userId),
        (supabase as any)
          .from("waouh_ai_agent_products")
          .select("id,name,price_fcfa,description")
          .eq("agent_id", agentId)
          .eq("user_id", userId)
          .order("position"),
      ]);

      setProducts(partnerProducts);
      setLinked(new Set(((links.data || []) as any[]).map((row) => String(row.product_id))));
      setManual((manualProducts.data || []) as ManualProduct[]);
    } catch (error) {
      toast({
        title: "Catalogue indisponible",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [agentId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (productId: string, selected: boolean) => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;

    try {
      if (selected) {
        const { error } = await (supabase as any)
          .from("waouh_ai_agent_partner_products")
          .insert({ agent_id: agentId, product_id: productId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("waouh_ai_agent_partner_products")
          .delete()
          .eq("agent_id", agentId)
          .eq("product_id", productId)
          .eq("user_id", userId);
        if (error) throw error;
      }

      setLinked((current) => {
        const next = new Set(current);
        selected ? next.add(productId) : next.delete(productId);
        return next;
      });
    } catch (error) {
      toast({
        title: "Mise à jour impossible",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const importImage = async (file: File) => {
    setImporting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Connectez-vous pour importer un catalogue.");

      const imageBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("waouh-agent-parse-catalog", {
        body: {
          mode: "image",
          image_base64: imageBase64,
          image_mime: file.type || "image/jpeg",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));

      const parsed = Array.isArray(data?.products) ? data.products : [];
      const rows = parsed
        .map((item: any, index: number) => ({
          agent_id: agentId,
          user_id: userId,
          name: String(item?.name || "").trim(),
          price_fcfa: item?.price_fcfa == null ? null : Number(item.price_fcfa),
          description: String(item?.description || "").trim() || null,
          position: index,
        }))
        .filter((item: any) => item.name);

      if (!rows.length) throw new Error("Aucun produit lisible dans cette image.");

      const { error: insertError } = await (supabase as any)
        .from("waouh_ai_agent_products")
        .insert(rows);
      if (insertError) throw insertError;

      toast({
        title: "Catalogue importé",
        description: `${rows.length} produit(s) ajouté(s) à l’Agent IA.`,
      });
      await load();
    } catch (error) {
      toast({
        title: "Import impossible",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <main className="min-h-[100dvh] bg-slate-50/70">
      <header className="sticky top-0 z-10 border-b bg-white/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-black text-slate-950">Catalogue Agent</h1>
            <p className="text-xs font-semibold text-slate-500">
              {linked.size} produit(s) partenaire associé(s)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importImage(file);
            }}
          />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            Importer
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 p-4 pb-24 sm:p-6">
        <section>
          <div className="mb-3">
            <h2 className="font-black text-slate-950">Catalogue partenaire</h2>
            <p className="text-xs font-semibold text-slate-500">
              Activez seulement les produits utiles à cet Agent.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin" /></div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
              Aucun produit partenaire disponible.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => {
                const selected = linked.has(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => void toggle(product.id, !selected)}
                    className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${selected ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-bold text-slate-950">{product.nom}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {product.categorie || "Produit"}
                          {product.prix_min != null ? ` · ${Number(product.prix_min).toLocaleString("fr-FR")} FCFA` : ""}
                        </div>
                      </div>
                      <Badge variant={selected ? "default" : "secondary"}>{selected ? "Associé" : "Ajouter"}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3">
            <h2 className="font-black text-slate-950">Produits importés pour l’Agent</h2>
            <p className="text-xs font-semibold text-slate-500">
              Produits extraits d’une image ou d’un catalogue.
            </p>
          </div>

          {manual.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
              Aucun produit importé directement.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {manual.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="font-bold text-slate-950">{item.name}</div>
                  {item.price_fcfa != null && (
                    <div className="mt-1 text-sm font-semibold text-emerald-700">
                      {Number(item.price_fcfa).toLocaleString("fr-FR")} FCFA
                    </div>
                  )}
                  {item.description && <div className="mt-2 text-xs text-slate-500">{item.description}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
