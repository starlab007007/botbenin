import React, { useEffect, useMemo } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

function extractFromChildren(children: React.ReactNode): { title?: string; description?: string } {
  let title: string | undefined;
  let description: string | undefined;
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const type = child.type as string;
    if (type === 'title') {
      const c = (child.props as { children?: React.ReactNode }).children;
      title = React.Children.toArray(c).map((x) => (typeof x === 'string' || typeof x === 'number' ? String(x) : '')).join('');
    } else if (type === 'meta') {
      const props = child.props as { name?: string; content?: string };
      if (props.name === 'description' && props.content) description = props.content;
    }
  });
  return { title, description };
}

/**
 * Lightweight SEO component — updates document.title and meta description
 * without requiring react-helmet-async.
 */
export const SEO = ({ title: titleProp, description: descriptionProp, children }: SEOProps) => {
  const { title: childTitle, description: childDescription } = useMemo(
    () => extractFromChildren(children),
    [children],
  );
  const title = titleProp ?? childTitle;
  const description = descriptionProp ?? childDescription;

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
