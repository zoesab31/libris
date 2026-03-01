import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Crop, ZoomIn, ZoomOut, Minus, Plus } from 'lucide-react';

// aspectRatio: "square" (1:1 circle) or "portrait" (2:3 rectangle)
export default function ImageCropper({ imageUrl, onCropComplete, onCancel, aspectRatio = "square" }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  const W = aspectRatio === "portrait" ? 300 : 400;
  const H = aspectRatio === "portrait" ? 450 : 400;

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
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!img || !canvas || !ctx) return;

    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    const scale = Math.max(W / img.width, H / img.height) * zoom;
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (W - scaledWidth) / 2 + position.x;
    const y = (H - scaledHeight) / 2 + position.y;
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // Draw crop outline
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    if (aspectRatio === "portrait") {
      const pad = 8;
      ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
      // Rule-of-thirds guides
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 3, pad); ctx.lineTo(W / 3, H - pad);
      ctx.moveTo((W * 2) / 3, pad); ctx.lineTo((W * 2) / 3, H - pad);
      ctx.moveTo(pad, H / 3); ctx.lineTo(W - pad, H / 3);
      ctx.moveTo(pad, (H * 2) / 3); ctx.lineTo(W - pad, (H * 2) / 3);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, W / 2 - 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const getEventPos = (e) => {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const handleDown = (e) => {
    const pos = getEventPos(e);
    setIsDragging(true);
    setDragStart({ x: pos.x - position.x, y: pos.y - position.y });
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    const pos = getEventPos(e);
    setPosition({ x: pos.x - dragStart.x, y: pos.y - dragStart.y });
  };

  const handleUp = () => setIsDragging(false);

  const handleCrop = () => {
    const canvas = canvasRef.current;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = W;
    cropCanvas.height = H;
    const cropCtx = cropCanvas.getContext('2d');

    if (aspectRatio !== "portrait") {
      cropCtx.beginPath();
      cropCtx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2);
      cropCtx.closePath();
      cropCtx.clip();
    }

    cropCtx.drawImage(canvas, 0, 0);
    cropCanvas.toBlob((blob) => onCropComplete(blob), 'image/jpeg', 0.95);
  };

  const adjustZoom = (delta) => {
    setZoom(prev => Math.max(0.5, Math.min(4, prev + delta)));
  };

  return (
    <div className="space-y-4">
      <div className="relative flex justify-center">
        <canvas
          ref={canvasRef}
          className="border-2 rounded-lg cursor-move"
          style={{ borderColor: 'var(--beige)', maxWidth: '100%', height: 'auto', touchAction: 'none' }}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
          onTouchStart={handleDown}
          onTouchMove={handleMove}
          onTouchEnd={handleUp}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Button type="button" variant="outline" size="icon" onClick={() => adjustZoom(-0.15)} disabled={zoom <= 0.5}>
            <Minus className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100">
            <ZoomOut className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
            <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
            <ZoomIn className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => adjustZoom(0.15)} disabled={zoom >= 4}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-center" style={{ color: 'var(--warm-pink)' }}>
          Glisse l'image et ajuste le zoom
        </p>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="button" onClick={handleCrop} className="text-white font-medium"
          style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
          <Crop className="w-4 h-4 mr-2" />
          Valider le crop
        </Button>
      </div>
    </div>
  );
}