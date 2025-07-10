
interface CacheEntry {
  url: string;
  status: 'loading' | 'loaded' | 'error';
  timestamp: number;
  retryCount: number;
}

class ImageCacheManager {
  private cache = new Map<string, CacheEntry>();
  private maxRetries = 2;
  private cacheExpiry = 30 * 60 * 1000; // 30 minutes
  private loadingPromises = new Map<string, Promise<boolean>>();

  // Preload image and cache result
  async preloadImage(url: string): Promise<boolean> {
    if (!url) return false;

    // Check if already in progress
    const existingPromise = this.loadingPromises.get(url);
    if (existingPromise) {
      return existingPromise;
    }

    // Check cache first
    const cached = this.cache.get(url);
    if (cached) {
      const isExpired = Date.now() - cached.timestamp > this.cacheExpiry;
      if (!isExpired) {
        if (cached.status === 'loaded') return true;
        if (cached.status === 'error' && cached.retryCount >= this.maxRetries) return false;
      }
    }

    // Create loading promise
    const loadPromise = this.loadImageWithRetry(url);
    this.loadingPromises.set(url, loadPromise);

    try {
      const result = await loadPromise;
      this.loadingPromises.delete(url);
      return result;
    } catch (error) {
      this.loadingPromises.delete(url);
      return false;
    }
  }

  private async loadImageWithRetry(url: string): Promise<boolean> {
    const cached = this.cache.get(url);
    const retryCount = cached?.retryCount || 0;

    // Update cache to loading state
    this.cache.set(url, {
      url,
      status: 'loading',
      timestamp: Date.now(),
      retryCount
    });

    return new Promise((resolve) => {
      const img = new Image();
      
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        cleanup();
        this.cache.set(url, {
          url,
          status: 'loaded',
          timestamp: Date.now(),
          retryCount: 0
        });
        resolve(true);
      };

      img.onerror = () => {
        cleanup();
        const newRetryCount = retryCount + 1;
        
        if (newRetryCount <= this.maxRetries) {
          // Retry with exponential backoff
          setTimeout(() => {
            this.cache.delete(url);
            this.loadImageWithRetry(url).then(resolve);
          }, Math.pow(2, newRetryCount) * 1000);
        } else {
          this.cache.set(url, {
            url,
            status: 'error',
            timestamp: Date.now(),
            retryCount: newRetryCount
          });
          resolve(false);
        }
      };

      // Set a reasonable timeout
      setTimeout(() => {
        cleanup();
        img.onerror?.(new Event('timeout'));
      }, 10000);

      img.src = url;
    });
  }

  getStatus(url: string): 'loading' | 'loaded' | 'error' | 'unknown' {
    const cached = this.cache.get(url);
    if (!cached) return 'unknown';
    
    const isExpired = Date.now() - cached.timestamp > this.cacheExpiry;
    if (isExpired) {
      this.cache.delete(url);
      return 'unknown';
    }
    
    return cached.status;
  }

  clearExpiredEntries(): void {
    const now = Date.now();
    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheExpiry) {
        this.cache.delete(url);
      }
    }
  }

  // Get cache stats for debugging
  getStats() {
    const stats = { loaded: 0, loading: 0, error: 0, total: this.cache.size };
    for (const entry of this.cache.values()) {
      stats[entry.status]++;
    }
    return stats;
  }
}

export const imageCache = new ImageCacheManager();

// Clear expired entries every 5 minutes
setInterval(() => {
  imageCache.clearExpiredEntries();
}, 5 * 60 * 1000);
