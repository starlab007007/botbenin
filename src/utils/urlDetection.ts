
// Utility functions for URL detection and processing (optimisées)
export interface UrlInfo {
  url: string;
  type: 'image' | 'google_sheet' | 'google_doc' | 'regular';
  processedUrl?: string;
}

export class UrlDetector {
  private static imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff)(\?.*)?$/i;
  
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
    'pinterest.com',
    'instagram.com'
  ];

  static detectUrlType(url: string): UrlInfo {
    const urlInfo: UrlInfo = {
      url,
      type: 'regular'
    };

    // Google Sheets - optimisé
    if (url.includes('docs.google.com/spreadsheets')) {
      urlInfo.type = 'google_sheet';
      urlInfo.processedUrl = this.convertGoogleSheetToImage(url);
      return urlInfo;
    }

    // Google Docs - optimisé
    if (url.includes('docs.google.com/document')) {
      urlInfo.type = 'google_doc';
      urlInfo.processedUrl = this.convertGoogleDocToImage(url);
      return urlInfo;
    }

    // Google Drive - optimisé
    if (url.includes('drive.google.com/file/d/') || url.includes('googleusercontent.com')) {
      urlInfo.type = 'image';
      urlInfo.processedUrl = this.convertGoogleDriveUrl(url);
      return urlInfo;
    }

    // Extensions d'images
    if (this.imageExtensions.test(url)) {
      urlInfo.type = 'image';
      urlInfo.processedUrl = this.enhanceImageUrl(url);
      return urlInfo;
    }

    // Domaines d'images
    if (this.imageDomains.some(domain => url.includes(domain))) {
      urlInfo.type = 'image';
      urlInfo.processedUrl = this.enhanceImageUrl(url);
      return urlInfo;
    }

    return urlInfo;
  }

  private static enhanceImageUrl(url: string): string {
    // Optimisations légères pour la vitesse
    if (url.includes('imgur.com')) {
      return url.replace(/[bmts]\.jpg$/, '.jpg').replace(/[bmts]\.png$/, '.png');
    }
    
    if (url.includes('googleusercontent.com')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}sz=w800`;
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

  private static convertGoogleSheetToImage(url: string): string {
    try {
      let sheetId = '';
      
      const patterns = [
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
        /key=([a-zA-Z0-9-_]+)/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          sheetId = match[1];
          break;
        }
      }

      if (sheetId) {
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=png&size=0&gid=0`;
      }
    } catch (error) {
      console.warn('Failed to convert Google Sheet URL:', error);
    }
    
    return url;
  }

  private static convertGoogleDocToImage(url: string): string {
    try {
      const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      
      if (match && match[1]) {
        const docId = match[1];
        return `https://docs.google.com/document/d/${docId}/export?format=png`;
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
        if (fileIdMatch && fileIdMatch[1]) {
          return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}&sz=w800`;
        }
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
      urls.push(urlInfo);
    }

    return urls;
  }
}
