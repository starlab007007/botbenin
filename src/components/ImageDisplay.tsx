
import React, { useState, useEffect } from 'react';
import { UrlInfo } from '@/utils/urlDetection';

interface ImageDisplayProps {
  urlInfo: UrlInfo;
  className?: string;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ urlInfo, className }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    setStartTime(Date.now());
    setImageLoaded(false);
    setImageError(false);
    setLoadingTime(0);

    // Timeout pour éviter les chargements infinis (réduit à 8 secondes)
    const timeout = setTimeout(() => {
      if (!imageLoaded) {
        console.warn('Timeout de chargement d\'image atteint');
        setImageError(true);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [urlInfo.processedUrl, urlInfo.url, imageLoaded]);

  const handleImageLoad = () => {
    if (startTime) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      setLoadingTime(duration);
    }
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    console.warn('Erreur de chargement d\'image:', urlInfo.url);
    setImageError(true);
    setImageLoaded(false);
  };

  if (imageError) {
    return null;
  }

  return (
    <div className="my-4">
      {/* État de chargement simplifié */}
      {!imageLoaded && !imageError && (
        <div className="flex items-center justify-center min-h-[150px] bg-gray-100 rounded-lg border border-gray-200 mb-3">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent"></div>
            <span className="text-sm text-gray-600">Chargement...</span>
          </div>
        </div>
      )}

      {/* Container d'image optimisé */}
      {!imageError && (
        <div className="relative group">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg">
            <img
              src={urlInfo.processedUrl || urlInfo.url}
              alt="Image"
              className={`${imageLoaded ? 'block' : 'hidden'} ${className || ''} w-full h-auto object-contain max-h-[400px] transition-opacity duration-200`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
              style={{ imageRendering: 'auto' }}
            />
          </div>
          
          {/* Badge de temps de chargement */}
          {imageLoaded && loadingTime > 0 && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {loadingTime.toFixed(1)}s
            </div>
          )}
        </div>
      )}
    </div>
  );
};
