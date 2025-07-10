
// Utilitaires d'optimisation des images simplifiés pour améliorer les performances
export class ImageOptimizer {
  /**
   * Optimise une URL d'image avec des paramètres légers
   */
  static optimizeImageUrl(url: string): string {
    // Optimisations simples et rapides
    if (url.includes('drive.google.com')) {
      return url.replace(/\/view\?usp=sharing/, '/uc?export=view&sz=w800');
    }

    if (url.includes('dropbox.com')) {
      return url.replace('?dl=0', '?raw=1');
    }

    if (url.includes('unsplash.com')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}q=75&w=800`;
    }

    if (url.includes('pixabay.com')) {
      return url.replace('_150.', '_640.').replace('_1280.', '_640.');
    }

    if (url.includes('cloudinary.com')) {
      return url.replace(/\/w_\d+/, '/w_800').replace(/\/q_\d+/, '/q_75');
    }
    
    return url;
  }

  /**
   * Vérifie rapidement si une URL est une image
   */
  static async isValidImageUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
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

// Extraction et validation des prix (simplifiée)
export class PriceExtractor {
  private static readonly CURRENCY_SYMBOLS = {
    '€': 'EUR',
    '$': 'USD', 
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
    '₽': 'RUB',
    '₦': 'NGN',
    '₵': 'GHS'
  };

  private static readonly CURRENCY_CODES = [
    'FCFA', 'CFA', 'XOF', 'XAF', 'MAD', 'TND', 'EGP', 'NGN', 'GHS', 
    'EUR', 'USD', 'GBP', 'JPY', 'CNY', 'INR', 'RUB'
  ];

  /**
   * Extrait les prix d'un texte de manière optimisée
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

    // Patterns optimisés
    const patterns = [
      {
        regex: /(?:prix|price|coût|cost)\s*:?\s*(\d+(?:[,\.\s]\d+)*)\s*(FCFA|CFA|EUR|USD|GBP|JPY|CNY|INR|NGN|GHS)/gi,
        confidence: 0.9
      },
      {
        regex: /([€$£¥₹₽₦₵])\s*(\d+(?:[,\.\s]\d+)*)/gi,
        confidence: 0.8
      },
      {
        regex: /(\d+(?:[,\.\s]\d+)*)\s*(FCFA|CFA|EUR|USD|GBP|JPY|CNY|INR|NGN|GHS)/gi,
        confidence: 0.7
      }
    ];

    patterns.forEach(({ regex, confidence }) => {
      const matches = text.matchAll(regex);
      for (const match of matches) {
        let price = '';
        let currency = '';

        if (match[1] && match[2]) {
          price = match[1].replace(/[,\s]/g, '');
          currency = match[2];
        } else if (match[0]) {
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

    return prices.sort((a, b) => b.confidence - a.confidence);
  }

  private static formatPrice(price: string, currency: string): string {
    const numericPrice = parseFloat(price.replace(/[^\d\.]/g, ''));
    
    if (isNaN(numericPrice)) return `${price} ${currency}`;

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
