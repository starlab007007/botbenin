// Parité Web ↔ Flutter (branche codex) : stock.
// Mêmes tables (waouh_partners, waouh_partner_products,
// waouh_partner_stock_movements, waouh_stock_reorder_requests) et même RPC
// waouh_adjust_partner_stock que l'application Flutter.
import { supabase } from "@/integrations/supabase/client";

export type StockProduct = {
  id: string;
  nom: string;
  description: string | null;
  categorie: string | null;
  unite: string | null;
  prix_min: number | null;
  disponible: boolean | null;
  stock_estime: number | null;
  stock_minimum: number | null;
  stock_target: number | null;
  stock_last_updated_at: string | null;
  photos: string[] | null;
  partner_id: string;
  business_id: string | null;
  updated_at: string;
};

export type StockMovement = {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  balance_before: number | null;
  balance_after: number | null;
  note: string | null;
  created_at: string;
};

const db = supabase as any;

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Connectez-vous pour gérer le stock.");
  return id;
}

export const stockRepository = {
  async fetchPartnerIds(): Promise<string[]> {
    const userId = await currentUserId();
    const { data, error } = await db.from("waouh_partners").select("id").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => String(r.id)).filter(Boolean);
  },

  async fetchProducts(): Promise<StockProduct[]> {
    const partnerIds = await this.fetchPartnerIds();
    if (!partnerIds.length) return [];
    const { data, error } = await db
      .from("waouh_partner_products")
      .select(
        "id,nom,description,categorie,unite,prix_min,disponible,stock_estime,stock_minimum," +
          "stock_target,stock_last_updated_at,photos,partner_id,business_id,updated_at",
      )
      .in("partner_id", partnerIds)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as StockProduct[];
  },

  async fetchMovements(productId?: string | null, limit = 100): Promise<StockMovement[]> {
    const userId = await currentUserId();
    let query = db.from("waouh_partner_stock_movements").select("*").eq("user_id", userId);
    if (productId) query = query.eq("product_id", productId);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data || []) as StockMovement[];
  },

  async registerMovement(input: {
    product: StockProduct;
    quantity: number;
    movementType: "in" | "out" | "adjustment" | "reorder";
    note?: string | null;
  }) {
    if (!input.quantity) throw new Error("Quantité obligatoire");
    const { error } = await db.rpc("waouh_adjust_partner_stock", {
      p_product_id: input.product.id,
      p_quantity: input.quantity,
      p_movement_type: input.movementType,
      p_note: input.note?.trim() || null,
      p_stock_minimum: input.product.stock_minimum,
      p_stock_target: input.product.stock_target,
    });
    if (error) throw new Error(error.message);
  },

  async updateThresholds(product: StockProduct, minimum: number, target?: number | null) {
    if (minimum < 0 || (target != null && target < 0))
      throw new Error("Les seuils ne peuvent pas être négatifs.");
    const { error } = await db.rpc("waouh_adjust_partner_stock", {
      p_product_id: product.id,
      p_quantity: 0,
      p_movement_type: "adjustment",
      p_note: "Mise à jour des seuils",
      p_stock_minimum: minimum,
      p_stock_target: target ?? null,
    });
    if (error) throw new Error(error.message);
  },

  async requestReorder(product: StockProduct, quantity: number, note?: string | null) {
    if (quantity <= 0) throw new Error("Quantité invalide");
    const userId = await currentUserId();
    const { error } = await db.from("waouh_stock_reorder_requests").insert({
      product_id: product.id,
      user_id: userId,
      quantity_requested: quantity,
      status: "pending",
      note: note?.trim() || null,
    });
    if (error) throw new Error(error.message);
  },

  async fetchDataSources(): Promise<any[]> {
    const { data, error } = await db.rpc("waouh_stock_list_sources");
    if (error) throw new Error(error.message);
    return (data || []) as any[];
  },

  /** Crée (si besoin) le partenaire de l'utilisateur puis un produit de stock. */
  async createProduct(input: {
    nom: string;
    categorie?: string | null;
    unite?: string | null;
    prixMin?: number | null;
    stockEstime?: number | null;
    stockMinimum?: number | null;
    stockTarget?: number | null;
  }): Promise<StockProduct> {
    const nom = input.nom.trim();
    if (!nom) throw new Error("Nom du produit obligatoire");
    const userId = await currentUserId();

    let partnerIds = await this.fetchPartnerIds();
    if (!partnerIds.length) {
      const code = `P${Date.now().toString(36).toUpperCase()}`;
      const { data: created, error: partnerError } = await db
        .from("waouh_partners")
        .insert({ user_id: userId, nom: "Mon commerce", code_partenaire: code, statut: "active" })
        .select("id")
        .single();
      if (partnerError) throw new Error(partnerError.message);
      partnerIds = [String(created.id)];
    }

    // Un produit doit être rattaché à un établissement du partenaire.
    const { data: businesses } = await db
      .from("waouh_partner_businesses")
      .select("id")
      .eq("partner_id", partnerIds[0])
      .limit(1);
    let businessId = businesses?.[0]?.id as string | undefined;
    if (!businessId) {
      const { data: business, error: businessError } = await db
        .from("waouh_partner_businesses")
        .insert({ partner_id: partnerIds[0], nom_entreprise: "Mon commerce", statut: "active" })
        .select("id")
        .single();
      if (businessError) throw new Error(businessError.message);
      businessId = String(business.id);
    }

    const { data, error } = await db
      .from("waouh_partner_products")
      .insert({
        partner_id: partnerIds[0],
        business_id: businessId,
        nom,
        categorie: input.categorie?.trim() || null,
        unite: input.unite?.trim() || null,
        prix_min: input.prixMin ?? null,
        stock_estime: input.stockEstime ?? 0,
        stock_minimum: input.stockMinimum ?? 0,
        stock_target: input.stockTarget ?? null,
        disponible: true,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as StockProduct;
  },
};

export function isLowStock(p: StockProduct) {
  const qty = p.stock_estime ?? 0;
  const min = p.stock_minimum ?? 0;
  return min > 0 && qty <= min;
}
