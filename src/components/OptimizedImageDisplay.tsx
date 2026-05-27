
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UrlInfo } from '@/utils/urlDetection';
import { imageCache } from '@/utils/imageCache';
import { ChatImageLightbox } from '@/app-mobile/components/ChatImageLightbox';

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
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [finalImageUrl, setFinalImageUrl] = useState<string>('');
  const [detectedPrice, setDetectedPrice] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const mountedRef = useRef(true);

  // Extract price function
  const extractPrice = useCallback((text: string): string | null => {
    if (!showPrice || !text) return null;
    
    const pricePatterns = [
      /(\d+(?:\s?\d{3})*)\s*(?:FCFA|CFA)/gi,
      /(\d+(?:[,\.]\d+)*)\s*€/gi,
      /\$(\d+(?:[,\.]\d+)*)/gi,
      /(\d+(?:[,\.]\d+)*)\s*(?:USD|EUR|GBP)/gi,
    ];
    
    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }, [showPrice]);

  // URL optimization function
  const optimizeImageUrl = useCallback((url: string): string => {
    if (!url) return '';
    
    try {
      // Google Drive optimization
      if (url.includes('drive.google.com/file/d/')) {
        const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch?.[1]) {
          return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
        }
      }
      
      // Google Sheets optimization
      if (url.includes('docs.google.com/spreadsheets')) {
        const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetIdMatch?.[1]) {
          return `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=png&size=0&gid=0&portrait=false&fitw=true`;
        }
      }
      
      // Dropbox optimization
      if (url.includes('dropbox.com')) {
        return url.replace(/\?dl=0$/, '?raw=1').replace(/\?dl=1$/, '?raw=1');
      }
      
      // Imgur optimization
      if (url.includes('imgur.com')) {
        return url.replace(/[bmts]\.jpg$/, '.jpg').replace(/[bmts]\.png$/, '.png');
      }
      
      return url;
    } catch (error) {
      console.warn('URL optimization failed:', error);
      return url;
    }
  }, []);

  // Initialize component
  useEffect(() => {
    mountedRef.current = true;
    
    const processUrl = async () => {
      const originalUrl = urlInfo.processedUrl || urlInfo.url;
      if (!originalUrl) {
        setImageStatus('error');
        return;
      }

      const optimizedUrl = optimizeImageUrl(originalUrl);
      setFinalImageUrl(optimizedUrl);

      // Extract price if needed
      if (showPrice && content) {
        const price = extractPrice(content);
        setDetectedPrice(price);
      }

      // Check cache first
      const cacheStatus = imageCache.getStatus(optimizedUrl);
      if (cacheStatus === 'loaded') {
        if (mountedRef.current) {
          setImageStatus('loaded');
        }
        return;
      }
      
      if (cacheStatus === 'error') {
        if (mountedRef.current) {
          setImageStatus('error');
        }
        return;
      }

      // Start loading
      setImageStatus('loading');
      
      try {
        const success = await imageCache.preloadImage(optimizedUrl);
        if (mountedRef.current) {
          setImageStatus(success ? 'loaded' : 'error');
        }
      } catch (error) {
        console.warn('Image preload failed:', error);
        if (mountedRef.current) {
          setImageStatus('error');
        }
      }
    };

    processUrl();

    return () => {
      mountedRef.current = false;
    };
  }, [urlInfo.url, urlInfo.processedUrl, optimizeImageUrl, extractPrice, content, showPrice]);

  // Handle image load events
  const handleImageLoad = useCallback(() => {
    if (mountedRef.current) {
      setImageStatus('loaded');
    }
  }, []);

  const handleImageError = useCallback(() => {
    console.warn('Direct image load failed:', finalImageUrl);
    if (mountedRef.current) {
      setImageStatus('error');
    }
  }, [finalImageUrl]);

  // Don't render anything if error or no URL
  if (imageStatus === 'error' || !finalImageUrl) {
    return null;
  }

  return (
    <div className="my-2 max-w-lg">
      {/* Enhanced loading state */}
      {imageStatus === 'loading' && (
        <div className="flex items-center justify-center min-h-[120px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 animate-pulse">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <div className="w-8 h-8 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-8 h-8 border-3 border-transparent border-b-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-blue-700 animate-pulse">Chargement de l'image...</div>
              <div className="text-xs text-blue-500 mt-1">Optimisation en cours</div>
            </div>
          </div>
        </div>
      )}

      {/* Image display */}
      {imageStatus === 'loaded' && finalImageUrl && (
        <div className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 group cursor-zoom-in"
          role="button"
          tabIndex={0}
          onClick={() => setLightboxOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLightboxOpen(true); }}
        >
          <img
            ref={imgRef}
            src={finalImageUrl}
            alt="Image"
            className={`w-full h-auto object-contain max-h-[400px] transition-all duration-300 group-hover:scale-[1.02] ${className}`}
            loading="lazy"
            decoding="async"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ imageRendering: 'auto', transform: 'translateZ(0)' }}
          />
          
          {/* Price overlay */}
          {detectedPrice && (
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                {detectedPrice}
              </div>
            </div>
          )}

          {/* Success indicator */}
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span>Optimisé</span>
            </div>
          </div>

          {/* Image type indicator */}
          {urlInfo.type !== 'image' && (
            <div className="absolute bottom-2 right-2 z-10">
              <div className="bg-blue-500/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                {urlInfo.type === 'google_sheet' ? 'Google Sheet' : 
                 urlInfo.type === 'google_doc' ? 'Google Doc' : 'Document'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
