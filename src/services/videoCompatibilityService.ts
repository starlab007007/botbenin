interface CompatibilityResult {
  compatible: boolean;
  codec?: string;
  width?: number;
  height?: number;
  duration?: number;
  error?: any;
  canPlayH264?: boolean;
  canPlayAAC?: boolean;
}

export const checkVideoCompatibility = async (videoUrl: string): Promise<CompatibilityResult> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.preload = 'metadata';

    video.addEventListener('loadedmetadata', () => {
      const canPlayH264 = video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
      const canPlayAAC = video.canPlayType('audio/mp4; codecs="mp4a.40.2"');
      
      resolve({
        compatible: video.videoHeight > 0 && video.videoWidth > 0,
        codec: canPlayH264,
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        canPlayH264: canPlayH264 !== '',
        canPlayAAC: canPlayAAC !== ''
      });
    });

    video.addEventListener('error', () => {
      resolve({ 
        compatible: false, 
        error: video.error 
      });
    });

    // Timeout après 10 secondes
    setTimeout(() => {
      resolve({ 
        compatible: false, 
        error: 'Timeout' 
      });
    }, 10000);
  });
};

export const testVideoPlayback = async (videoUrl: string): Promise<boolean> => {
  try {
    const result = await checkVideoCompatibility(videoUrl);
    return result.compatible && (result.canPlayH264 ?? false);
  } catch (error) {
    console.error('Error testing video playback:', error);
    return false;
  }
};

export const getVideoCodecInfo = (video: HTMLVideoElement): string => {
  // Essayer de détecter le codec
  const canPlayH264 = video.canPlayType('video/mp4; codecs="avc1.42E01E"');
  const canPlayH265 = video.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"');
  
  if (canPlayH264) return 'H.264';
  if (canPlayH265) return 'H.265/HEVC';
  return 'Unknown';
};
