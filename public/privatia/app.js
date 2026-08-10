(() => {
  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    document.head.appendChild(script);
  });

  loadScript('/privatia/app-core.js?v=20260810-1')
    .then(() => loadScript('/privatia/journey.js?v=20260810-2'))
    .then(() => loadScript('/privatia/journey-video.js?v=20260810-1'))
    .catch((error) => console.error('[PrivatAI landing]', error));
})();