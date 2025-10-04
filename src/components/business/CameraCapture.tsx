import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, X, RotateCcw, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1920, height: 1080 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
    } catch (err) {
      setError('Impossible d\'accéder à la caméra. Veuillez vérifier les permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(imageData);
    }
  };

  const retake = () => {
    setCapturedImage(null);
  };

  const confirmCapture = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Capture de document</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Camera View */}
        <div className="flex-1 relative bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-white p-6 text-center">
              <div>
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{error}</p>
              </div>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          )}

          {/* Overlay Grid */}
          {!capturedImage && !error && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-2 border-white/30 m-8" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 border-t bg-muted/50">
          {capturedImage ? (
            <div className="flex gap-4 justify-center">
              <Button variant="outline" size="lg" onClick={retake}>
                <RotateCcw className="w-5 h-5 mr-2" />
                Reprendre
              </Button>
              <Button size="lg" onClick={confirmCapture}>
                <Check className="w-5 h-5 mr-2" />
                Valider
              </Button>
            </div>
          ) : (
            <Button
              size="lg"
              onClick={capturePhoto}
              className="w-full"
              disabled={!!error}
            >
              <Camera className="w-5 h-5 mr-2" />
              Capturer
            </Button>
          )}
          
          <p className="text-xs text-center text-muted-foreground mt-4">
            Positionnez le document dans le cadre et capturez
          </p>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
