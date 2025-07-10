
// Utility functions for URL detection and processing (ultra-optimisées)
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
    'cloudinary.com'
  ];

  static detectUrlType(url: string): UrlInfo {
    const urlInfo: UrlInfo = {
      url,
      type: 'regular'
    };

    // Google Sheets - détection rapide
    if (url.includes('docs.google.com/spreadsheets')) {
      urlInfo.type = 'google_sheet';
      urlInfo.processedUrl = this.convertGoogleSheetToImage(url);
      return urlInfo;
    }

    // Google Docs - détection rapide
    if (url.includes('docs.google.com/document')) {
      urlInfo.type = 'google_doc';
      urlInfo.processedUrl = this.convertGoogleDocToImage(url);
      return urlInfo;
    }

    // Google Drive - détection rapide
    if (url.includes('drive.google.com/file/d/') || url.includes('googleusercontent.com')) {
      urlInfo.type = 'image';
      urlInfo.processedUrl = this.convertGoogleDriveUrl(url);
      return urlInfo;
    }

    // Extensions d'images - test rapide
    if (this.imageExtensions.test(url)) {
      urlInfo.type = 'image';
      urlInfo.processedUrl = url;
      return urlInfo;
    }

    // Domaines d'images - recherche optimisée
    for (const domain of this.imageDomains) {
      if (url.includes(domain)) {
        urlInfo.type = 'image';
        urlInfo.processedUrl = url;
        return urlInfo;
      }
    }

    return urlInfo;
  }

  private static convertGoogleSheetToImage(url: string): string {
    try {
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match?.[1]) {
        return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=png&size=0&gid=0`;
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
