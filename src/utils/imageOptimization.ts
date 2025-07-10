// Utilitaires d'optimisation des images pour tous les bots
export class ImageOptimizer {
  private static cache = new Map<string, { blob: Blob; timestamp: number }>();
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures
  private static readonly MAX_CACHE_SIZE = 50; // Maximum 50 images en cache

  /**
   * Précharge une image de manière optimisée
   */
  static async preloadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Optimisations de chargement
      img.loading = 'eager';
      img.decoding = 'sync';
      img.crossOrigin = 'anonymous';
      
      // Timeout pour éviter les blocages
      const timeout = setTimeout(() => {
        reject(new Error('Timeout lors du chargement de l\'image'));
      }, 15000);
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(url);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Erreur de chargement de l\'image'));
      };
      
      img.src = url;
    });
  }

  /**
   * Met en cache une image pour un accès rapide
   */
  static async cacheImage(url: string): Promise<string> {
    // Vérifier si l'image est déjà en cache et valide
    const cached = this.cache.get(url);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return URL.createObjectURL(cached.blob);
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      
      // Nettoyer le cache si nécessaire
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        this.cleanCache();
      }
      
      // Stocker en cache
      this.cache.set(url, {
        blob,
        timestamp: Date.now()
      });

      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('Impossible de mettre en cache l\'image:', error);
      return url; // Retourner l'URL originale en cas d'erreur
    }
  }

  /**
   * Nettoie le cache des images expirées
   */
  private static cleanCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_DURATION) {
        keysToDelete.push(key);
        // Libérer l'URL de l'objet
        URL.revokeObjectURL(URL.createObjectURL(value.blob));
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Optimise une URL d'image selon les meilleures pratiques
   */
  static optimizeImageUrl(url: string): string {
    // Optimisations spécifiques par plateforme
    if (url.includes('drive.google.com')) {
      return url.replace(/\/view\?usp=sharing/, '/uc?export=view&sz=w2000');
    }

    if (url.includes('dropbox.com')) {
      return url.replace('?dl=0', '?raw=1');
    }

    if (url.includes('onedrive.live.com')) {
      return url.replace(/\/view\.aspx/, '/download');
    }

    // Ajouter des paramètres d'optimisation génériques
    const separator = url.includes('?') ? '&' : '?';
    
    // Éviter les doublons de paramètres
    if (!url.includes('quality=') && !url.includes('q=')) {
      url += `${separator}q=85`;
    }

    return url;
  }

  /**
   * Détecte si une URL est une image valide
   */
  static async isValidImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        timeout: 5000 
      } as RequestInit);
      
      const contentType = response.headers.get('content-type');
      return contentType?.startsWith('image/') || false;
    } catch {
      return false;
    }
  }

  /**
   * Génère des tailles d'images responsives
   */
  static generateResponsiveSizes(baseUrl: string): { [key: string]: string } {
    const sizes = {
      small: '400',
      medium: '800',
      large: '1200',
      xlarge: '2000'
    };

    const responsiveUrls: { [key: string]: string } = {};

    Object.entries(sizes).forEach(([size, width]) => {
      if (baseUrl.includes('unsplash.com')) {
        responsiveUrls[size] = `${baseUrl}&w=${width}`;
      } else if (baseUrl.includes('cloudinary.com')) {
        responsiveUrls[size] = baseUrl.replace(/\/w_\d+/, `/w_${width}`);
      } else {
        // Pour les autres services, utiliser l'URL originale
        responsiveUrls[size] = baseUrl;
      }
    });

    return responsiveUrls;
  }

  /**
   * Nettoie complètement le cache
   */
  static clearCache(): void {
    this.cache.forEach(value => {
      URL.revokeObjectURL(URL.createObjectURL(value.blob));
    });
    this.cache.clear();
  }
}

