import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Loader2, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

export default function BarcodeScanner({ onScanSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | starting | live | capturing | found | error
  const [capturedImage, setCapturedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const startCamera = useCallback(async () => {
    setStatus('starting');
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setStatus('live');
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setStatus('error');
      toast.error("Impossible d'accéder à la caméra");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setStatus('capturing');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);

    // Stop camera stream (freeze)
    stopCamera();
    setAnalyzing(true);

    try {
      // Use Html5Qrcode to decode from the captured image
      const html5qr = new Html5Qrcode('offscreen-scanner');
      const result = await html5qr.scanFileV2(dataURLtoFile(imageDataUrl, 'capture.jpg'), false);
      html5qr.clear();

      const cleanISBN = result.decodedText.replace(/[-\s]/g, '');
      setStatus('found');
      setAnalyzing(false);
      onScanSuccess(cleanISBN);
    } catch (err) {
      console.error('Scan failed:', err);
      setAnalyzing(false);
      toast.error("Aucun code-barres détecté. Essaie de recadrer le livre.");
      setStatus('live');
      setCapturedImage(null);
      // Restart camera
      startCamera();
    }
  };

  const retry = () => {
    setCapturedImage(null);
    setStatus('idle');
    startCamera();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden offscreen div for Html5Qrcode */}
      <div id="offscreen-scanner" style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Camera / Capture view */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-black"
        style={{ aspectRatio: '4/3', maxHeight: 260 }}>

        {/* Live video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: capturedImage ? 'none' : 'block' }}
        />

        {/* Frozen capture */}
        {capturedImage && (
          <img src={capturedImage} alt="capture" className="w-full h-full object-cover" />
        )}

        {/* Aim overlay on live */}
        {status === 'live' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white rounded-lg opacity-70"
              style={{ width: '70%', height: 80 }}>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-lg -translate-x-px -translate-y-px" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-lg translate-x-px -translate-y-px" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-lg -translate-x-px translate-y-px" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-lg translate-x-px translate-y-px" />
            </div>
          </div>
        )}

        {/* Starting overlay */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
            <p className="text-white text-sm">Démarrage caméra...</p>
          </div>
        )}

        {/* Analyzing overlay */}
        {analyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
            <p className="text-white text-sm font-semibold">Analyse en cours...</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
            <Camera className="w-10 h-10 text-white/50" />
            <p className="text-white text-sm text-center px-4">Caméra inaccessible</p>
          </div>
        )}
      </div>

      {/* Action button */}
      {status === 'live' && (
        <button
          onClick={captureAndAnalyze}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}
        >
          <Camera className="w-7 h-7 text-white" />
        </button>
      )}

      {(status === 'capturing' && !analyzing) && (
        <button
          onClick={retry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold"
          style={{ background: '#F3E5F5', color: '#9B3EC8' }}
        >
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </button>
      )}

      {analyzing && (
        <p className="text-xs text-center" style={{ color: '#A78BBA' }}>
          Image figée — analyse du code-barres...
        </p>
      )}

      {status === 'live' && (
        <p className="text-xs text-center" style={{ color: '#A78BBA' }}>
          Centre le code-barres dans le cadre, puis appuie sur 📸
        </p>
      )}

      {status === 'error' && (
        <button
          onClick={retry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)', color: 'white' }}
        >
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </button>
      )}
    </div>
  );
}

function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}