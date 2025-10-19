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

  // Write input file
  await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));

  // Convert to MP4 with H.264 codec
  await ffmpeg.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '22',
    '-c:a', 'aac',
    '-b:a', '128k',
    'output.mp4'
  ]);

  // Read output file
  const data = await ffmpeg.readFile('output.mp4');
  
  // Cleanup
  await ffmpeg.deleteFile('input.webm');
  await ffmpeg.deleteFile('output.mp4');

  // Convert FileData to proper format for Blob
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    return new Blob([encoder.encode(data)], { type: 'video/mp4' });
  }
  
  // For Uint8Array, convert to regular array to avoid SharedArrayBuffer issues
  return new Blob([new Uint8Array(data)], { type: 'video/mp4' });
}

export function isVideoFile(url: string): boolean {
  return /\.(webm|mp4|mov|avi|mkv)$/i.test(url);
}

export function getVideoFormat(url: string): string {
  const match = url.match(/\.(\w+)$/i);
  return match ? match[1].toLowerCase() : 'unknown';
}
