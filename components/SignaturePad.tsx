import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Pen } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  color: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setIsEmpty(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).nativeEvent.offsetY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).nativeEvent.offsetY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
        onSave(canvasRef.current.toDataURL());
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setIsEmpty(true);
      onSave('');
    }
  };

  // Adjust canvas size for high DPI
  useEffect(() => {
     // Initial setup if needed
  }, []);

  return (
    <div className="flex flex-col gap-2">
        <div className="border-2 border-slate-200 rounded-lg bg-white overflow-hidden touch-none relative">
            <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="w-full h-[200px] cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
            {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300">
                    <span className="text-xl">Sign Here</span>
                </div>
            )}
        </div>
        <div className="flex justify-between items-center text-sm">
             <span className="text-slate-500">Draw above</span>
             <button onClick={clear} className="flex items-center gap-1 text-red-500 hover:text-red-600">
                 <Eraser size={14} /> Clear
             </button>
        </div>
    </div>
  );
};

export default SignaturePad;