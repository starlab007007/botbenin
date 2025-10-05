// Performance monitoring utilities

export const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onINP(onPerfEntry); // INP replaced FID in web-vitals v4
      onFCP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    });
  }
};

// Preconnect to important domains
export const preconnectToDomains = (domains: string[]) => {
  domains.forEach((domain) => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// Prefetch critical resources
export const prefetchResource = (url: string, as: string = 'fetch') => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.as = as;
  document.head.appendChild(link);
};

// Lazy load components with retry logic
export const lazyLoadWithRetry = (componentImport: () => Promise<any>, retries = 3) => {
  return new Promise((resolve, reject) => {
    componentImport()
      .then(resolve)
      .catch((error) => {
        if (retries === 0) {
          reject(error);
          return;
        }
        
        setTimeout(() => {
          lazyLoadWithRetry(componentImport, retries - 1)
            .then(resolve)
            .catch(reject);
        }, 1000);
      });
  });
};

// Resource hints for critical assets
export const addResourceHints = () => {
  // Preconnect to important domains
  preconnectToDomains([
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ]);
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  // Report web vitals to analytics
  reportWebVitals((metric) => {
    if (window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }
  });

  // Add resource hints
  addResourceHints();
};
