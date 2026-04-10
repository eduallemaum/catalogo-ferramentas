import { useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          onCapture(blob);
        });
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleClose = () => {
    stopCamera();
    onCancel();
  };

  // Start camera on mount
  useState(() => {
    startCamera();
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4"
    >
      <div className="relative w-full max-w-md aspect-[3/4] bg-wood-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-wood-800">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white bg-black/60">
                <p>{error}</p>
              </div>
            )}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8">
              <button
                onClick={handleClose}
                className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"
              >
                <X size={24} />
              </button>
              <button
                onClick={capturePhoto}
                disabled={!!error}
                className="p-6 bg-white rounded-full text-wood-900 shadow-xl hover:scale-110 active:scale-90 transition-all disabled:opacity-50"
              >
                <Camera size={32} />
              </button>
              <div className="w-14" /> {/* Spacer */}
            </div>
          </>
        ) : (
          <>
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 px-6">
              <button
                onClick={handleRetake}
                className="flex-1 btn-secondary bg-white/20 backdrop-blur-md text-white border-none hover:bg-white/30"
              >
                <RefreshCw size={20} />
                Repetir
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 btn-primary bg-green-600 hover:bg-green-700 text-white"
              >
                <Check size={20} />
                Usar Foto
              </button>
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      
      <p className="mt-6 text-wood-300 text-sm font-medium">
        {capturedImage ? 'Gostou da foto?' : 'Posicione a ferramenta no centro'}
      </p>
    </motion.div>
  );
}
