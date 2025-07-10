
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
    'imageshack.com',
    'unsplash.com',
    'pixabay.com',
    'pexels.com',
    'freepik.com',
    'shutterstock.com',
    'gettyimages.com',
    'istockphoto.com',
    'adobe.com',
    'canva.com',
    'pinterest.com',
    'instagram.com',
    'facebook.com',
    'cloudinary.com',
    'images-amazon.com',
    'media-amazon.com',
    'ssl-images-amazon.com'
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
      urlInfo.processedUrl = this.enhanceImageUrl(url);
      return urlInfo;
    }

    // Check for image domains
    if (this.imageDomains.some(domain => url.includes(domain))) {
      urlInfo.type = 'image';
      urlInfo.processedUrl = this.enhanceImageUrl(url);
      return urlInfo;
    }

    return urlInfo;
  }

  private static enhanceImageUrl(url: string): string {
    // Améliorer la qualité des images selon le service
    if (url.includes('imgur.com')) {
      // Remplacer les petites versions par les versions HD
      return url.replace(/[bmts]\.jpg$/, '.jpg').replace(/[bmts]\.png$/, '.png');
    }
    
    if (url.includes('googleusercontent.com')) {
      // Ajouter des paramètres pour une meilleure qualité
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}sz=w2000-h2000`;
    }

    if (url.includes('unsplash.com')) {
      // Optimiser Unsplash pour haute résolution
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}q=80&w=2000&h=2000&fit=max`;
    }

    if (url.includes('pixabay.com')) {
      // Remplacer les miniatures par les images complètes
      return url.replace('_150.', '_1280.').replace('_640.', '_1280.');
    }

    if (url.includes('pexels.com')) {
      // Optimiser Pexels
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}auto=compress&cs=tinysrgb&w=2000`;
    }

    if (url.includes('cloudinary.com')) {
      // Optimiser Cloudinary
      return url.replace(/\/c_scale,w_\d+/, '/c_scale,w_2000').replace(/\/q_\d+/, '/q_auto:best');
    }

    if (url.includes('amazon.com') || url.includes('ssl-images-amazon.com')) {
      // Optimiser les images Amazon
      return url.replace(/\._[A-Z0-9,_]+_\./, '._AC_UL2000_.');
    }
    
    return url;
  }

  private static convertGoogleSheetToImage(url: string): string {
    try {
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
        // Utiliser un format PNG haute qualité
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=png&size=0&fzr=true&gid=0`;
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
        // Utiliser un format PNG haute qualité
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
          // Utiliser une taille maximale pour la qualité HD
          return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}&sz=w2000-h2000`;
        }
      }
      
      if (url.includes('docs.google.com/') && !url.includes('export=download')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}export=download&sz=w2000-h2000`;
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
