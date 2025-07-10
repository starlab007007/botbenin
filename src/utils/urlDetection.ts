
// Enhanced utility functions for URL detection and processing
export interface UrlInfo {
  url: string;
  type: 'image' | 'google_sheet' | 'google_doc' | 'regular';
  processedUrl?: string;
  priority?: number; // For loading priority
}

export class UrlDetector {
  private static imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff|avif)(\?.*)?$/i;
  
  private static imageDomains = [
    'imgur.com',
    'drive.google.com',
    'docs.google.com',
    'googleusercontent.com',
    'dropbox.com',
    'ibb.co',
    'postimg.cc',
    'imgbb.com',
    'unsplash.com',
    'pixabay.com',
    'pexels.com',
    'cloudinary.com',
    'amazonaws.com',
    'cloudfront.net',
    'fastly.com',
    'githubusercontent.com'
  ];

  // Enhanced URL validation
  private static isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  static detectUrlType(url: string): UrlInfo {
    if (!this.isValidImageUrl(url)) {
      return { url, type: 'regular', priority: 0 };
    }

    const urlInfo: UrlInfo = {
      url,
      type: 'regular',
      priority: 1
    };

    // Google Sheets - high priority
    if (url.includes('docs.google.com/spreadsheets')) {
      urlInfo.type = 'google_sheet';
      urlInfo.processedUrl = this.convertGoogleSheetToImage(url);
      urlInfo.priority = 3;
      return urlInfo;
    }

    // Google Docs - high priority
    if (url.includes('docs.google.com/document')) {
      urlInfo.type = 'google_doc';
      urlInfo.processedUrl = this.convertGoogleDocToImage(url);
      urlInfo.priority = 3;
      return urlInfo;
    }

    // Google Drive - medium priority
    if (url.includes('drive.google.com/file/d/') || url.includes('googleusercontent.com')) {
      urlInfo.type = 'image';
      urlInfo.processedUrl = this.convertGoogleDriveUrl(url);
      urlInfo.priority = 2;
      return urlInfo;
    }

    // Direct image extensions - highest priority
    if (this.imageExtensions.test(url)) {
      urlInfo.type = 'image';
      urlInfo.processedUrl = this.optimizeDirectImageUrl(url);
      urlInfo.priority = 4;
      return urlInfo;
    }

    // Known image domains - medium priority
    for (const domain of this.imageDomains) {
      if (url.includes(domain)) {
        urlInfo.type = 'image';
        urlInfo.processedUrl = this.optimizeImageDomainUrl(url, domain);
        urlInfo.priority = 2;
        return urlInfo;
      }
    }

    return urlInfo;
  }

  private static optimizeDirectImageUrl(url: string): string {
    // Add cache busting and optimization parameters
    const urlObj = new URL(url);
    
    // For some CDNs, add optimization parameters
    if (url.includes('unsplash.com')) {
      urlObj.searchParams.set('auto', 'format');
      urlObj.searchParams.set('fit', 'max');
      urlObj.searchParams.set('w', '800');
    }
    
    return urlObj.toString();
  }

  private static optimizeImageDomainUrl(url: string, domain: string): string {
    try {
      switch (domain) {
        case 'imgur.com':
          // Remove size modifiers for better quality
          return url.replace(/[bmts]\.jpg$/, '.jpg').replace(/[bmts]\.png$/, '.png');
        
        case 'dropbox.com':
          return url.replace('?dl=0', '?raw=1').replace('?dl=1', '?raw=1');
        
        case 'amazonaws.com':
        case 'cloudfront.net':
          // These are usually already optimized
          return url;
        
        default:
          return url;
      }
    } catch (error) {
      console.warn('Failed to optimize URL for domain:', domain, error);
      return url;
    }
  }

  private static convertGoogleSheetToImage(url: string): string {
    try {
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match?.[1]) {
        // Use export format with better quality settings
        return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=png&size=0&gid=0&portrait=false&fitw=true`;
      }
    } catch (error) {
      console.warn('Failed to convert Google Sheet URL:', error);
    }
    return url;
  }

  private static convertGoogleDocToImage(url: string): string {
    try {
      const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (match?.[1]) {
        return `https://docs.google.com/document/d/${match[1]}/export?format=png`;
      }
    } catch (error) {
      console.warn('Failed to convert Google Doc URL:', error);
    }
    return url;
  }

  private static convertGoogleDriveUrl(url: string): string {
    try {
      if (url.includes('drive.google.com/file/d/')) {
        const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch?.[1]) {
          return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
        }
      }
      
      // Handle Google Drive direct links
      if (url.includes('googleusercontent.com')) {
        return url;
      }
    } catch (error) {
      console.warn('Failed to convert Google Drive URL:', error);
    }
    return url;
  }

  static extractUrls(text: string): UrlInfo[] {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]\(\)]+)/gi;
    const urls: UrlInfo[] = [];
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      const urlInfo = this.detectUrlType(match[0]);
      if (urlInfo.type !== 'regular') {
        urls.push(urlInfo);
      }
    }

    // Sort by priority (higher priority first)
    return urls.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
}
