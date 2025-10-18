export interface ShareData {
  title: string;
  description: string;
  url: string;
  hashtags: string[];
}

class SocialShareService {
  /**
   * Copie le texte dans le presse-papiers
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Erreur copie presse-papiers:', error);
      return false;
    }
  }

  /**
   * Partage natif (Web Share API)
   */
  async shareNative(data: ShareData): Promise<boolean> {
    if (!navigator.share) {
      console.warn('Web Share API non disponible');
      return false;
    }

    try {
      await navigator.share({
        title: data.title,
        text: `${data.description}\n\n${data.hashtags.join(' ')}`,
        url: data.url
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // L'utilisateur a annulé
        return false;
      }
      console.error('Erreur partage natif:', error);
      return false;
    }
  }

  /**
   * Génère l'URL de partage pour TikTok
   * Note: TikTok n'a pas d'API de partage direct, on guide l'utilisateur
   */
  getTikTokInstructions(): string {
    return `Pour partager sur TikTok :
1. Téléchargez la vidéo sur votre appareil
2. Ouvrez l'app TikTok
3. Appuyez sur le bouton "+"
4. Sélectionnez "Importer" et choisissez votre vidéo
5. Ajoutez les hashtags suggérés
6. Publiez !`;
  }

  /**
   * Génère l'URL de partage pour Facebook
   */
  getFacebookShareUrl(url: string, quote?: string): string {
    const params = new URLSearchParams({
      u: url,
      ...(quote && { quote })
    });
    return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
  }

  /**
   * Génère l'URL de partage pour Twitter/X
   */
  getTwitterShareUrl(text: string, url: string, hashtags: string[]): string {
    const params = new URLSearchParams({
      text,
      url,
      hashtags: hashtags.map(h => h.replace('#', '')).join(',')
    });
    return `https://twitter.com/intent/tweet?${params.toString()}`;
  }

  /**
   * Génère l'URL de partage pour LinkedIn
   */
  getLinkedInShareUrl(url: string): string {
    const params = new URLSearchParams({ url });
    return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
  }

  /**
   * Génère l'URL de partage pour WhatsApp
   */
  getWhatsAppShareUrl(text: string): string {
    const params = new URLSearchParams({ text });
    return `https://wa.me/?${params.toString()}`;
  }

  /**
   * Génère l'URL de partage pour Telegram
   */
  getTelegramShareUrl(url: string, text: string): string {
    const params = new URLSearchParams({ url, text });
    return `https://t.me/share/url?${params.toString()}`;
  }

  /**
   * Ouvre une fenêtre de partage
   */
  openShareWindow(url: string, width = 600, height = 600): void {
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
      url,
      'share',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,copyhistory=no`
    );
  }

  /**
   * Partage sur une plateforme spécifique
   */
  async shareOnPlatform(platform: string, data: ShareData): Promise<void> {
    const text = `${data.title}\n\n${data.description}\n\n${data.hashtags.join(' ')}`;

    switch (platform.toLowerCase()) {
      case 'facebook':
        this.openShareWindow(this.getFacebookShareUrl(data.url, data.description));
        break;

      case 'twitter':
      case 'x':
        this.openShareWindow(this.getTwitterShareUrl(data.title, data.url, data.hashtags));
        break;

      case 'linkedin':
        this.openShareWindow(this.getLinkedInShareUrl(data.url));
        break;

      case 'whatsapp':
        this.openShareWindow(this.getWhatsAppShareUrl(text));
        break;

      case 'telegram':
        this.openShareWindow(this.getTelegramShareUrl(data.url, data.title));
        break;

      case 'copy':
        await this.copyToClipboard(`${text}\n\n${data.url}`);
        break;

      default:
        // Essayer le partage natif
        await this.shareNative(data);
    }
  }
}

export const socialShareService = new SocialShareService();
