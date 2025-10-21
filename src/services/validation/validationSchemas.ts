/**
 * Centralized Validation Schemas using Zod
 * Provides type-safe validation for all critical data inputs
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const uuidSchema = z.string().uuid({ message: 'ID invalide' });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Adresse email invalide' })
  .max(255, { message: 'Email trop long (max 255 caractères)' });

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[\d\s\-\+\(\)]+$/, { message: 'Numéro de téléphone invalide' })
  .min(8, { message: 'Numéro trop court' })
  .max(20, { message: 'Numéro trop long' });

export const urlSchema = z
  .string()
  .trim()
  .url({ message: 'URL invalide' })
  .max(2048, { message: 'URL trop longue' });

export const sessionTokenSchema = z
  .string()
  .min(16, { message: 'Token de session invalide' })
  .max(255, { message: 'Token de session trop long' });

// ============================================================================
// BOT SCHEMAS
// ============================================================================

export const botIdSchema = uuidSchema;

export const botNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Le nom du bot est requis' })
  .max(100, { message: 'Nom trop long (max 100 caractères)' })
  .regex(/^[a-zA-Z0-9\s\-\_àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]+$/, {
    message: 'Caractères invalides dans le nom',
  });

export const botDescriptionSchema = z
  .string()
  .trim()
  .max(500, { message: 'Description trop longue (max 500 caractères)' })
  .optional();

export const botConfigSchema = z.object({
  name: botNameSchema,
  description: botDescriptionSchema,
  isActive: z.boolean().optional(),
  shareEnabled: z.boolean().optional(),
  model: z.enum(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(4000).optional(),
});

// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

export const messageContentSchema = z
  .string()
  .trim()
  .min(1, { message: 'Le message ne peut pas être vide' })
  .max(10000, { message: 'Message trop long (max 10000 caractères)' });

export const messageTypeSchema = z.enum(['user', 'bot', 'system'], {
  errorMap: () => ({ message: 'Type de message invalide' }),
});

export const messageMetadataSchema = z
  .record(z.any())
  .optional()
  .refine(
    (data) => {
      if (!data) return true;
      const json = JSON.stringify(data);
      return json.length <= 5000; // Max 5KB metadata
    },
    { message: 'Métadonnées trop volumineuses' }
  );

export const chatMessageSchema = z.object({
  botId: botIdSchema,
  sessionToken: sessionTokenSchema,
  content: messageContentSchema,
  type: messageTypeSchema,
  metadata: messageMetadataSchema,
});

// ============================================================================
// SESSION SCHEMAS
// ============================================================================

export const sessionCreationSchema = z.object({
  botId: botIdSchema,
  entryPoint: z
    .enum(['direct', 'shortened_link', 'public_url', 'social_share', 'whatsapp'])
    .default('direct'),
  referrerUrl: urlSchema.optional(),
  userAgent: z.string().max(500).optional(),
});

export const sessionValidationSchema = z.object({
  sessionToken: sessionTokenSchema,
  botId: botIdSchema.optional(),
});

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const userProfileSchema = z.object({
  email: emailSchema,
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'Nom trop court' })
    .max(100, { message: 'Nom trop long' })
    .optional(),
  phone: phoneSchema.optional(),
});

export const userRegistrationSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, { message: 'Mot de passe trop court (min 8 caractères)' })
      .max(100, { message: 'Mot de passe trop long' })
      .regex(/[A-Z]/, { message: 'Doit contenir au moins une majuscule' })
      .regex(/[a-z]/, { message: 'Doit contenir au moins une minuscule' })
      .regex(/[0-9]/, { message: 'Doit contenir au moins un chiffre' }),
    confirmPassword: z.string(),
    displayName: z.string().trim().min(2).max(100).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

// ============================================================================
// PROSPECT/CONTACT SCHEMAS
// ============================================================================

export const prospectSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: 'Prénom requis' })
    .max(100, { message: 'Prénom trop long' }),
  lastName: z
    .string()
    .trim()
    .min(1, { message: 'Nom requis' })
    .max(100, { message: 'Nom trop long' }),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  company: z.string().trim().max(200).optional(),
  position: z.string().trim().max(100).optional(),
  notes: z.string().max(5000).optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Email ou téléphone requis',
  path: ['email'],
});

// ============================================================================
// WHATSAPP SCHEMAS
// ============================================================================

export const whatsappPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d]{10,15}$/, {
    message: 'Numéro WhatsApp invalide (format: +22997123456)',
  });

export const whatsappMessageSchema = z.object({
  to: whatsappPhoneSchema,
  message: z.string().trim().min(1).max(4096),
  botId: botIdSchema.optional(),
});

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

export const apiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
});

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> };

/**
 * Validate data against a Zod schema
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format Zod errors into user-friendly messages
  const errors: Record<string, string[]> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(err.message);
  });

  return { success: false, errors };
}

/**
 * Validate and throw if invalid
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join('; ');
    throw new Error(`Validation failed: ${errorMessages}`);
  }
  return result.data;
}
