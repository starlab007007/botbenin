/**
 * Custom Hook - Safe Input Handling
 * Valide et sanitize automatiquement les inputs utilisateur
 */

import { useState, useCallback } from 'react';
import { XSSProtection } from '@/services/security/xssProtection';
import { toast } from 'sonner';

interface UseSafeInputOptions {
  maxLength?: number;
  allowHtml?: boolean;
  onXSSDetected?: () => void;
}

/**
 * Hook pour gérer les inputs avec protection XSS automatique
 */
export const useSafeInput = (initialValue = '', options: UseSafeInputOptions = {}) => {
  const { maxLength, allowHtml = false, onXSSDetected } = options;
  
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((newValue: string) => {
    // Check for XSS
    if (XSSProtection.detectXSS(newValue)) {
      setError('Contenu non autorisé détecté');
      toast.error('Contenu non autorisé détecté', {
        description: 'Le texte contient des caractères interdits',
      });
      
      onXSSDetected?.();
      
      // Sanitize and set
      const sanitized = XSSProtection.sanitizeText(newValue);
      setValue(sanitized);
      return;
    }

    // Check max length
    if (maxLength && newValue.length > maxLength) {
      setError(`Maximum ${maxLength} caractères`);
      return;
    }

    // Sanitize based on options
    const sanitized = allowHtml
      ? XSSProtection.sanitizeBasicHtml(newValue)
      : XSSProtection.sanitizeText(newValue);

    setError(null);
    setValue(sanitized);
  }, [maxLength, allowHtml, onXSSDetected]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
  }, [initialValue]);

  return {
    value,
    setValue: handleChange,
    error,
    reset,
    isValid: !error && value.length > 0,
  };
};

/**
 * Hook pour sanitizer plusieurs champs de formulaire
 */
export const useSafeForm = <T extends Record<string, any>>(initialValues: T) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const handleChange = useCallback((field: keyof T, value: any) => {
    // Detect XSS
    if (typeof value === 'string' && XSSProtection.detectXSS(value)) {
      setErrors(prev => ({
        ...prev,
        [field]: 'Contenu non autorisé',
      }));
      
      toast.error('Contenu non autorisé détecté', {
        description: `Le champ "${String(field)}" contient des caractères interdits`,
      });
      
      // Sanitize
      const sanitized = XSSProtection.sanitizeText(value);
      setValues(prev => ({ ...prev, [field]: sanitized }));
      return;
    }

    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });

    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const sanitizeAll = useCallback((): T => {
    return XSSProtection.sanitizeFormData(values) as T;
  }, [values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  const hasErrors = Object.keys(errors).length > 0;

  return {
    values,
    errors,
    handleChange,
    sanitizeAll,
    reset,
    isValid: !hasErrors,
  };
};
