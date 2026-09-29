import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Product = {
  id: string;
  nom: string | null;
  categorie: string | null;
  unite: string | null;
  prix_min: number | string | null;
  stock_estime: number | string | null;
  stock_minimum: number | string | null;
  stock_target: number | string | null;
  stock_last_updated_at: string | null;
  origin?: string;
  source_name?: string | null;
};

type Movement = {
  product_id: string;
  movement_type: string;
  quantity: number | string;
  balance_after: number | string | null;
  note: string | null;
  created_at: string;
  product_name?: string | null;
  source_name?: string | null;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}


type ErrorInfo = {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
};

function errorInfo(error: unknown): ErrorInfo {
  if (error instanceof Error) {
    return {
      message: error.message || "Erreur interne du service Stock.",
      code: null,
      details: error.stack ?? null,
      hint: null,
    };
  }
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const text = (key: string): string | null => {
      const raw = value[key];
      if (raw === null || raw === undefined) return null;
      if (typeof raw === "string") return raw.trim() || null;
      try {
        return JSON.stringify(raw);
      } catch {
        return String(raw);
      }
    };
    return {
      message: text("message") ?? text("error") ?? "Erreur PostgreSQL/Supabase.",
      code: text("code"),
      details: text("details"),
      hint: text("hint"),
    };
  }
  return {
    message: String(error || "Erreur interne du service Stock."),
    code: null,
    details: null,
    hint: null,
  };
}

function number(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}

