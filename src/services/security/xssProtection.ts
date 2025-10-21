/**
 * XSS Protection Service
 * Protection complète contre les attaques Cross-Site Scripting
 */

import DOMPurify from 'dompurify';

/**
 * Configuration stricte de DOMPurify
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
};

const BASIC_HTML_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li', 'span', 'div'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
};

const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'span', 'div'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
  ALLOW_DATA_ATTR: false,
};

export class XSSProtection {
  /**
   * Sanitize texte - Supprime TOUT le HTML
   */
  static sanitizeText(input: string): string {
    if (!input) return '';
    return DOMPurify.sanitize(input, STRICT_CONFIG);
  }

  /**
   * Sanitize HTML basique - Garde quelques balises sûres
   */
  static sanitizeBasicHtml(input: string): string {
    if (!input) return '';
    return DOMPurify.sanitize(input, BASIC_HTML_CONFIG);
  }

  /**
   * Sanitize HTML riche - Pour éditeurs de texte
   */
  static sanitizeRichText(input: string): string {
    if (!input) return '';
    return DOMPurify.sanitize(input, RICH_TEXT_CONFIG);
  }

  /**
   * Sanitize attribut HTML
   */
  static sanitizeAttribute(value: string): string {
    if (!value) return '';
    
    return value
      .replace(/[<>"'`]/g, '') // Remove dangerous characters
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/data:/gi, '')
      .trim();
  }

  /**
   * Sanitize URL
   */
  static sanitizeUrl(url: string): string {
    if (!url) return '';

    const cleaned = url.trim();
    
    // Block dangerous protocols
    const dangerousProtocols = [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'about:',
    ];

    for (const protocol of dangerousProtocols) {
      if (cleaned.toLowerCase().startsWith(protocol)) {
        console.warn(`[XSS] Blocked dangerous URL: ${protocol}`);
        return '';
      }
    }

    // Only allow http, https, mailto
    if (cleaned.includes(':')) {
      const protocol = cleaned.split(':')[0].toLowerCase();
      if (!['http', 'https', 'mailto'].includes(protocol)) {
        console.warn(`[XSS] Blocked non-whitelisted protocol: ${protocol}`);
        return '';
      }
    }

    return cleaned;
  }

  /**
   * Sanitize email
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    
    // Basic email validation and sanitization
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleaned = email.trim().toLowerCase();
    
    if (!emailRegex.test(cleaned)) {
      console.warn(`[XSS] Invalid email format blocked: ${email}`);
      return '';
    }

    return cleaned;
  }

  /**
   * Sanitize phone number
   */
  static sanitizePhone(phone: string): string {
    if (!phone) return '';
    
    // Allow only digits, spaces, +, -, (, )
    return phone.replace(/[^0-9\s\+\-\(\)]/g, '').trim();
  }

  /**
   * Sanitize JSON data
   */
  static sanitizeJsonData(data: any): any {
    if (!data) return data;

    if (typeof data === 'string') {
      return this.sanitizeText(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJsonData(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Sanitize key
        const safeKey = this.sanitizeAttribute(key);
        // Sanitize value recursively
        sanitized[safeKey] = this.sanitizeJsonData(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Detect potential XSS patterns
   */
  static detectXSS(input: string): boolean {
    if (!input) return false;

    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<link/i,
      /<meta/i,
      /document\.cookie/i,
      /document\.write/i,
      /window\.location/i,
      /\.innerHTML/i,
      /vbscript:/i,
      /data:text\/html/i,
      /<svg.*onload/i,
      /<img.*onerror/i,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        console.warn(`[XSS] Detected potential XSS pattern: ${pattern}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Validate and sanitize message content
   */
  static sanitizeMessageContent(content: string, allowBasicFormatting = false): string {
    if (!content) return '';

    // Detect XSS
    if (this.detectXSS(content)) {
      console.error('[XSS] XSS attempt blocked in message content');
      return this.sanitizeText(content); // Strip all HTML
    }

    // Allow basic formatting if requested
    if (allowBasicFormatting) {
      return this.sanitizeBasicHtml(content);
    }

    return this.sanitizeText(content);
  }

  /**
   * Sanitize form data
   */
  static sanitizeFormData(formData: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(formData)) {
      const safeKey = this.sanitizeAttribute(key);

      if (typeof value === 'string') {
        // Check if it's a URL
        if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
          sanitized[safeKey] = this.sanitizeUrl(value);
        }
        // Check if it's an email
        else if (key.toLowerCase().includes('email')) {
          sanitized[safeKey] = this.sanitizeEmail(value);
        }
        // Check if it's a phone
        else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('tel')) {
          sanitized[safeKey] = this.sanitizePhone(value);
        }
        // Default: sanitize as text
        else {
          sanitized[safeKey] = this.sanitizeText(value);
        }
      } else {
        sanitized[safeKey] = value;
      }
    }

    return sanitized;
  }

  /**
   * Create Content Security Policy header
   */
  static generateCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
  }
}

/**
 * Export des fonctions utilitaires
 */
export const sanitizeText = XSSProtection.sanitizeText.bind(XSSProtection);
export const sanitizeHtml = XSSProtection.sanitizeBasicHtml.bind(XSSProtection);
export const sanitizeUrl = XSSProtection.sanitizeUrl.bind(XSSProtection);
export const sanitizeEmail = XSSProtection.sanitizeEmail.bind(XSSProtection);
export const sanitizePhone = XSSProtection.sanitizePhone.bind(XSSProtection);
export const sanitizeMessageContent = XSSProtection.sanitizeMessageContent.bind(XSSProtection);
export const sanitizeFormData = XSSProtection.sanitizeFormData.bind(XSSProtection);
export const detectXSS = XSSProtection.detectXSS.bind(XSSProtection);