// Extraction et validation des prix
export class PriceExtractor {
  private static readonly CURRENCY_SYMBOLS = {
    '€': 'EUR',
    '$': 'USD', 
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
    '₽': 'RUB',
    '₩': 'KRW',
    '₪': 'ILS',
    '₦': 'NGN',
    '₵': 'GHS',
    '₡': 'CRC',
    '₨': 'INR',
    '₱': 'PHP'
  };

  private static readonly CURRENCY_CODES = [
    'FCFA', 'CFA', 'XOF', 'XAF', 'MAD', 'TND', 'EGP', 'NGN', 'GHS', 
    'KES', 'UGX', 'TZS', 'ZAR', 'EUR', 'USD', 'GBP', 'JPY', 'CNY', 
    'INR', 'RUB', 'KRW', 'ILS'
  ];

  /**
   * Extrait tous les prix possibles d'un texte
   */
  static extractPrices(text: string): Array<{
    price: string;
    currency: string;
    formatted: string;
    confidence: number;
  }> {
    const prices: Array<{
      price: string;
      currency: string;
      formatted: string;
      confidence: number;
    }> = [];

    // Patterns de prix avec différents niveaux de confiance
    const patterns = [
      // Très haute confiance - prix explicites
      {
        regex: /(?:prix|price|coût|cost|tarif|montant)\s*:?\s*(?:à partir de\s*)?(\d+(?:[,\.\s]\d+)*)\s*(FCFA|CFA|XOF|XAF|MAD|TND|EGP|NGN|GHS|KES|UGX|TZS|ZAR|EUR|USD|GBP|JPY|CNY|INR|RUB|KRW|ILS)/gi,
        confidence: 0.95
      },
      // Haute confiance - symboles de devises
      {
        regex: /([€$£¥₹₽₩₪₦₵₡₨₱])\s*(\d+(?:[,\.\s]\d+)*)/gi,
        confidence: 0.85
      },
      // Moyenne confiance - codes de devises
      {
        regex: /(\d+(?:[,\.\s]\d+)*)\s*(FCFA|CFA|XOF|XAF|MAD|TND|EGP|NGN|GHS|KES|UGX|TZS|ZAR|EUR|USD|GBP|JPY|CNY|INR|RUB|KRW|ILS)/gi,
        confidence: 0.75
      }
    ];

    patterns.forEach(({ regex, confidence }) => {
      const matches = text.matchAll(regex);
      for (const match of matches) {
        let price = '';
        let currency = '';

        if (match[1] && match[2]) {
          // Format: prix + devise
          price = match[1].replace(/[,\s]/g, '');
          currency = match[2];
        } else if (match[0]) {
          // Format: symbole + prix
          const symbol = match[1];
          currency = this.CURRENCY_SYMBOLS[symbol as keyof typeof this.CURRENCY_SYMBOLS] || symbol;
          price = match[2]?.replace(/[,\s]/g, '') || '';
        }

        if (price && currency) {
          prices.push({
            price,
            currency,
            formatted: this.formatPrice(price, currency),
            confidence
          });
        }
      }
    });

    // Trier par confiance et retourner le meilleur résultat
    return prices.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Formate un prix de manière cohérente
   */
  private static formatPrice(price: string, currency: string): string {
    const numericPrice = parseFloat(price.replace(/[^\d\.]/g, ''));
    
    if (isNaN(numericPrice)) return `${price} ${currency}`;

    // Formatage selon la devise
    if (currency === 'FCFA' || currency === 'CFA') {
      return `${numericPrice.toLocaleString('fr-FR')} FCFA`;
    }
    
    if (currency === 'EUR') {
      return `${numericPrice.toLocaleString('fr-FR')} €`;
    }
    
    if (currency === 'USD') {
      return `$${numericPrice.toLocaleString('en-US')}`;
    }

    return `${numericPrice.toLocaleString()} ${currency}`;
  }

  /**
   * Obtient le meilleur prix détecté
   */
  static getBestPrice(text: string): {
    price: string;
    currency: string;
    formatted: string;
  } | null {
    const prices = this.extractPrices(text);
    return prices.length > 0 ? prices[0] : null;
  }
}