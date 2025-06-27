
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
    setStartTime(Date.now());
    setImageLoaded(false);
    setImageError(false);
    setLoadingTime(0);
  }, [urlInfo.processedUrl, urlInfo.url]);

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
    setImageError(true);
    setImageLoaded(false);
  };

  if (imageError) {
    return null;
  }

  return (
    <div className="my-6">
      {/* État de chargement optimisé */}
      {!imageLoaded && !imageError && (
        <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm mb-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-blue-200 opacity-25"></div>
            </div>
            <div className="text-center">
              <span className="text-base font-semibold text-gray-700 block">Chargement de l'image HD...</span>
              {startTime && (
                <span className="text-sm text-gray-500 mt-1 block">
                  {((Date.now() - startTime) / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Container d'image professionnel avec AspectRatio */}
      {!imageError && (
        <div className="relative group">
          {/* Wrapper avec ombre et bordure professionnelle */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <ImageViewer
              src={urlInfo.processedUrl || urlInfo.url}
              alt="Image haute définition"
              className={`${imageLoaded ? 'block' : 'hidden'} ${className || ''} w-full h-auto object-contain max-h-[600px] transition-opacity duration-300`}
            />
          </div>
          
          {/* Badge de temps de chargement avec design amélioré */}
          {imageLoaded && loadingTime > 0 && (
            <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20">
              ⚡ {loadingTime.toFixed(1)}s
            </div>
          )}

          {/* Indicateur de zoom au survol */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-200 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-lg font-medium shadow-lg">
              🔍 Cliquer pour agrandir
            </div>
          </div>
        </div>
      )}

      {/* Image cachée pour la détection de chargement avec optimisations HD */}
      <img 
        src={urlInfo.processedUrl || urlInfo.url}
        alt=""
        className="hidden"
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        style={{ imageRendering: 'high-quality' }}
      />
    </div>
  );
};
