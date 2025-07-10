
import React, { useState, useEffect, useMemo } from 'react';
import { UrlInfo } from '@/utils/urlDetection';
import { PriceExtractor } from '@/utils/imageOptimization';

interface ProductImageDisplayProps {
  urlInfo: UrlInfo;
  content: string;
  className?: string;
}

export const ProductImageDisplay: React.FC<ProductImageDisplayProps> = ({ 
  urlInfo, 
  content, 
  className 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');

  // Extraction des prix simplifiée
  const extractedPrice = useMemo(() => {
    return PriceExtractor.getBestPrice(content);
  }, [content]);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // URL optimisée mais sans cache complexe
        const baseUrl = urlInfo.processedUrl || urlInfo.url;
        const optimizedUrl = optimizeUrl(baseUrl);
        
        setImageUrl(optimizedUrl);
        
        // Timeout pour éviter les chargements infinis
        const timeout = setTimeout(() => {
          if (!imageLoaded) {
            setImageError(true);
          }
        }, 7000);

        // Nettoyer le timeout si l'image se charge
        if (imageLoaded) {
          clearTimeout(timeout);
        }

      } catch (error) {
        console.warn('Erreur lors du chargement:', error);
        setImageUrl(urlInfo.processedUrl || urlInfo.url);
      }
    };

    if (urlInfo.processedUrl || urlInfo.url) {
      loadImage();
    }
  }, [urlInfo.processedUrl, urlInfo.url, imageLoaded]);

  // Fonction d'optimisation simplifiée
  const optimizeUrl = (url: string): string => {
    // Optimisations légères pour éviter la complexité
    if (url.includes('drive.google.com')) {
      return url.replace(/\/view\?usp=sharing/, '/uc?export=view&sz=w800');
    }
    
    if (url.includes('unsplash.com')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}w=800&q=75`;
    }

    return url;
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    console.warn('Erreur de chargement d\'image produit');
    setImageError(true);
    setImageLoaded(false);
  };

  if (imageError) return null;

  const hasPrice = extractedPrice && extractedPrice.price && extractedPrice.currency;

  return (
    <div className="my-3 max-w-xl">
      {/* Loading simplifié */}
      {!imageLoaded && !imageError && (
        <div className="flex items-center justify-center min-h-[120px] bg-gray-100 rounded-lg border animate-pulse">
          <div className="flex items-center space-y-2">
            <div className="w-6 h-6 bg-blue-400 rounded-full animate-spin border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm text-gray-600 ml-2">Chargement...</span>
          </div>
        </div>
      )}

      {/* Image optimisée */}
      {imageUrl && !imageError && (
        <div className="relative overflow-hidden rounded-lg shadow-md transition-all duration-200 hover:shadow-lg">
          <img
            src={imageUrl}
            alt="Image produit"
            className={`${imageLoaded ? 'block' : 'hidden'} w-full h-auto object-contain max-h-[300px] transition-opacity duration-200 ${className || ''}`}
            style={{ imageRendering: 'auto' }}
            loading="lazy"
            decoding="async"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          
          {/* Prix en overlay simplifié */}
          {hasPrice && imageLoaded && (
            <div className="absolute top-2 left-2">
              <div className="bg-red-500 text-white px-3 py-1 rounded-lg shadow-md">
                <span className="font-bold">
                  {extractedPrice!.formatted}
                </span>
              </div>
            </div>
          )}

          {/* Badge qualité */}
          {imageLoaded && (
            <div className="absolute top-2 right-2">
              <div className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                Optimisé
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info prix en dessous */}
      {hasPrice && imageLoaded && (
        <div className="mt-2 flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded p-2">
          <span>Prix détecté</span>
          <span className="font-semibold text-gray-800">
            {extractedPrice!.formatted}
          </span>
        </div>
      )}
    </div>
  );
};
