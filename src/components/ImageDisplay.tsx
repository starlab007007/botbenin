
import React, { useState, useEffect } from 'react';
import { UrlInfo } from '@/utils/urlDetection';
import { ImageViewer } from '@/components/ImageViewer';

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
    // Démarrer le timer de chargement
    setStartTime(Date.now());
    setImageLoaded(false);
    setImageError(false);
    setLoadingTime(0);
  }, [urlInfo.processedUrl, urlInfo.url]);

  const handleImageLoad = () => {
    if (startTime) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // en secondes
      setLoadingTime(duration);
    }
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  // Si erreur de chargement, ne rien afficher (pas de message d'erreur visible)
  if (imageError) {
    return null;
  }

  return (
    <div className="my-4">
      {/* État de chargement avec durée */}
      {!imageLoaded && !imageError && (
        <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-gray-100 mb-2">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600 font-medium">Chargement de l'image...</span>
            {startTime && (
              <span className="text-xs text-gray-500">
                {((Date.now() - startTime) / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </div>
      )}

      {/* Image avec zoom - UNIQUEMENT l'image, rien d'autre */}
      {!imageError && (
        <div className="relative">
          <ImageViewer
            src={urlInfo.processedUrl || urlInfo.url}
            alt="Image partagée"
            className={`${imageLoaded ? 'block' : 'hidden'} ${className || ''} w-full max-w-full h-auto rounded-lg shadow-md`}
          />
          
          {/* Affichage du temps de chargement une fois l'image chargée */}
          {imageLoaded && loadingTime > 0 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              {loadingTime.toFixed(1)}s
            </div>
          )}
        </div>
      )}

      {/* Image cachée pour la détection de chargement avec optimisation */}
      <img 
        src={urlInfo.processedUrl || urlInfo.url}
        alt=""
        className="hidden"
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
};
