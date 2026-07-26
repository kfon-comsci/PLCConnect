import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Trash2, CheckCircle } from 'lucide-react';

interface SignaturePadProps {
  label?: string;
  name?: string;
  onSave: (base64: string) => void;
  savedImage?: string;
  onClear?: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ label, name, onSave, savedImage, onClear }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawed, setHasDrawed] = useState(false);
  const [locked, setLocked] = useState(!!savedImage);

  useEffect(() => {
    setLocked(!!savedImage);
    if (!savedImage) {
      setHasDrawed(false);
    }
  }, [savedImage]);

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setLocked(!!savedImage);
    if (!savedImage) {
      setHasDrawed(false);
      setConfirmingDelete(false);
    }
  }, [savedImage]);

  // Handle high DPI displays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and style
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b'; // dark gray
  }, [locked, savedImage]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (locked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      // Prevent scrolling while drawing on touch devices
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawed(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || locked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const doClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawed(false);
    setLocked(false);
    setConfirmingDelete(false);
    if (onClear) {
      onClear();
    }
  };

  const handleClear = () => {
    setConfirmingDelete(true);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawed) return;

    const base64 = canvas.toDataURL('image/png');
    onSave(base64);
    setLocked(true);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-[#F5F4F7]/40 rounded-2xl border border-gray-100">
      <div className="w-full flex justify-between items-center mb-2">
        <div>
          {label && <span className="text-sm font-semibold text-gray-800 block">{label}</span>}
          {name && <span className="text-xs text-gray-500 font-medium">{name}</span>}
        </div>
        {(locked || savedImage) && (
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> บันทึกแล้ว
          </span>
        )}
      </div>

      <div className="relative w-full h-[120px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
        {savedImage ? (
          <img src={savedImage} alt="Signature" className="max-h-full object-contain p-2" />
        ) : (
          <canvas
            ref={canvasRef}
            width={300}
            height={120}
            className={`w-full h-full cursor-crosshair ${locked ? 'bg-gray-50' : 'bg-white'}`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        )}
        {!hasDrawed && !savedImage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 gap-1.5 text-xs font-medium">
            <Pencil className="w-4 h-4" /> ลงชื่อเข้ากล่องนี้ (นิ้ว/เมาส์)
          </div>
        )}
      </div>

      <div className="w-full flex justify-end gap-2 mt-3">
        {confirmingDelete ? (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200/80 px-2.5 py-1.5 rounded-lg text-xs animate-in fade-in">
            <span className="text-rose-700 font-semibold">ต้องการลบลายเซ็นต์จริงหรือไม่?</span>
            <button
              type="button"
              onClick={doClear}
              className="px-2.5 py-1 bg-rose-600 text-white rounded-md font-bold hover:bg-rose-700 transition cursor-pointer shadow-sm"
            >
              ลบจริง
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        ) : (
          <>
            {(hasDrawed || locked || savedImage) && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/60 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="ลบลายเซ็นต์"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" /> ลบลายเซ็นต์
              </button>
            )}
            {hasDrawed && !locked && !savedImage && (
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#7D57B2] text-white hover:bg-[#6b48a0] rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" /> ยืนยัน
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
