import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

export async function loadFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  const ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(Math.round(progress * 100));
    });
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

export async function convertWebMtoMP4(
  webmBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg(onProgress);

  try {
    console.log('🎬 Starting WebM to MP4 conversion...', webmBlob.size, 'bytes');
    
    // Write input file
    await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));

    // Convert to MP4 with maximum compatibility
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',           // Codec H.264
      '-profile:v', 'baseline',    // Profil baseline (le plus compatible)
      '-level', '3.0',             // Niveau compatible iOS/Android
      '-preset', 'medium',         // Équilibre qualité/vitesse
      '-crf', '23',                // Qualité constante (18-28, 23 = bon)
      '-pix_fmt', 'yuv420p',       // Format couleur compatible
      '-movflags', '+faststart',   // Optimisation streaming (metadata au début)
      '-c:a', 'aac',               // Audio AAC
      '-b:a', '128k',              // Bitrate audio
      '-ar', '44100',              // Sample rate standard
      'output.mp4'
    ]);

    // Read output file
    const data = await ffmpeg.readFile('output.mp4');
    
    // Cleanup
    await ffmpeg.deleteFile('input.webm');
    await ffmpeg.deleteFile('output.mp4');

    // Convert to Blob with proper type
    const videoData = data instanceof Uint8Array ? data : new Uint8Array(await (await fetch(data as string)).arrayBuffer());
    const mp4Blob = new Blob([new Uint8Array(videoData)], { type: 'video/mp4' });
    
    console.log('✅ WebM → MP4 conversion successful:', mp4Blob.size, 'bytes');
    return mp4Blob;
    
  } catch (error) {
    console.error('❌ FFmpeg conversion error:', error);
    throw new Error('Échec de la conversion vidéo: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
  }
}

export function isVideoFile(url: string, mimeType?: string): boolean {
  // Si on a le MIME type, l'utiliser en priorité
  if (mimeType) {
    return mimeType.startsWith('video/');
  }
  
  // Pour les blob URLs, on ne peut pas se fier à l'extension
  if (url.startsWith('blob:')) {
    return true; // Assumer vidéo si blob (ou passer le type MIME)
  }
  
  // Sinon, vérifier l'extension
  const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  return ext ? videoExtensions.includes(ext) : false;
}

export function getVideoFormat(url: string, mimeType?: string): string {
  // Priorité au MIME type
  if (mimeType) {
    return mimeType.split('/')[1]?.split(';')[0] || '';
  }
  
  // Pour blob URLs, retourner 'webm' par défaut (format de MediaRecorder)
  if (url.startsWith('blob:')) {
    return 'webm';
  }
  
  // Sinon extraire de l'URL
  return url.split('?')[0].split('.').pop()?.toLowerCase() || '';
}
