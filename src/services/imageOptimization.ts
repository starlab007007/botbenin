// Service d'optimisation des images avec thumbnails adaptatifs et compression
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  thumbnail?: boolean;
}

export interface OptimizedImageData {
  originalUrl: string;
  thumbnailUrl?: string;
  optimizedUrl: string;
  format: string;
  width: number;
  height: number;
  fileSize: number;
  loadTime: number;
}

export class ImageOptimizationService {
  private static cache = new Map<string, OptimizedImageData>();
  private static loadingPromises = new Map<string, Promise<OptimizedImageData>>();

  // Configuration par défaut pour les thumbnails
  private static readonly THUMBNAIL_SIZES = {
    small: { width: 300, height: 200, quality: 75 },
    medium: { width: 600, height: 400, quality: 80 },
    large: { width: 1200, height: 800, quality: 85 }
  };

  // Détection automatique de la taille optimale
  static getOptimalSize(containerWidth: number = 800): keyof typeof ImageOptimizationService.THUMBNAIL_SIZES {
    if (containerWidth <= 400) return 'small';
    if (containerWidth <= 800) return 'medium';
    return 'large';
  }

  // Optimisation des URLs Google Drive et Sheets
  static optimizeGoogleUrl(url: string, options: ImageOptimizationOptions = {}): string {
    const { width = 800, height = 600, quality = 80 } = options;
    
    // Google Drive
    if (url.includes('drive.google.com/file/d/')) {
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch?.[1]) {
        return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w${width}-h${height}-c`;
      }
    }

    // Google Sheets - version optimisée
    if (url.includes('docs.google.com/spreadsheets')) {
      const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetIdMatch?.[1]) {
        return `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=png&size=${width}&fzr=true&gid=0`;
      }
    }

    // Google Docs
    if (url.includes('docs.google.com/document')) {
      const docIdMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (docIdMatch?.[1]) {
        return `https://docs.google.com/document/d/${docIdMatch[1]}/export?format=png`;
      }
    }

    // Autres services avec paramètres d'optimisation
    if (url.includes('googleusercontent.com')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}sz=w${width}-h${height}`;
    }

    return url;
  }

  // Compression d'image côté client avec Canvas
  static async compressImage(
    file: File | string, 
    options: ImageOptimizationOptions = {}
  ): Promise<string> {
    const { width = 800, height = 600, quality = 0.8, format = 'webp' } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculer les dimensions en conservant le ratio
        const aspectRatio = img.width / img.height;
        let targetWidth = width;
        let targetHeight = height;

        if (aspectRatio > 1) {
          targetHeight = targetWidth / aspectRatio;
        } else {
          targetWidth = targetHeight * aspectRatio;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Dessiner l'image redimensionnée
        ctx?.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Convertir en format optimisé
        const mimeType = `image/${format}`;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };

      img.onerror = reject;

      if (typeof file === 'string') {
        img.crossOrigin = 'anonymous';
        img.src = file;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Chargement progressif avec plusieurs qualités
  static async loadProgressiveImage(
    originalUrl: string,
    containerWidth: number = 800
  ): Promise<OptimizedImageData> {
    const cacheKey = `${originalUrl}-${containerWidth}`;
    
    // Vérifier le cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Éviter les requêtes multiples pour la même image
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    const loadingPromise = this._loadImageProgressive(originalUrl, containerWidth);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private static async _loadImageProgressive(
    originalUrl: string,
    containerWidth: number
  ): Promise<OptimizedImageData> {
    const startTime = Date.now();
    const optimalSize = this.getOptimalSize(containerWidth);
    const sizeConfig = this.THUMBNAIL_SIZES[optimalSize];

    // Générer les URLs optimisées
    const thumbnailUrl = this.optimizeGoogleUrl(originalUrl, {
      ...sizeConfig,
      thumbnail: true
    });

    const optimizedUrl = this.optimizeGoogleUrl(originalUrl, sizeConfig);

    // Mesurer les performances de chargement
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        const loadTime = Date.now() - startTime;
        
        resolve({
          originalUrl,
          thumbnailUrl: thumbnailUrl !== originalUrl ? thumbnailUrl : undefined,
          optimizedUrl,
          format: 'auto',
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSize: 0, // Estimation approximative
          loadTime
        });
      };

      img.onerror = reject;
      img.crossOrigin = 'anonymous';
      img.src = optimizedUrl;
    });
  }

  // Préchargement intelligent basé sur la visibilité
  static preloadImage(url: string, priority: 'high' | 'low' = 'low'): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    
    if (priority === 'high') {
      link.setAttribute('fetchpriority', 'high');
    }
    
    document.head.appendChild(link);
  }

  // Nettoyage du cache
  static clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  // Statistiques du cache
  static getCacheStats(): { size: number; hits: number } {
    return {
      size: this.cache.size,
      hits: 0 // TODO: Implémenter le comptage des hits
    };
  }
}