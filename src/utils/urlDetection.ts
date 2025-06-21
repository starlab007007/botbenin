
// Utility functions for URL detection and processing
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
    'flickr.com',
    'photobucket.com',
    'tinypic.com',
    'imageshack.com'
  ];

  static detectUrlType(url: string): UrlInfo {
    const urlInfo: UrlInfo = {
      url,
      type: 'regular'
    };

    // Check for Google Sheets
    if (url.includes('docs.google.com/spreadsheets')) {
      urlInfo.type = 'google_sheet';
      urlInfo.processedUrl = this.convertGoogleSheetToImage(url);
      return urlInfo;
    }

    // Check for Google Docs
    if (url.includes('docs.google.com/document')) {
      urlInfo.type = 'google_doc';
      urlInfo.processedUrl = this.convertGoogleDocToImage(url);
      return urlInfo;
    }

    // Check for Google Drive
    if (url.includes('drive.google.com/file/d/') || url.includes('googleusercontent.com')) {
      urlInfo.type = 'image';
      urlInfo.processedUrl = this.convertGoogleDriveUrl(url);
      return urlInfo;
    }

    // Check for image extensions
    if (this.imageExtensions.test(url)) {
      urlInfo.type = 'image';
      urlInfo.processedUrl = url;
      return urlInfo;
    }

    // Check for image domains
    if (this.imageDomains.some(domain => url.includes(domain))) {
      urlInfo.type = 'image';
      urlInfo.processedUrl = url;
      return urlInfo;
    }

    return urlInfo;
  }

  private static convertGoogleSheetToImage(url: string): string {
    try {
      // Extract sheet ID from various Google Sheets URL formats
      let sheetId = '';
      
      const patterns = [
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
        /\/spreadsheets\/u\/\d+\/d\/([a-zA-Z0-9-_]+)/,
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
        // Convert to image export URL
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=png&gid=0`;
      }
    } catch (error) {
      console.warn('Failed to convert Google Sheet URL:', error);
    }
    
    return url;
  }

  private static convertGoogleDocToImage(url: string): string {
    try {
      // Extract document ID from Google Docs URL
      const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      
      if (match && match[1]) {
        const docId = match[1];
        // Convert to image export URL
        return `https://docs.google.com/document/d/${docId}/export?format=png`;
      }
    } catch (error) {
      console.warn('Failed to convert Google Doc URL:', error);
    }
    
    return url;
  }

  private static convertGoogleDriveUrl(url: string): string {
    try {
      // Convert Google Drive sharing URLs to direct view URLs
      if (url.includes('drive.google.com/file/d/')) {
        const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
        }
      }
      
      // Handle other Google Drive formats
      if (url.includes('docs.google.com/') && !url.includes('export=download')) {
        return url + (url.includes('?') ? '&' : '?') + 'export=download';
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
