const LABELS: Record<string, string> = {
  amount: "Prix", quantity: "Quantité", scope: "Périmètre", deadline: "Remise / délai", exclusions: "Exclusions",
  expected_result: "Résultat attendu", payment: "Paiement", delivery_mode: "Remise", delivery_address: "Adresse de livraison", delivery_fee: "Frais de livraison",
};

/** Libellé lisible d'une condition de l'accord ; jamais le nom interne. */
export const termLabel = (key: string): string => LABELS[key] ?? "Condition";

/** Valeur lisible d'une condition de l'accord. */
export function termValue(key: string, value: unknown): string {
  if (key === "delivery_mode") return value === "delivery" ? "Livraison par un livreur" : "Retrait en main propre";
  if (key === "delivery_fee") return `${new Intl.NumberFormat("fr-FR").format(Number(value) || 0)} F`;
  return String(value);
}
