
import React, { useState, useEffect, useRef } from 'react';
import { UrlInfo } from '@/utils/urlDetection';

interface OptimizedImageDisplayProps {
  urlInfo: UrlInfo;
  content?: string;
  className?: string;
  showPrice?: boolean;
}

export const OptimizedImageDisplay: React.FC<OptimizedImageDisplayProps> = ({ 
  urlInfo, 
  content = '', 
  className = '',
  showPrice = false 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Optimisation URL immédiate
  const optimizeUrl = (url: string): string => {
    if (!url) return '';
    
    // Google Drive - conversion directe
    if (url.includes('drive.google.com/file/d/')) {
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch?.[1]) {
        return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
      }
    }
    
    // Google Sheets
    if (url.includes('docs.google.com/spreadsheets')) {
      const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetIdMatch?.[1]) {
        return `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=png&size=0&gid=0`;
      }
    }
    
    // Dropbox
    if (url.includes('dropbox.com')) {
      return url.replace('?dl=0', '?raw=1');
    }
    
    // Imgur optimisation
    if (url.includes('imgur.com')) {
      return url.replace(/[bmts]\.jpg$/, '.jpg').replace(/[bmts]\.png$/, '.png');
    }
    
    return url;
  };

  // Extraction prix rapide
  const extractPrice = (text: string): string | null => {
    if (!showPrice || !text) return null;
    
    const pricePatterns = [
      /(\d+(?:\s?\d{3})*)\s*FCFA/gi,
      /(\d+(?:\s?\d{3})*)\s*CFA/gi,
      /(\d+(?:[,\.]\d+)*)\s*€/gi,
      /\$(\d+(?:[,\.]\d+)*)/gi,
    ];
    
    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    return null;
  };

  useEffect(() => {
    // Nettoyer les timeouts précédents
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const originalUrl = urlInfo.processedUrl || urlInfo.url;
    if (!originalUrl) {
      setImageError(true);
      return;
    }

    const optimizedUrl = optimizeUrl(originalUrl);
    setImageUrl(optimizedUrl);
    setImageLoaded(false);
    setImageError(false);

    // Timeout agressif de 4 secondes
    timeoutRef.current = setTimeout(() => {
      if (!imageLoaded) {
        console.warn('Image timeout:', optimizedUrl);
        setImageError(true);
      }
    }, 4000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [urlInfo.processedUrl, urlInfo.url, imageLoaded]);

  const handleImageLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    console.warn('Image error:', imageUrl);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setImageError(true);
    setImageLoaded(false);
  };

  // Si erreur, ne rien afficher
  if (imageError || !imageUrl) {
    return null;
  }

  const detectedPrice = extractPrice(content);

  return (
    <div className="my-2 max-w-lg">
      {/* Loading léger */}
      {!imageLoaded && !imageError && (
        <div className="flex items-center justify-center min-h-[100px] bg-gray-50 rounded-md border animate-pulse">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-400 rounded-full animate-spin"></div>
            <span className="text-xs text-gray-500">Chargement...</span>
          </div>
        </div>
      )}

      {/* Image optimisée */}
      {imageUrl && (
        <div className="relative overflow-hidden rounded-md shadow-sm hover:shadow-md transition-shadow duration-200">
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Image"
            className={`${imageLoaded ? 'block' : 'hidden'} w-full h-auto object-contain max-h-[250px] transition-opacity duration-200 ${className}`}
            loading="eager"
            decoding="sync"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ imageRendering: 'auto' }}
          />
          
          {/* Prix en overlay */}
          {detectedPrice && imageLoaded && (
            <div className="absolute top-1 left-1">
              <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold shadow">
                {detectedPrice}
              </div>
            </div>
          )}

          {/* Badge optimisé */}
          {imageLoaded && (
            <div className="absolute top-1 right-1">
              <div className="bg-black/40 text-white text-xs px-1 py-0.5 rounded">
                ✓
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