function formatMoney(value: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} FCFA`;
}

function productName(product: Product): string {
  const value = `${product.nom ?? ""}`.trim();
  return value || "Produit sans nom";
}

function productState(product: Product): "untracked" | "out" | "low" | "healthy" {
  const stock = nullableNumber(product.stock_estime);
  const minimum = Math.max(number(product.stock_minimum), 0);
  if (stock === null) return "untracked";
  if (stock <= 0) return "out";
  if (minimum > 0 && stock <= minimum) return "low";
  return "healthy";
}

function stockRow(product: Product) {
  const stock = nullableNumber(product.stock_estime);
  const minimum = number(product.stock_minimum);
  const target = nullableNumber(product.stock_target);
  const state = productState(product);
  const labels: Record<string, string> = {
    untracked: "À renseigner",
    out: "Rupture",
    low: "Stock faible",
    healthy: "En stock",
  };
  return {
    produit: productName(product),
    categorie: product.categorie ?? "Non classé",
    stock: stock ?? "Non renseigné",
    seuil: minimum,
    objectif: target ?? "—",
    statut: labels[state],
    source: product.source_name ??
      (product.origin === "external" ? "Source importée" : "Catalogue Waouh"),
  };
}

function suggestions() {
  return [
    "Produits en rupture",
    "Que faut-il réapprovisionner ?",
    "Entrées et sorties de la semaine",
    "Stock par catégorie",
  ];
}


function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function standardDeviation(values: number[]) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function buildStockProfessionalAnalytics(params: {
  products: Product[];
  movements: Movement[];
  out: Product[];
  low: Product[];
  healthy: Product[];
  untracked: Product[];
  totalUnits: number;
  estimatedValue: number;
  contextName: string;
  chartSpec: Record<string, unknown>;
}) {
  const { products, movements, out, low, healthy, untracked, totalUnits, estimatedValue, contextName, chartSpec } = params;
  const trackedStocks = products.map((product) => nullableNumber(product.stock_estime)).filter((value): value is number => value != null);
  const meanStock = trackedStocks.length ? trackedStocks.reduce((sum, value) => sum + value, 0) / trackedStocks.length : 0;
  const medianStock = median(trackedStocks);
  const stdStock = standardDeviation(trackedStocks);
  const trackedRate = products.length ? (trackedStocks.length / products.length) * 100 : 0;
  const outRate = products.length ? (out.length / products.length) * 100 : 0;
  const lowRate = products.length ? (low.length / products.length) * 100 : 0;

  const categoryMap = new Map<string, { products: number; units: number; value: number }>();
  for (const product of products) {
    const category = `${product.categorie ?? 'Non classé'}`.trim() || 'Non classé';
    const current = categoryMap.get(category) || { products: 0, units: 0, value: 0 };
    const stock = Math.max(number(product.stock_estime), 0);
    current.products += 1;
    current.units += stock;
    current.value += stock * Math.max(number(product.prix_min), 0);
    categoryMap.set(category, current);
  }
  const categoryPoints = [...categoryMap.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value.units * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  const topProducts = products
    .map((product) => ({ name: productName(product), value: Math.max(number(product.stock_estime), 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const cutoff = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  cutoff.setUTCHours(0, 0, 0, 0);
  const days: string[] = [];
  const entriesByDay = new Map<string, number>();
  const exitsByDay = new Map<string, number>();
  for (let index = 0; index < 30; index++) {
    const day = new Date(cutoff.getTime() + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    days.push(day);
    entriesByDay.set(day, 0);
    exitsByDay.set(day, 0);
  }
  for (const movement of movements) {
    const date = new Date(movement.created_at);
    if (Number.isNaN(date.getTime()) || date < cutoff) continue;
    const key = date.toISOString().slice(0, 10);
    const quantity = number(movement.quantity);
    if (quantity >= 0) entriesByDay.set(key, (entriesByDay.get(key) || 0) + quantity);
    else exitsByDay.set(key, (exitsByDay.get(key) || 0) + Math.abs(quantity));
  }
  const entryValues = days.map((day) => Math.round((entriesByDay.get(day) || 0) * 100) / 100);
  const exitValues = days.map((day) => Math.round((exitsByDay.get(day) || 0) * 100) / 100);
  const entries30 = entryValues.reduce((sum, value) => sum + value, 0);
  const exits30 = exitValues.reduce((sum, value) => sum + value, 0);

  const charts: Record<string, unknown>[] = [
    {
      type: 'pie',
      title: 'État global du stock',
      subtitle: 'Répartition des produits selon leur niveau de disponibilité',
      points: [
        { name: 'En stock', value: healthy.length },
        { name: 'Stock faible', value: low.length },
        { name: 'Rupture', value: out.length },
        { name: 'À renseigner', value: untracked.length },
      ],
    },
  ];
  if (categoryPoints.length) charts.push({ type: 'bar', title: 'Stock par catégorie', subtitle: 'Nombre d’unités disponibles par catégorie', points: categoryPoints });
  if (movements.length) charts.push({ type: 'line', title: 'Courbe des mouvements sur 30 jours', subtitle: 'Comparaison quotidienne des entrées et sorties', labels: days, series: [{ name: 'Entrées', values: entryValues }, { name: 'Sorties', values: exitValues }] });
  if (topProducts.length) charts.push({ type: 'bar', title: 'Produits les plus stockés', subtitle: 'Top des produits par quantité disponible', points: topProducts });
  if (chartSpec && Object.keys(chartSpec).length && chartSpec.type === 'kpi' && (chartSpec.entries != null || chartSpec.exits != null)) {
    charts.push({ type: 'bar', title: 'Entrées et sorties', points: [{ name: 'Entrées', value: number(chartSpec.entries) }, { name: 'Sorties', value: number(chartSpec.exits) }] });
  }

  const recommendations: string[] = [];
  if (out.length) recommendations.push(`Traiter immédiatement ${out.length} produit(s) en rupture et confirmer les délais fournisseurs avant toute promesse client.`);
  if (low.length) recommendations.push(`Planifier le réapprovisionnement de ${low.length} produit(s) sous le seuil minimum, en priorisant le plus grand écart à l’objectif.`);
  if (untracked.length) recommendations.push(`Renseigner le stock initial de ${untracked.length} produit(s) afin d’augmenter la fiabilité des analyses et alertes.`);
  if (exits30 > entries30) recommendations.push(`Les sorties sur 30 jours dépassent les entrées de ${Math.round((exits30 - entries30) * 100) / 100} unité(s). Réviser les niveaux de sécurité et les fréquences d’approvisionnement.`);
  if (categoryPoints.length && totalUnits > 0 && categoryPoints[0].value / totalUnits >= .5) recommendations.push(`Le stock est concentré à plus de 50 % dans la catégorie « ${categoryPoints[0].name} ». Évaluer le risque de dépendance et l’équilibre du portefeuille.`);
  if (trackedRate < 95) recommendations.push(`La couverture de suivi est de ${Math.round(trackedRate * 10) / 10} %. Viser au moins 95 % de produits avec un stock renseigné.`);
  if (!recommendations.length) recommendations.push('Le stock est globalement maîtrisé. Maintenir un suivi hebdomadaire des seuils, mouvements et délais de réapprovisionnement.');

  const executiveSummary = `L’analyse de « ${contextName} » couvre ${products.length} produit(s) et ${formatNumber(totalUnits)} unité(s), pour une valeur estimative de ${formatMoney(estimatedValue)}. ${out.length} produit(s) sont en rupture, ${low.length} sous le seuil minimum et ${untracked.length} sans stock renseigné. Sur les 30 derniers jours, les entrées représentent ${formatNumber(entries30)} unité(s) contre ${formatNumber(exits30)} unité(s) de sorties.`;

  return {
    executive_summary: executiveSummary,
    statistics: {
      inventaire: {
        produits: products.length,
        produits_suivis: trackedStocks.length,
        couverture_suivi_pourcent: Math.round(trackedRate * 100) / 100,
        stock_total: Math.round(totalUnits * 100) / 100,
        stock_moyen: Math.round(meanStock * 100) / 100,
        stock_median: Math.round(medianStock * 100) / 100,
        ecart_type_stock: Math.round(stdStock * 100) / 100,
        valeur_estimee_fcfa: Math.round(estimatedValue),
        taux_rupture_pourcent: Math.round(outRate * 100) / 100,
        taux_stock_faible_pourcent: Math.round(lowRate * 100) / 100,
      },
      flux_30_jours: {
        entrees: Math.round(entries30 * 100) / 100,
        sorties: Math.round(exits30 * 100) / 100,
        solde: Math.round((entries30 - exits30) * 100) / 100,
      },
    },
    recommendations: recommendations.slice(0, 8),
    charts: charts.slice(0, 4),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      throw new Error("Configuration Supabase incomplète.");
    }

    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) {
      return json(401, { error: "AUTH_REQUIRED" });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return json(401, { error: "SESSION_INVALID" });
    }

    const body = await request.json().catch(() => ({}));
    const question = `${body?.question ?? ""}`.trim();
    if (!question) return json(400, { error: "QUESTION_REQUIRED" });

    const requestedScope = `${body?.analysis_scope ?? "all"}`.trim();
    const analysisScope = ["all", "catalog", "imports", "source"].includes(
      requestedScope,
    )
      ? requestedScope
      : "all";
    const datasourceId = `${body?.datasource_id ?? ""}`.trim() || null;
    if (analysisScope === "source" && !datasourceId) {
      return json(400, {
        error: "DATASOURCE_REQUIRED",
        message: "Sélectionnez une source importée à analyser.",
      });
    }
    const includeCatalog =
      analysisScope === "all" || analysisScope === "catalog";
    const includeImports =
      analysisScope === "all" ||
      analysisScope === "imports" ||
      analysisScope === "source";

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let products: Product[] = [];
    let movements: Movement[] = [];

    if (includeCatalog) {
      const { data: partners, error: partnerError } = await admin
        .from("waouh_partners")
        .select("id")
        .eq("user_id", authData.user.id);
      if (partnerError) throw partnerError;

      const partnerIds = (partners ?? []).map(
        (item: { id: string }) => item.id,
      );
      if (partnerIds.length > 0) {
        const { data, error } = await admin
          .from("waouh_partner_products")
          .select(
            "id,nom,categorie,unite,prix_min,stock_estime,stock_minimum,stock_target,stock_last_updated_at",
          )
          .in("partner_id", partnerIds)
          .order("nom", { ascending: true });
        if (error) throw error;
        products = (data ?? []) as Product[];
      }

      const { data: movementData, error: movementError } = await admin
        .from("waouh_partner_stock_movements")
        .select(
          "product_id,movement_type,quantity,balance_after,note,created_at",
        )
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (movementError && movementError.code !== "42P01") {
        throw movementError;
      }
      movements = (movementData ?? []) as Movement[];
    }

    let externalRows: Record<string, unknown>[] = [];
    let contextName = includeCatalog ? "Catalogue Waouh" : "Importations";

    if (includeImports) {
      if (analysisScope === "source" && datasourceId) {
        const { data: sourceData, error: sourceError } = await admin
          .from("waouh_stock_data_sources")
          .select("id,name")
          .eq("id", datasourceId)
          .eq("user_id", authData.user.id)
          .single();
        if (sourceError) throw sourceError;
        contextName = `${sourceData.name ?? "Source importée"}`;
      } else if (analysisScope === "all") {
        contextName = "Catalogue Waouh + toutes les importations";
      } else {
        contextName = "Toutes les importations";
      }

      let externalQuery = admin
        .from("waouh_stock_external_records_active")
        .select(
          "id,datasource_id,source_name,record_type,name,sku,category,quantity," +
            "threshold_low,target_stock,unit_price_fcfa,cost_price_fcfa,unit," +
            "movement_type,movement_quantity,movement_date,synced_at",
        )
        .eq("user_id", authData.user.id);

      if (analysisScope === "source" && datasourceId) {
        externalQuery = externalQuery.eq("datasource_id", datasourceId);
      }

      const { data: externalData, error: externalError } =
        await externalQuery.limit(20000);
      if (externalError && externalError.code !== "42P01") {
        throw externalError;
      }
      externalRows = (externalData ?? []) as Record<string, unknown>[];
    }
    const externalProducts: Product[] = externalRows
      .filter((item) => item.record_type === "inventory")
      .map((item) => ({
        id: `external:${item.id}`,
        nom: `${item.name ?? "Produit sans nom"}`,
        categorie: item.category == null ? null : `${item.category}`,
        unite: item.unit == null ? null : `${item.unit}`,
        prix_min: item.unit_price_fcfa as number | string | null,
        stock_estime: item.quantity as number | string | null,
        stock_minimum: item.threshold_low as number | string | null,
        stock_target: item.target_stock as number | string | null,
        stock_last_updated_at:
          item.synced_at == null ? null : `${item.synced_at}`,
        origin: "external",
        source_name:
          item.source_name == null ? "Source importée" : `${item.source_name}`,
      }));
    products = [...products, ...externalProducts];

    const externalMovements: Movement[] = externalRows
      .filter((item) => item.record_type === "movement")
      .map((item) => {
        const rawQuantity = number(item.movement_quantity);
        const type = `${item.movement_type ?? "adjustment"}`;
        const signedQuantity =
          type === "out" ? -Math.abs(rawQuantity) : Math.abs(rawQuantity);
        return {
          product_id:
            `external:${item.datasource_id}:${normalize(`${item.name ?? ""}`)}`,
          movement_type: type,
          quantity: signedQuantity,
          balance_after: null,
          note: null,
          created_at:
            item.movement_date == null
              ? `${item.synced_at ?? new Date().toISOString()}`
              : `${item.movement_date}`,
          product_name: item.name == null ? "Produit" : `${item.name}`,
          source_name:
            item.source_name == null ? "Source importée" : `${item.source_name}`,
        };
      });
    movements = [...movements, ...externalMovements];

    const normalizedQuestion = normalize(question);
    const out = products.filter((product) => productState(product) === "out");
    const low = products.filter((product) => productState(product) === "low");
    const untracked = products.filter((product) => productState(product) === "untracked");
    const healthy = products.filter((product) => productState(product) === "healthy");
    const totalUnits = products.reduce(
      (sum, product) => sum + Math.max(number(product.stock_estime), 0),
      0,
    );
    const estimatedValue = products.reduce(
      (sum, product) =>
        sum + Math.max(number(product.stock_estime), 0) * Math.max(number(product.prix_min), 0),
      0,
    );

    const baseKpis = {
      produits: products.length,
      unites: totalUnits,
      ruptures: out.length,
      stock_faible: low.length,
      sources_externes: new Set(
        externalRows
          .map((item) => `${item.datasource_id ?? ""}`)
          .filter((value) => value.length > 0),
      ).size,
    };

    let answer = "";
    let summary = "";
    let columns: string[] = [];
    let tableRows: Record<string, unknown>[] = [];
    let insights: string[] = [];
    let chartSpec: Record<string, unknown> = {};

    const contains = (...terms: string[]) => terms.some((term) => normalizedQuestion.includes(term));

    const matchedProduct = products
      .map((product) => ({ product, key: normalize(productName(product)) }))
      .filter((item) => item.key.length >= 3 && normalizedQuestion.includes(item.key))
      .sort((a, b) => b.key.length - a.key.length)[0]?.product;

    if (matchedProduct) {
      const row = stockRow(matchedProduct);
      answer = `${productName(matchedProduct)} dispose de ${row.stock} unité(s). Son seuil minimum est ${row.seuil} et son statut est « ${row.statut} ».`;
      summary = `Situation détaillée de ${productName(matchedProduct)}.`;
      columns = ["source", "produit", "categorie", "stock", "seuil", "objectif", "statut"];
      tableRows = [row];
      insights = productState(matchedProduct) === "out"
        ? ["Réapprovisionnement immédiat recommandé."]
        : productState(matchedProduct) === "low"
        ? ["Le produit est sous son seuil de sécurité."]
        : ["Aucune alerte critique sur ce produit."];
    } else if (contains("rupture", "epuise", "stock zero")) {
      answer = out.length === 0
        ? "Aucun produit n’est actuellement en rupture."
        : `${out.length} produit(s) sont actuellement en rupture.`;
      summary = "Produits dont le stock est nul.";
      columns = ["source", "produit", "categorie", "stock", "seuil", "objectif", "statut"];
      tableRows = out.map(stockRow);
      insights = out.length > 0
        ? ["Traitez d’abord les produits avec un objectif de stock défini."]
        : ["La situation de rupture est maîtrisée."];
    } else if (contains("faible", "seuil", "critique", "minimum")) {
      answer = low.length === 0
        ? "Aucun produit n’est sous le seuil minimum."
        : `${low.length} produit(s) ont atteint ou dépassé leur seuil d’alerte.`;
      summary = "Produits à surveiller avant rupture.";
      columns = ["source", "produit", "categorie", "stock", "seuil", "objectif", "statut"];
      tableRows = low.map(stockRow);
      insights = low.length > 0
        ? ["Planifiez le réapprovisionnement avant la prochaine sortie importante."]
        : ["Tous les produits renseignés sont au-dessus de leur seuil."];
    } else if (contains("non renseigne", "sans stock", "a renseigner")) {
      answer = untracked.length === 0
        ? "Tous les produits ont un niveau de stock renseigné."
        : `${untracked.length} produit(s) n’ont pas encore de stock renseigné.`;
      summary = "Produits à initialiser dans la gestion de stock.";
      columns = ["source", "produit", "categorie", "stock", "statut"];
      tableRows = untracked.map(stockRow);
      insights = untracked.length > 0
        ? ["Renseignez leur stock initial pour fiabiliser les analyses."]
        : ["La couverture de suivi est complète."];
    } else if (contains("reappro", "commander", "approvision", "priorite")) {
      const candidates = [...out, ...low].sort((a, b) => {
        const gapA = Math.max(number(a.stock_target) - number(a.stock_estime), 0);
        const gapB = Math.max(number(b.stock_target) - number(b.stock_estime), 0);
        return gapB - gapA;
      });
      tableRows = candidates.map((product) => ({
        ...stockRow(product),
        quantite_recommandee: Math.max(
          number(product.stock_target) - number(product.stock_estime),
          number(product.stock_minimum) - number(product.stock_estime),
          1,
        ),
      }));
      columns = [
        "source",
        "produit",
        "stock",
        "seuil",
        "objectif",
        "statut",
        "quantite_recommandee",
      ];
      answer = candidates.length === 0
        ? "Aucun réapprovisionnement prioritaire n’est nécessaire."
        : `${candidates.length} produit(s) doivent être réapprovisionnés en priorité.`;
      summary = "Priorisation fondée sur les ruptures, les seuils et les objectifs.";
      insights = candidates.length > 0
        ? ["Commencez par les ruptures, puis les stocks faibles avec le plus grand écart à l’objectif."]
        : ["Les stocks renseignés sont actuellement suffisants."];
    } else if (contains("valeur", "montant", "valorisation")) {
      answer = `La valeur estimative du stock est de ${formatMoney(estimatedValue)}.`;
      summary = "Valorisation calculée à partir du prix minimum et du stock actuel.";
      columns = ["source", "produit", "stock", "prix_unitaire", "valeur_estimee"];
      tableRows = products
        .map((product) => ({
          source: product.source_name ??
            (product.origin === "external" ? "Source importée" : "Catalogue Waouh"),
          produit: productName(product),
          stock: nullableNumber(product.stock_estime) ?? "Non renseigné",
          prix_unitaire: formatMoney(number(product.prix_min)),
          valeur_estimee: formatMoney(number(product.stock_estime) * number(product.prix_min)),
        }))
        .sort((a, b) => number(b.valeur_estimee) - number(a.valeur_estimee));
      insights = ["La valorisation reste indicative tant que tous les prix et stocks ne sont pas renseignés."];
    } else if (contains("categorie", "famille")) {
      const grouped = new Map<string, { products: number; units: number }>();
      for (const product of products) {
        const category = `${product.categorie ?? "Non classé"}`.trim() || "Non classé";
        const current = grouped.get(category) ?? { products: 0, units: 0 };
        current.products += 1;
        current.units += Math.max(number(product.stock_estime), 0);
        grouped.set(category, current);
      }
      tableRows = [...grouped.entries()]
        .map(([categorie, value]) => ({ categorie, produits: value.products, unites: value.units }))
        .sort((a, b) => number(b.unites) - number(a.unites));
      columns = ["categorie", "produits", "unites"];
      answer = `Le stock est réparti sur ${grouped.size} catégorie(s).`;
      summary = "Répartition des produits et unités par catégorie.";
      chartSpec = { type: "bar", x: "categorie", y: "unites", title: "Stock par catégorie" };
      insights = tableRows.length > 0
        ? [`La catégorie la plus importante en unités est « ${String(tableRows[0]?.categorie ?? "")} ».`]
        : [];
    } else if (contains("entree", "sortie", "mouvement", "historique")) {
      let cutoff = new Date(0);
      let periodLabel = "historique disponible";
      const now = new Date();
      if (contains("aujourd", "jour")) {
        cutoff = new Date(now);
        cutoff.setUTCHours(0, 0, 0, 0);
        periodLabel = "aujourd’hui";
      } else if (contains("semaine", "7 jours")) {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        periodLabel = "les 7 derniers jours";
      } else if (contains("mois", "30 jours")) {
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        periodLabel = "les 30 derniers jours";
      }
      const filtered = movements.filter((item) => new Date(item.created_at) >= cutoff);
      const entries = filtered.filter((item) => number(item.quantity) > 0);
      const exits = filtered.filter((item) => number(item.quantity) < 0);
      const productMap = new Map(products.map((product) => [product.id, productName(product)]));
      tableRows = filtered.slice(0, 50).map((item) => ({
        date: new Date(item.created_at).toLocaleString("fr-FR"),
        source: item.source_name ?? "Catalogue Waouh",
        produit: item.product_name ?? productMap.get(item.product_id) ?? "Produit",
        type: number(item.quantity) >= 0 ? "Entrée" : "Sortie",
        quantite: number(item.quantity),
        solde: nullableNumber(item.balance_after) ?? "—",
        motif: item.note ?? "—",
      }));
      columns = ["date", "source", "produit", "type", "quantite", "solde", "motif"];
      const entryUnits = entries.reduce((sum, item) => sum + Math.max(number(item.quantity), 0), 0);
      const exitUnits = exits.reduce((sum, item) => sum + Math.abs(Math.min(number(item.quantity), 0)), 0);
      answer = `Sur ${periodLabel}, ${entryUnits} unité(s) sont entrées et ${exitUnits} unité(s) sont sorties.`;
      summary = `${filtered.length} mouvement(s) analysé(s).`;
      insights = entryUnits < exitUnits
        ? ["Les sorties dépassent les entrées sur la période."]
        : ["Les entrées couvrent les sorties sur la période."];
      chartSpec = { type: "kpi", entries: entryUnits, exits: exitUnits };
    } else if (contains("total", "unite", "combien", "synthese", "resume", "general")) {
      answer = `Vous suivez ${products.length} produit(s), représentant ${formatNumber(totalUnits)} unité(s). ${out.length} sont en rupture et ${low.length} sont en stock faible.`;
      summary = `Synthèse de « ${contextName} ».`;
      columns = ["source", "produit", "categorie", "stock", "seuil", "objectif", "statut"];
      tableRows = [...out, ...low, ...healthy, ...untracked].slice(0, 20).map(stockRow);
      insights = [
        `${out.length + low.length} produit(s) nécessitent une attention prioritaire.`,
        `${untracked.length} produit(s) restent à initialiser.`,
        `Valeur estimative : ${formatMoney(estimatedValue)}.`,
      ];
    } else {
      answer = `J’ai analysé ${products.length} produit(s), catalogue Waouh et sources importées confondus. Reformulez votre question en précisant rupture, seuil, réapprovisionnement, mouvements, catégorie, valeur ou nom du produit.`;
      summary = `Analyse générale de « ${contextName} ».`;
      columns = ["produit", "categorie", "stock", "seuil", "statut"];
      tableRows = [...out, ...low, ...healthy, ...untracked].slice(0, 10).map(stockRow);
      insights = ["Utilisez une question courte et précise pour obtenir un tableau ciblé."];
    }

    const professional = buildStockProfessionalAnalytics({
      products,
      movements,
      out,
      low,
      healthy,
      untracked,
      totalUnits,
      estimatedValue,
      contextName,
      chartSpec,
    });

    const responseBody = {
      answer,
      summary,
      executive_summary: professional.executive_summary,
      kpis: baseKpis,
      statistics: professional.statistics,
      recommendations: professional.recommendations,
      charts: professional.charts,
      columns,
      table_rows: tableRows,
      insights,
      suggestions: suggestions(),
      chart_spec: chartSpec,
      analysis_scope: analysisScope,
      datasource_id: datasourceId,
      context_name: contextName,
    };

    const { error: historyError } = await admin.from("waouh_stock_ai_queries").insert({
      user_id: authData.user.id,
      datasource_id: datasourceId,
      analysis_scope: analysisScope,
      question,
      answer,
      result_json: responseBody,
    });
    if (historyError) {
      console.warn("waouh_stock_ai_queries", historyError.message);
    }

    return json(200, responseBody);
  } catch (error) {
    const info = errorInfo(error);
    console.error("waouh-stock-query", info);
    return json(500, {
      error: "STOCK_QUERY_FAILED",
      message: info.message,
      code: info.code,
      details: info.details,
      hint: info.hint,
    });
  }
});
