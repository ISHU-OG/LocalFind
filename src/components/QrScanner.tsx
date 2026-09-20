import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, CameraOff } from 'lucide-react';

interface QrScannerProps {
  onDetect: (text: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onDetect, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        scanLoop();
      } catch {
        setPermissionError(true);
      }
    }

    function scanLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result && result.data) {
        onDetect(result.data);
        return;
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-white font-semibold text-sm">Scan Discount QR Code</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {permissionError ? (
          <div className="text-center px-8">
            <CameraOff size={32} className="text-white/50 mx-auto mb-3" />
            <p className="text-white/80 text-sm">
              Camera access was denied. Allow camera permission or enter the code manually
              instead.
            </p>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 border-2 border-white/70 rounded-2xl" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
