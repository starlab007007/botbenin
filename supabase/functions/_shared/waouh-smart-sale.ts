export type SmartSale = {
  title: string;
  price: number | null;
  city: string;
  quarter: string;
  detail: string;
  category: string;
  brand: string;
  model: string;
  condition: string;
};

const lineValue = (text: string, names: string[]): string => {
  const keys = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return text.match(new RegExp(`^\\s*(?:${keys})\\s*:\\s*(.+?)\\s*$`, "im"))?.[1]?.trim() || "";
};

export function normalizeCategory(value: string): string {
  const v = String(value || "").toLowerCase();
  if (/t[ée]l[ée]phone|smartphone|iphone|android/.test(v)) return "smartphone";
  if (/ordinateur|pc|laptop|macbook/.test(v)) return "ordinateur";
  if (/v[êe]tement|tissu|chaussure|mode|habit/.test(v)) return "vetement";
  if (/voiture|moto|v[ée]hicule|auto/.test(v)) return "vehicule";
  if (/frigo|cong[ée]lateur|machine|[ée]lectrom[ée]nager/.test(v)) return "electromenager";
  if (/maison|logement|immobilier|location|terrain|chambre|salon|meuble/.test(v)) return "meuble";
  return "autre";
}

export function parseSmartSale(text: string, saleMeta: any = {}): SmartSale {
  const raw = String(text || "");
  const titleFromText = lineValue(raw, ["Je vends", "Je vend", "Produit", "Article"]);
  const priceText = lineValue(raw, ["Prix", "Tarif"]);
  const digits = String(saleMeta?.price ?? priceText).replace(/\D/g, "");
  const title = String(saleMeta?.title || titleFromText || "").trim();
  const detail = String(saleMeta?.detail || lineValue(raw, ["Détail", "Detail", "Description", "État", "Etat"]) || "").trim();
  const category = normalizeCategory(String(saleMeta?.category || title || detail));
  return {
    title,
    price: digits ? Number(digits) : null,
    city: String(saleMeta?.city || lineValue(raw, ["Ville"]) || "").trim(),
    quarter: String(saleMeta?.quarter || lineValue(raw, ["Quartier"]) || "").trim(),
    detail,
    category,
    brand: String(saleMeta?.brand || "").trim(),
    model: String(saleMeta?.model || "").trim(),
    condition: String(saleMeta?.condition || "good").trim() || "good",
  };
}

export function isCompleteSmartSale(value: SmartSale): boolean {
  return value.title.length >= 2 && value.price != null && Number.isFinite(value.price) && value.price > 0;
}
