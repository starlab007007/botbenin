import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UrlInfo } from '@/utils/urlDetection';
import { ImageViewer } from '@/components/ImageViewer';
import { ImageOptimizationService, OptimizedImageData } from '@/services/imageOptimization';

interface OptimizedImageDisplayProps {
  urlInfo: UrlInfo;
  className?: string;
  lazy?: boolean;
  containerWidth?: number;
}

export const OptimizedImageDisplay: React.FC<OptimizedImageDisplayProps> = ({ 
  urlInfo, 
  className, 
  lazy = true,
  containerWidth = 800
}) => {
  const [imageData, setImageData] = useState<OptimizedImageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const [loadingStage, setLoadingStage] = useState<'thumbnail' | 'optimized' | 'complete'>('thumbnail');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer pour le lazy loading
  useEffect(() => {
    if (!lazy || isVisible) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, isVisible]);

  // Chargement optimisé de l'image
  const loadOptimizedImage = useCallback(async () => {
    if (!isVisible) return;

    try {
      setIsLoading(true);
      setError(false);
      setLoadingStage('thumbnail');

      const optimizedData = await ImageOptimizationService.loadProgressiveImage(
        urlInfo.processedUrl || urlInfo.url,
        containerWidth
      );

      setImageData(optimizedData);
      setLoadingStage('optimized');
      
      // Précharger l'image haute résolution si nécessaire
      if (optimizedData.originalUrl !== optimizedData.optimizedUrl) {
        ImageOptimizationService.preloadImage(optimizedData.originalUrl, 'low');
      }
      
      setLoadingStage('complete');
    } catch (err) {
      console.error('Erreur lors du chargement de l\'image optimisée:', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [urlInfo, isVisible, containerWidth]);

  useEffect(() => {
    if (isVisible) {
      loadOptimizedImage();
    }
  }, [loadOptimizedImage, isVisible]);

  // Rendu conditionnel basé sur l'état
  if (error) {
    return null;
  }

  if (!isVisible) {
    return (
      <div 
        ref={containerRef}
        className="min-h-[200px] bg-gray-100 rounded-xl flex items-center justify-center"
      >
        <div className="text-gray-500 text-sm">Image en attente de chargement...</div>
      </div>
    );
  }

  if (isLoading || !imageData) {
    return (
      <div 
        ref={containerRef}
        className="flex items-center justify-center min-h-[200px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent"></div>
            <div className="absolute inset-0 rounded-full h-8 w-8 border-3 border-blue-200 opacity-25"></div>
          </div>
          <div className="text-center">
            <span className="text-sm font-medium text-gray-700 block">
              {loadingStage === 'thumbnail' && 'Chargement rapide...'}
              {loadingStage === 'optimized' && 'Optimisation...'}
              {loadingStage === 'complete' && 'Finalisation...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="my-4">
      {/* Container d'image optimisé */}
      <div className="relative group">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
          <ImageViewer
            src={imageData.optimizedUrl}
            alt="Image optimisée"
            className={`w-full h-auto object-contain max-h-[600px] transition-opacity duration-300 ${className || ''}`}
          />
        </div>
        
        {/* Badge de performance */}
        <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 flex items-center space-x-2">
          {imageData.loadTime < 1000 ? (
            <>
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>⚡ {imageData.loadTime}ms</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              <span>🔄 {(imageData.loadTime / 1000).toFixed(1)}s</span>
            </>
          )}
        </div>

        {/* Indicateur de qualité optimisée */}
        <div className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
          HD Optimisé
        </div>

        {/* Indicateur de zoom au survol */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-200 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-lg font-medium shadow-lg">
            🔍 Cliquer pour agrandir
          </div>
        </div>
      </div>

      {/* Informations de débogage en développement */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <div>Dimensions: {imageData.width}x{imageData.height}</div>
          <div>Temps de chargement: {imageData.loadTime}ms</div>
          <div>Format: {imageData.format}</div>
          <div>Thumbnail: {imageData.thumbnailUrl ? 'Oui' : 'Non'}</div>
        </div>
      )}
    </div>
  );
};