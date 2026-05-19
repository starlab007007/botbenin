import { z } from 'zod';
import { normalizePhone } from '@/lib/phone';

const phoneRequired = z.string().min(1, 'Téléphone requis').transform((v, ctx) => {
  const n = normalizePhone(v);
  if (!n.valid) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: n.reason || 'Numéro invalide' });
    return z.NEVER;
  }
  return n.e164;
});

const phoneOptional = z.string().optional().transform((v, ctx) => {
  if (!v) return '';
  const n = normalizePhone(v);
  if (!n.valid) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: n.reason || 'Numéro invalide' });
    return z.NEVER;
  }
  return n.e164;
});

export const partnerEnrollmentSchema = z.object({
  nom: z.string().trim().min(2, 'Nom requis (min 2 caractères)').max(100),
  telephone: phoneRequired,
  whatsapp: phoneOptional,
  ville: z.string().trim().min(1, 'Ville requise'),
  mobile_money_operator: z.string().min(1, 'Opérateur requis'),
  mobile_money_number: phoneRequired,
});

export const businessSchema = z.object({
  nom_entreprise: z.string().trim().min(2, 'Nom requis').max(150),
  categorie: z.string().trim().min(1, 'Catégorie requise'),
  ville: z.string().trim().min(1, 'Ville requise'),
  quartier: z.string().optional().default(''),
  description: z.string().max(2000).optional().default(''),
  adresse_complete: z.string().max(500).optional().default(''),
  telephone: phoneOptional,
  whatsapp: phoneOptional,
  mobile_money_operator: z.string().optional().default('MTN'),
  mobile_money_number: phoneOptional,
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export const productSchema = z.object({
  nom: z.string().trim().min(2, 'Nom requis').max(150),
  description: z.string().max(2000).optional().default(''),
  categorie: z.string().min(1, 'Catégorie requise'),
  unite: z.string().min(1, 'Unité requise'),
  prix_min: z.coerce.number().min(0, 'Prix invalide').nullable().optional(),
  prix_max: z.coerce.number().min(0, 'Prix invalide').nullable().optional(),
  stock_estime: z.coerce.number().int().min(0).nullable().optional(),
  disponible: z.boolean().default(true),
});

export type PartnerEnrollmentInput = z.input<typeof partnerEnrollmentSchema>;
export type BusinessInput = z.input<typeof businessSchema>;
export type ProductInput = z.input<typeof productSchema>;

export type ZodErrors<T> = Partial<Record<keyof T, string>>;

export function flattenZodErrors<T>(err: z.ZodError): ZodErrors<T> {
  const out: any = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as string;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
