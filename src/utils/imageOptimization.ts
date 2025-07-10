
// Utilitaires d'optimisation ultra-rapides
export class ImageOptimizer {
  /**
   * Optimise une URL d'image avec conversion directe
   */
  static optimizeImageUrl(url: string): string {
    if (!url) return '';

    // Google Drive - conversion directe et rapide
    if (url.includes('drive.google.com')) {
      return url.replace(/\/view\?usp=sharing/, '/uc?export=view');
    }

    // Dropbox - conversion directe
    if (url.includes('dropbox.com')) {
      return url.replace('?dl=0', '?raw=1');
    }

    // Imgur - optimisation directe
    if (url.includes('imgur.com')) {
      return url.replace(/[bmts]\.jpg$/, '.jpg').replace(/[bmts]\.png$/, '.png');
    }
    
    return url;
  }

  /**
   * Validation rapide d'URL d'image
   */
  static async isValidImageUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 secondes max
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const contentType = response.headers.get('content-type');
      return contentType?.startsWith('image/') || false;
    } catch {
      return false;
    }
  }
}

// Extraction de prix ultra-rapide
export class PriceExtractor {
  private static readonly PRICE_PATTERNS = [
    /(\d+(?:\s?\d{3})*)\s*FCFA/gi,
    /(\d+(?:\s?\d{3})*)\s*CFA/gi,
    /(\d+(?:[,\.]\d+)*)\s*€/gi,
    /\$(\d+(?:[,\.]\d+)*)/gi,
    /£(\d+(?:[,\.]\d+)*)/gi,
  ];

  /**
   * Extraction rapide du premier prix trouvé
   */
  static getBestPrice(text: string): {
    price: string;
    currency: string;
    formatted: string;
  } | null {
    if (!text) return null;

    for (const pattern of this.PRICE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const fullMatch = match[0];
        const numericPart = match[1] || match[0].replace(/[^\d,\.]/g, '');
        
        // Formatage rapide
        if (fullMatch.includes('FCFA') || fullMatch.includes('CFA')) {
          return {
            price: numericPart,
            currency: 'FCFA',
            formatted: `${numericPart} FCFA`
          };
        }
        
        if (fullMatch.includes('€')) {
          return {
            price: numericPart,
            currency: 'EUR',
            formatted: `${numericPart} €`
          };
        }
        
        if (fullMatch.includes('$')) {
          return {
            price: numericPart,
            currency: 'USD',
            formatted: `$${numericPart}`
          };
        }
        
        if (fullMatch.includes('£')) {
          return {
            price: numericPart,
            currency: 'GBP',
            formatted: `£${numericPart}`
          };
        }

        // Fallback
        return {
          price: numericPart,
          currency: 'UNKNOWN',
          formatted: fullMatch
        };
      }
    }
    
    return null;
  }

  /**
   * Extraction complète des prix (pour compatibilité)
   */
  static extractPrices(text: string): Array<{
    price: string;
    currency: string;
    formatted: string;
    confidence: number;
  }> {
    const bestPrice = this.getBestPrice(text);
    if (bestPrice) {
      return [{
        ...bestPrice,
        confidence: 0.9
      }];
    }
    return [];
  }
}
