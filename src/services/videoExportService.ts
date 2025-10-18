export type ExportFormat = 'mp4' | 'gif';
export type ExportResolution = '1080p' | '720p' | '480p';
export type Platform = 'tiktok' | 'facebook' | 'instagram' | 'youtube' | 'generic';

export interface ExportConfig {
  format: ExportFormat;
  resolution: ExportResolution;
  platform: Platform;
  aspectRatio?: '9:16' | '1:1' | '16:9';
}

export interface PlatformSpecs {
  name: string;
  icon: string;
  defaultAspectRatio: '9:16' | '1:1' | '16:9';
  maxDuration: number; // en secondes
  recommendedResolution: ExportResolution;
  formats: ExportFormat[];
  instructions: string;
}

class VideoExportService {
  /**
   * Spécifications des plateformes
   */
  getPlatformSpecs(): Record<Platform, PlatformSpecs> {
    return {
      tiktok: {
        name: 'TikTok',
        icon: '🎵',
        defaultAspectRatio: '9:16',
        maxDuration: 60,
        recommendedResolution: '1080p',
        formats: ['mp4'],
        instructions: 'Téléchargez la vidéo puis partagez-la sur TikTok depuis votre appareil mobile.'
      },
      instagram: {
        name: 'Instagram Reels',
        icon: '📸',
        defaultAspectRatio: '9:16',
        maxDuration: 90,
        recommendedResolution: '1080p',
        formats: ['mp4'],
        instructions: 'Ouvrez Instagram > Reels > Importer la vidéo depuis votre galerie.'
      },
      facebook: {
        name: 'Facebook',
        icon: '👥',
        defaultAspectRatio: '1:1',
        maxDuration: 240,
        recommendedResolution: '1080p',
        formats: ['mp4'],
        instructions: 'Partagez la vidéo directement sur votre fil ou en Story.'
      },
      youtube: {
        name: 'YouTube Shorts',
        icon: '▶️',
        defaultAspectRatio: '9:16',
        maxDuration: 60,
        recommendedResolution: '1080p',
        formats: ['mp4'],
        instructions: 'Ouvrez YouTube > Créer > Importer un Short depuis votre appareil.'
      },
      generic: {
        name: 'Générique',
        icon: '💾',
        defaultAspectRatio: '16:9',
        maxDuration: 600,
        recommendedResolution: '1080p',
        formats: ['mp4', 'gif'],
        instructions: 'Vidéo optimisée pour un usage général.'
      }
    };
  }

  /**
   * Obtient les dimensions selon la résolution et le ratio
   */
  getDimensions(resolution: ExportResolution, aspectRatio: '9:16' | '1:1' | '16:9'): { width: number; height: number } {
    const resolutionMap: Record<ExportResolution, number> = {
      '1080p': 1080,
      '720p': 720,
      '480p': 480
    };

    const height = resolutionMap[resolution];

    const dimensions: Record<string, { width: number; height: number }> = {
      '9:16': { width: Math.round(height * (9 / 16)), height },
      '1:1': { width: height, height },
      '16:9': { width: Math.round(height * (16 / 9)), height }
    };

    return dimensions[aspectRatio];
  }

  /**
   * Génère les hashtags optimisés pour une plateforme
   */
  generateHashtags(platform: Platform, keywords: string[] = []): string[] {
    const baseHashtags: Record<Platform, string[]> = {
      tiktok: ['#TikTok', '#Viral', '#PourtToi', '#Trending'],
      instagram: ['#Reels', '#InstaReels', '#Viral', '#Explore'],
      facebook: ['#Facebook', '#Video', '#Viral'],
      youtube: ['#Shorts', '#YouTubeShorts', '#Viral'],
      generic: ['#Video', '#Content', '#Digital']
    };

    const platformTags = baseHashtags[platform] || baseHashtags.generic;
    const customTags = keywords.map(k => `#${k.replace(/\s+/g, '')}`);

    return [...platformTags, ...customTags].slice(0, 10); // Max 10 hashtags
  }

  /**
   * Génère une description optimisée pour SEO
   */
  generateSEODescription(title: string, platform: Platform, scriptText?: string): string {
    const platformSpecs = this.getPlatformSpecs()[platform];
    const maxLength = platform === 'tiktok' ? 150 : 2200;

    let description = title;
    
    if (scriptText) {
      // Ajouter un extrait du script
      const excerpt = scriptText.slice(0, 100);
      description += `\n\n${excerpt}${scriptText.length > 100 ? '...' : ''}`;
    }

    description += `\n\n${platformSpecs.instructions}`;

    // Tronquer si trop long
    if (description.length > maxLength) {
      description = description.slice(0, maxLength - 3) + '...';
    }

    return description;
  }

  /**
   * Obtient l'URL de téléchargement optimisée
   */
  getDownloadUrl(videoUrl: string, config: ExportConfig): string {
    // Dans un vrai système, on appellerait un service de transcodage
    // Pour l'instant, on retourne l'URL directe
    return videoUrl;
  }

  /**
   * Génère les métadonnées pour le partage
   */
  generateShareMetadata(params: {
    title: string;
    description?: string;
    platform: Platform;
    videoUrl: string;
    thumbnailUrl?: string;
    hashtags?: string[];
  }) {
    const { title, description, platform, videoUrl, thumbnailUrl, hashtags } = params;
    const specs = this.getPlatformSpecs()[platform];

    return {
      title,
      description: description || this.generateSEODescription(title, platform),
      url: videoUrl,
      thumbnail: thumbnailUrl,
      hashtags: hashtags || this.generateHashtags(platform),
      platform: specs.name,
      instructions: specs.instructions
    };
  }

  /**
   * Télécharge une vidéo avec le nom et format appropriés
   */
  async downloadVideo(url: string, fileName: string, format: ExportFormat = 'mp4'): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      console.log('Téléchargement lancé:', fileName);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      throw new Error('Impossible de télécharger la vidéo');
    }
  }
}

export const videoExportService = new VideoExportService();
