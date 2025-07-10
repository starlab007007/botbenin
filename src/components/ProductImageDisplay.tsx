import React, { useState, useEffect, useMemo } from 'react';
import { UrlInfo } from '@/utils/urlDetection';
import { ImageOptimizer, PriceExtractor } from '@/utils/imageOptimization';

interface ProductImageDisplayProps {
  urlInfo: UrlInfo;
  content: string; // Le texte du message pour extraire les prix
  className?: string;
}

export const ProductImageDisplay: React.FC<ProductImageDisplayProps> = ({ 
  urlInfo, 
  content, 
  className 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [optimizedImageUrl, setOptimizedImageUrl] = useState<string>('');

  // Extraction intelligente des prix avec l'utilitaire optimisé
  const extractedPrice = useMemo(() => {
    return PriceExtractor.getBestPrice(content);
  }, [content]);

  // Optimisation et préchargement des images
  useEffect(() => {
    const loadOptimizedImage = async () => {
      try {
        const baseUrl = urlInfo.processedUrl || urlInfo.url;
        const optimizedUrl = ImageOptimizer.optimizeImageUrl(baseUrl);
        
        // Précharger l'image de manière optimisée
        await ImageOptimizer.preloadImage(optimizedUrl);
        
        // Tenter la mise en cache pour les accès futurs
        const cachedUrl = await ImageOptimizer.cacheImage(optimizedUrl);
        
        setOptimizedImageUrl(cachedUrl);
        setImageLoaded(true);
        setImageError(false);
        
        // Transition douce pour l'affichage
        setTimeout(() => setIsImageVisible(true), 100);
        
      } catch (error) {
        console.warn('Erreur lors du chargement optimisé:', error);
        // Fallback vers l'URL originale
        setOptimizedImageUrl(urlInfo.processedUrl || urlInfo.url);
        setImageLoaded(true);
        setImageError(false);
        setTimeout(() => setIsImageVisible(true), 100);
      }
    };

    if (urlInfo.processedUrl || urlInfo.url) {
      loadOptimizedImage();
    }
  }, [urlInfo.processedUrl, urlInfo.url]);

  if (imageError) return null;

  const hasPrice = extractedPrice && extractedPrice.price && extractedPrice.currency;

  return (
    <div className="my-4 max-w-2xl">
      {/* Loading state optimisé */}
      {!imageLoaded && (
        <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm animate-pulse">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-12 h-12 bg-blue-200 rounded-full animate-spin border-4 border-blue-500 border-t-transparent"></div>
            <span className="text-sm font-medium text-gray-600">Optimisation de l'image...</span>
          </div>
        </div>
      )}

      {/* Image Container avec prix en overlay */}
      {imageLoaded && optimizedImageUrl && (
        <div className={`relative group overflow-hidden rounded-xl shadow-lg transition-all duration-500 ${
          isImageVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {/* Image optimisée */}
          <img
            src={optimizedImageUrl}
            alt="Image produit"
            className={`w-full h-auto object-contain max-h-[500px] transition-all duration-300 hover:scale-105 ${className || ''}`}
            style={{ 
              imageRendering: 'auto',
              filter: 'contrast(1.05) saturate(1.1)' // Légère amélioration visuelle
            }}
            loading="eager"
            decoding="sync"
            onError={() => {
              // Fallback vers l'URL originale en cas d'erreur
              setOptimizedImageUrl(urlInfo.processedUrl || urlInfo.url);
            }}
          />
          
          {/* Prix en overlay - coin supérieur gauche */}
          {hasPrice && (
            <div className="absolute top-3 left-3 z-10">
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm border border-red-400/30 transform transition-all duration-300 hover:scale-110">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold">
                    {extractedPrice!.formatted}
                  </span>
                </div>
                {/* Petit indicateur de prix */}
                <div className="absolute -bottom-1 left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-600"></div>
              </div>
            </div>
          )}

          {/* Badge de qualité HD */}
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full border border-white/20">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span>HD</span>
              </span>
            </div>
          </div>

          {/* Hover overlay pour zoom */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-lg font-medium shadow-lg transform scale-95 group-hover:scale-100 transition-transform duration-200">
              🔍 Cliquer pour agrandir
            </div>
          </div>
        </div>
      )}

      {/* Informations sur le prix (optionnel, en dessous de l'image) */}
      {hasPrice && imageLoaded && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Prix détecté automatiquement</span>
          </div>
          <div className="font-semibold text-gray-800">
            {extractedPrice!.formatted}
          </div>
        </div>
      )}
    </div>
  );
};