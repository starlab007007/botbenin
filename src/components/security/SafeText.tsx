/**
 * SafeText Component - Protection XSS
 * Sanitize automatiquement tout contenu utilisateur avant affichage
 */

import React from 'react';
import DOMPurify from 'dompurify';

interface SafeTextProps {
  children: string;
  allowHtml?: boolean;
  maxLength?: number;
  className?: string;
  as?: 'div' | 'span' | 'p';
}

/**
 * Composant qui sanitize automatiquement le contenu pour prévenir les attaques XSS
 */
export const SafeText: React.FC<SafeTextProps> = ({
  children,
  allowHtml = false,
  maxLength,
  className = '',
  as: Component = 'span',
}) => {
  if (!children) return null;

  let content = children;

  // Truncate if maxLength specified
  if (maxLength && content.length > maxLength) {
    content = content.substring(0, maxLength) + '...';
  }

  // If HTML is allowed, sanitize with DOMPurify
  if (allowHtml) {
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
    });

    return (
      <Component
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  // Default: escape all HTML
  return <Component className={className}>{content}</Component>;
};

/**
 * Hook pour sanitizer du texte
 */
export const useSafeText = (text: string, allowHtml = false): string => {
  if (!text) return '';

  if (allowHtml) {
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }

  return text;
};

/**
 * Sanitize texte pour utilisation dans les attributs
 */
export const sanitizeAttribute = (value: string): string => {
  if (!value) return '';
  
  return value
    .replace(/[<>'"]/g, '') // Remove dangerous characters
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};

/**
 * Sanitize URL pour prévenir javascript: et data: URIs
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';

  // Remove dangerous protocols
  const cleaned = url.trim();
  
  if (
    cleaned.startsWith('javascript:') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('vbscript:')
  ) {
    return '';
  }

  return cleaned;
};

/**
 * Composant SafeLink qui sanitize les URLs
 */
export const SafeLink: React.FC<{
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
}> = ({ href, children, className, target = '_blank' }) => {
  const safeHref = sanitizeUrl(href);

  if (!safeHref) {
    return <span className={className}>{children}</span>;
  }

  return (
    <a
      href={safeHref}
      className={className}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
};
