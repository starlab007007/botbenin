import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * Lightweight SEO component — updates document.title and meta description
 * without requiring react-helmet-async.
 */
export const SEO = ({ title, description, children }: SEOProps) => {
  useEffect(() => {
    if (title) {
      const previous = document.title;
      document.title = title;
      return () => {
        document.title = previous;
      };
    }
  }, [title]);

  useEffect(() => {
    if (!description) return;
    let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const created = !tag;
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'description');
      document.head.appendChild(tag);
    }
    const previous = tag.getAttribute('content');
    tag.setAttribute('content', description);
    return () => {
      if (created) {
        tag?.parentNode?.removeChild(tag);
      } else if (previous !== null) {
        tag?.setAttribute('content', previous);
      }
    };
  }, [description]);

  // Allow <title>/<meta> children for compatibility — extract their text/content.
  useEffect(() => {
    if (!children) return;
    // No-op: children are accepted for API compatibility but not rendered.
  }, [children]);

  return null;
};

export { SEO as Helmet };
export default SEO;
