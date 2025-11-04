import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Crop, ZoomIn, ZoomOut } from 'lucide-react';

export default function ImageCropper({ imageUrl, onCropComplete, onCancel }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      drawImage();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    drawImage();
  }, [zoom, position]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (!img || !canvas) return;

    const size = 400;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);
    
    const scale = Math.max(size / img.width, size / img.height) * zoom;
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    
    const x = (size - scaledWidth) / 2 + position.x;
    const y = (size - scaledHeight) / 2 + position.y;

    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // Draw crop circle
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.stroke();
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    const size = 400;
    
    // Create circular crop
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = size;
    cropCanvas.height = size;
    const cropCtx = cropCanvas.getContext('2d');
    
    cropCtx.beginPath();
    cropCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    cropCtx.closePath();
    cropCtx.clip();
    
    cropCtx.drawImage(canvas, 0, 0);
    
    cropCanvas.toBlob((blob) => {
      onCropComplete(blob);
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="mx-auto border-2 rounded-lg cursor-move"
          style={{ 
            borderColor: 'var(--beige)',
            maxWidth: '100%',
            height: 'auto'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <ZoomOut className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
          <Slider
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
            min={0.5}
            max={3}
            step={0.1}
            className="flex-1"
          />
          <ZoomIn className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
        </div>
        <p className="text-xs text-center" style={{ color: 'var(--warm-pink)' }}>
          Déplacez l'image et ajustez le zoom
        </p>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          onClick={handleCrop}
          className="text-white font-medium"
          style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
        >
          <Crop className="w-4 h-4 mr-2" />
          Valider
        </Button>
      </div>
    </div>
  );
}