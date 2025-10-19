import { toast } from "sonner";

export const shareOnWhatsApp = (url: string, message?: string) => {
  const text = encodeURIComponent(message ? `${message}\n${url}` : url);
  window.open(`https://wa.me/?text=${text}`, '_blank');
};

export const shareOnFacebook = (url: string) => {
  const encodedUrl = encodeURIComponent(url);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
};

export const shareOnTikTok = (url: string, title?: string) => {
  // TikTok doesn't have direct URL sharing, copy to clipboard
  navigator.clipboard.writeText(url).then(() => {
    toast.success('Lien copié ! Ouvrez TikTok pour le partager', {
      description: title || 'Collez le lien dans votre vidéo TikTok'
    });
  }).catch(() => {
    toast.error('Erreur lors de la copie du lien');
  });
};

export const shareNative = async (file: Blob, title: string, url?: string) => {
  try {
    const shareData: ShareData = {
      title: title,
      text: `Regardez ma création: ${title}`,
    };

    // Try to share the file directly if supported
    if (navigator.canShare && file) {
      const videoFile = new File([file], `${title}.mp4`, { type: 'video/mp4' });
      if (navigator.canShare({ files: [videoFile] })) {
        shareData.files = [videoFile];
      }
    }

    // Fallback to URL if file sharing not supported
    if (!shareData.files && url) {
      shareData.url = url;
    }

    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      if (url) {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié dans le presse-papier');
      }
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Error sharing:', error);
      toast.error('Erreur lors du partage');
    }
  }
};

export const downloadAsFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
