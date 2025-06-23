
import React, { useState } from 'react';
import { UrlInfo } from '@/utils/urlDetection';
import { ImageViewer } from '@/components/ImageViewer';

interface ImageDisplayProps {
  urlInfo: UrlInfo;
  className?: string;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ urlInfo, className }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    if (retryCount < maxRetries) {
      // Retry with a slight delay
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageError(false);
      }, 1000 * (retryCount + 1));
    } else {
      setImageError(true);
    }
  };

  const getImageTypeLabel = (type: string) => {
    switch (type) {
      case 'google_sheet':
        return '📊 Google Sheet';
      case 'google_doc':
        return '📄 Google Doc';
      default:
        return '🖼️ Image';
    }
  };

  if (imageError && retryCount >= maxRetries) {
    return (
      <div className="my-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-gray-600 text-sm font-medium">
            {getImageTypeLabel(urlInfo.type)} - Aperçu non disponible
          </span>
        </div>
        <p className="text-gray-500 text-sm">Impossible de charger l'image</p>
      </div>
    );
  }

  return (
    <div className="my-4">
      {/* Type indicator */}
      <div className="mb-2">
        <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
          {getImageTypeLabel(urlInfo.type)}
        </span>
      </div>

      {/* Loading state */}
      {!imageLoaded && !imageError && (
        <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg border border-gray-200 mb-2">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Chargement...</span>
          </div>
        </div>
      )}

      {/* Image with zoom functionality */}
      {!imageError && (
        <ImageViewer
          src={urlInfo.processedUrl || urlInfo.url}
          alt={`${getImageTypeLabel(urlInfo.type)} partagé`}
          className={`${imageLoaded ? 'block' : 'hidden'} ${className || ''}`}
        />
      )}

      {/* Hidden image for loading detection */}
      <img 
        src={urlInfo.processedUrl || urlInfo.url}
        alt=""
        className="hidden"
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="eager"
      />
    </div>
  );
};
