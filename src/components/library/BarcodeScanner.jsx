import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BarcodeScanner({ onScanSuccess, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    // Get available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera for mobile
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0];
          setSelectedCamera(backCamera.id);
        } else {
          toast.error("Aucune caméra détectée sur cet appareil");
        }
      })
      .catch((err) => {
        console.error("Error getting cameras:", err);
        toast.error("Impossible d'accéder à la caméra");
      });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!selectedCamera) {
      toast.error("Veuillez sélectionner une caméra");
      return;
    }

    try {
      html5QrCodeRef.current = new Html5Qrcode("barcode-scanner");
      
      await html5QrCodeRef.current.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.777778
        },
        (decodedText, decodedResult) => {
          // Successfully scanned
          console.log("Scanned:", decodedText);
          onScanSuccess(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Scanning in progress, errors are expected
        }
      );

      setScanning(true);
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast.error("Erreur lors du démarrage du scanner");
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && scanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        setScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <Camera className="w-12 h-12 mx-auto mb-2" style={{ color: 'var(--deep-pink)' }} />
        <p className="text-sm" style={{ color: 'var(--dark-text)' }}>
          Scannez le code-barre ISBN de votre livre
        </p>
      </div>

      {cameras.length > 1 && !scanning && (
        <div>
          <label className="text-sm font-medium mb-2 block">Sélectionner une caméra</label>
          <select
            value={selectedCamera || ''}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="w-full p-2 border-2 rounded-lg"
            style={{ borderColor: 'var(--beige)' }}
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div 
        id="barcode-scanner"
        className="rounded-xl overflow-hidden"
        style={{
          minHeight: scanning ? '300px' : '0px',
          backgroundColor: scanning ? '#000' : 'transparent'
        }}
      />

      <div className="flex gap-3">
        {!scanning ? (
          <Button
            onClick={startScanning}
            disabled={!selectedCamera}
            className="flex-1 text-white font-medium py-6"
            style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
          >
            <Camera className="w-5 h-5 mr-2" />
            Démarrer le scan
          </Button>
        ) : (
          <Button
            onClick={stopScanning}
            variant="outline"
            className="flex-1 py-6"
          >
            <X className="w-5 h-5 mr-2" />
            Arrêter
          </Button>
        )}
      </div>

      <div className="p-4 rounded-xl text-sm" style={{ backgroundColor: 'var(--cream)' }}>
        <p className="font-medium mb-2" style={{ color: 'var(--dark-text)' }}>
          💡 Conseils pour un meilleur scan :
        </p>
        <ul className="text-xs space-y-1" style={{ color: 'var(--warm-pink)' }}>
          <li>• Assurez-vous d'avoir un bon éclairage</li>
          <li>• Tenez le code-barre stable dans le cadre</li>
          <li>• Le code-barre se trouve généralement au dos du livre</li>
        </ul>
      </div>
    </div>
  );
}