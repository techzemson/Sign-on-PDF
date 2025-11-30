import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, ChevronLeft, ChevronRight, X, Download, MousePointer, Type, Image as ImageIcon, PenTool, Check, Trash2, Copy, Move, Maximize2, Palette, Bold, Italic, Loader2, ZoomIn, ZoomOut, RotateCw, Undo, Redo, Calendar, Stamp, FileCheck, RefreshCw, Eraser, Plus, ALargeSmall, AlertTriangle } from 'lucide-react';
import { UploadedFile, PDFPageInfo, SignatureItem, SignatureType, DocStats, SIGNATURE_FONTS, COLORS, STAMPS, DATE_FORMATS } from './types';
import { loadPDF, generateSignedPDF } from './services/pdfService';
import StatsChart from './components/StatsChart';
import SignaturePad from './components/SignaturePad';

function App() {
  // --- STATE ---
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [pages, setPages] = useState<PDFPageInfo[]>([]);
  const [stats, setStats] = useState<DocStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // History for Undo/Redo
  const [history, setHistory] = useState<SignatureItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [signatures, setSignatures] = useState<SignatureItem[]>([]);

  // View Controls
  const [zoom, setZoom] = useState(1);
  const [fitToWidth, setFitToWidth] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Placement State (The "Ghost" item)
  const [placingItem, setPlacingItem] = useState<{
    type: SignatureType;
    content: string;
    style?: any; 
  } | null>(null);

  // Interaction State
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // For in-place text editing
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  
  // FIXED: Added fontSize to start pos tracking to prevent exponential growth during resize
  const [itemStartPos, setItemStartPos] = useState({ x: 0, y: 0, w: 0, h: 0, fontSize: 0 });
  
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Modal States
  const [showSigModal, setShowSigModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'image'>('type');
  
  // Creation States
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[1]); // Default Blue
  const [customColor, setCustomColor] = useState('#000000');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [drawnData, setDrawnData] = useState('');
  const [uploadedSigImage, setUploadedSigImage] = useState('');
  
  // Ref for main container
  const containerRef = useRef<HTMLDivElement>(null);

  // --- ACTIONS ---

  const pushToHistory = (newSignatures: SignatureItem[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSignatures);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setSignatures(newSignatures);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setSignatures(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setSignatures([]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setSignatures(history[historyIndex + 1]);
    }
  };

  // Reset/Home Handler
  const handleReset = () => {
    if (signatures.length > 0) {
        setShowResetConfirm(true);
    } else {
        performReset();
    }
  };

  const performReset = () => {
    // Reset all state
    setFile(null);
    setPages([]);
    setStats(null);
    setSignatures([]);
    setHistory([]);
    setHistoryIndex(-1);
    setPlacingItem(null);
    setSelectedSigId(null);
    setEditingId(null);
    setZoom(1);
    setIsLoading(false);
    setProgress(0);
    setShowResetConfirm(false);
  };

  // Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setIsLoading(true);
      setProgress(10);
      
      const reader = new FileReader();
      reader.onload = async (ev) => {
        setProgress(40);
        const buffer = ev.target?.result as ArrayBuffer;
        
        try {
            const interval = setInterval(() => {
                setProgress(prev => Math.min(prev + 5, 90));
            }, 100);

            const { pages: pdfPages, stats: pdfStats } = await loadPDF(buffer);
            
            clearInterval(interval);
            setProgress(100);
            
            setFile({
                name: selectedFile.name,
                size: selectedFile.size,
                type: selectedFile.type,
                data: buffer,
            });
            setPages(pdfPages);
            setStats(pdfStats);
            setIsLoading(false);
        } catch (err) {
            console.error(err);
            alert("Error parsing PDF. Please try another file.");
            setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  // Prepare Signature for Placement
  const handleCreateSignature = () => {
    let content = '';
    let type = SignatureType.TEXT;

    if (activeTab === 'type') {
        content = typedName;
        type = SignatureType.TEXT;
    } else if (activeTab === 'draw') {
        content = drawnData;
        type = SignatureType.DRAWING;
    } else {
        content = uploadedSigImage;
        type = SignatureType.IMAGE;
    }

    if (!content) return;

    setPlacingItem({
        type,
        content,
        style: {
            fontFamily: selectedFont,
            color: selectedColor,
            isBold,
            isItalic,
            fontSize: 48 // Default size
        }
    });
    setShowSigModal(false);
  };

  // Date Formatting Helper
  const getFormattedDate = (format: string, date: Date = new Date()) => {
      const d = date.getDate();
      const m = date.getMonth() + 1;
      const y = date.getFullYear();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const dd = d < 10 ? `0${d}` : d;
      const mm = m < 10 ? `0${m}` : m;

      switch(format) {
          case 'MM/DD/YYYY': return `${mm}/${dd}/${y}`;
          case 'DD/MM/YYYY': return `${dd}/${mm}/${y}`;
          case 'YYYY-MM-DD': return `${y}-${mm}-${dd}`;
          case 'MMM DD, YYYY': return `${months[m-1]} ${dd}, ${y}`;
          case 'DD MMM YYYY': return `${dd} ${months[m-1]} ${y}`;
          default: return date.toLocaleDateString();
      }
  };

  const handleQuickAction = (type: 'date' | 'stamp' | 'text' | 'symbol', payload?: any) => {
      let content = '';
      let style: any = {};
      let itemType = SignatureType.TEXT;

      if (type === 'date') {
          content = getFormattedDate('MM/DD/YYYY');
          style = { 
            fontSize: 24, 
            color: '#000000', 
            fontFamily: 'Arial',
            dateFormat: 'MM/DD/YYYY',
            originalDateTimestamp: Date.now()
          };
          itemType = SignatureType.DATE;
      } else if (type === 'stamp') {
          content = payload.label;
          style = { 
              color: payload.color, 
              fontSize: 24, 
              isBold: true,
              borderColor: payload.borderColor 
            };
          itemType = SignatureType.STAMP;
      } else if (type === 'text') {
          content = "Type here";
          style = { fontSize: 16, color: '#000000', fontFamily: 'Helvetica' };
          itemType = SignatureType.PLAINTEXT;
      } else if (type === 'symbol') {
          content = payload.symbol;
          style = { fontSize: 32, color: payload.color || '#000000', isBold: true };
          itemType = SignatureType.SYMBOL;
      }

      setPlacingItem({ type: itemType, content, style });
  };

  // Helper to measure text width
  const calculateTextWidth = (text: string, fontSize: number, fontFamily: string, isBold: boolean, isItalic: boolean) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
          const fontName = fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily;
          ctx.font = `${isBold ? 'bold ' : ''}${isItalic ? 'italic ' : ''}${fontSize}px ${fontName}`;
          // Add some padding (0.5em) to prevent edge clipping
          return ctx.measureText(text).width + (fontSize * 0.5); 
      }
      return 200;
  };

  // Place Signature on Click
  const handlePageClick = (e: React.MouseEvent, pageIndex: number) => {
    if (!placingItem) {
        setSelectedSigId(null);
        return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Default dimensions based on type
    let width = 200;
    let height = 60;
    
    if (placingItem.type === SignatureType.STAMP) {
        width = 150; 
        height = 60;
    } else if (placingItem.type === SignatureType.SYMBOL) {
        width = 50;
        height = 50;
    } else if (placingItem.type === SignatureType.PLAINTEXT || placingItem.type === SignatureType.TEXT || placingItem.type === SignatureType.DATE) {
         height = placingItem.style.fontSize * 1.5;
         const fontFamily = placingItem.type === SignatureType.PLAINTEXT ? 'Helvetica' : (placingItem.style.fontFamily || 'Arial');
         width = calculateTextWidth(
             placingItem.content, 
             placingItem.style.fontSize, 
             fontFamily, 
             placingItem.style.isBold, 
             placingItem.style.isItalic
         );
    } else if (placingItem.type === SignatureType.DRAWING || placingItem.type === SignatureType.IMAGE) {
        width = 150;
        height = 80;
    }

    const newSig: SignatureItem = {
      id: Date.now().toString(),
      type: placingItem.type,
      content: placingItem.content,
      x: x - (width / 2),
      y: y - (height / 2),
      width,
      height,
      pageIndex,
      rotation: 0,
      opacity: 1,
      ...placingItem.style
    };

    pushToHistory([...signatures, newSig]);
    setPlacingItem(null); 
    setSelectedSigId(newSig.id);

    // Auto-enter edit mode for text types
    if (newSig.type === SignatureType.PLAINTEXT || newSig.type === SignatureType.TEXT) {
        setEditingId(newSig.id);
    }
  };

  // --- MOUSE INTERACTIONS (Drag & Resize) ---

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    // If editing, allow mouse events to propagate to textarea
    if (editingId === id) return;

    e.stopPropagation(); // Prevent page click
    e.preventDefault();
    setSelectedSigId(id);
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    
    const sig = signatures.find(s => s.id === id);
    if (sig) {
        setItemStartPos({ 
          x: sig.x, 
          y: sig.y, 
          w: sig.width, 
          h: sig.height,
          fontSize: sig.fontSize || 32 
        });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, id: string, corner: string) => {
      e.stopPropagation();
      e.preventDefault();
      setSelectedSigId(id);
      setIsResizing(true);
      setResizeCorner(corner);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      const sig = signatures.find(s => s.id === id);
      if (sig) {
          setItemStartPos({ 
            x: sig.x, 
            y: sig.y, 
            w: sig.width, 
            h: sig.height,
            fontSize: sig.fontSize || 32
          });
      }
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    setMousePos({ x: clientX, y: clientY });

    if (isDragging && selectedSigId) {
        const dx = (clientX - dragStartPos.x) / zoom;
        const dy = (clientY - dragStartPos.y) / zoom;

        setSignatures(prev => prev.map(sig => {
            if (sig.id === selectedSigId) {
                return {
                    ...sig,
                    x: itemStartPos.x + dx,
                    y: itemStartPos.y + dy
                };
            }
            return sig;
        }));
    }

    if (isResizing && selectedSigId && resizeCorner) {
        const dx = (clientX - dragStartPos.x) / zoom;
        const dy = (clientY - dragStartPos.y) / zoom;
        
        setSignatures(prev => prev.map(sig => {
            if (sig.id === selectedSigId) {
                // Calculate new dimensions first
                let newW = itemStartPos.w;
                let newH = itemStartPos.h;
                let newX = itemStartPos.x;
                let newY = itemStartPos.y;

                if (resizeCorner.includes('e')) newW = Math.max(20, itemStartPos.w + dx);
                if (resizeCorner.includes('w')) {
                    const possibleW = itemStartPos.w - dx;
                    if (possibleW > 20) {
                        newW = possibleW;
                        newX = itemStartPos.x + dx;
                    }
                }
                if (resizeCorner.includes('s')) newH = Math.max(20, itemStartPos.h + dy);
                if (resizeCorner.includes('n')) {
                    const possibleH = itemStartPos.h - dy;
                    if (possibleH > 20) {
                        newH = possibleH;
                        newY = itemStartPos.y + dy;
                    }
                }

                // --- SMART RESIZE LOGIC (FIXED) ---
                if (sig.type === SignatureType.TEXT || sig.type === SignatureType.DATE || sig.type === SignatureType.PLAINTEXT) {
                    // 1. Calculate new Font Size based on Height ratio from START height
                    const heightRatio = newH / itemStartPos.h;
                    const baseFontSize = itemStartPos.fontSize; // Anchor to start size
                    let newFontSize = baseFontSize * heightRatio;
                    
                    // Clamps
                    newFontSize = Math.max(8, Math.min(newFontSize, 300));

                    // 2. Measure required width for this new font size
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const fontName = sig.type === SignatureType.PLAINTEXT ? 'Helvetica, Arial' : (sig.fontFamily || 'Arial');
                        ctx.font = `${sig.isBold ? 'bold ' : ''}${sig.isItalic ? 'italic ' : ''}${newFontSize}px ${fontName}`;
                        const textMetrics = ctx.measureText(sig.content);
                        // Add some padding to prevent edge clipping
                        newW = textMetrics.width + (newFontSize * 0.5); 
                    }

                    // 3. Update Dimensions
                    if (resizeCorner.includes('w')) {
                         newX = itemStartPos.x + (itemStartPos.w - newW);
                    }

                    return {
                        ...sig,
                        x: newX,
                        y: newY,
                        width: newW,
                        height: newH,
                        fontSize: newFontSize
                    };
                } else {
                    return {
                        ...sig,
                        x: newX,
                        y: newY,
                        width: newW,
                        height: newH,
                    };
                }
            }
            return sig;
        }));
    }

  }, [isDragging, isResizing, selectedSigId, dragStartPos, itemStartPos, zoom, resizeCorner]);

  const handleGlobalMouseUp = useCallback(() => {
    if (isDragging || isResizing) {
        setIsDragging(false);
        setIsResizing(false);
        setResizeCorner(null);
        pushToHistory([...signatures]);
    }
  }, [isDragging, isResizing, signatures]);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalMouseMove, { passive: false });
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('touchmove', handleGlobalMouseMove);
        window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  // Key Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle delete if editing text
      if (editingId) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSigId) {
         if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            deleteSignature(selectedSigId);
         }
      }
      if (e.key === 'Escape') {
          if (editingId) {
            setEditingId(null);
          } else {
            setPlacingItem(null);
            setSelectedSigId(null);
          }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
          redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSigId, history, historyIndex, editingId]);


  const deleteSignature = (id: string) => {
    const newSigs = signatures.filter(s => s.id !== id);
    pushToHistory(newSigs);
    setSelectedSigId(null);
  };

  const duplicateSignature = (id: string) => {
    const sig = signatures.find(s => s.id === id);
    if (sig) {
        const newSig = { 
            ...sig, 
            id: Date.now().toString(), 
            x: sig.x + 20, 
            y: sig.y + 20 
        };
        pushToHistory([...signatures, newSig]);
        setSelectedSigId(newSig.id);
    }
  };

  const handleTextEdit = (id: string) => {
      const sig = signatures.find(s => s.id === id);
      if (sig && (sig.type === SignatureType.PLAINTEXT || sig.type === SignatureType.TEXT || sig.type === SignatureType.DATE)) {
          setEditingId(id);
      }
  };

  const updateSignatureProp = (id: string, prop: keyof SignatureItem, value: any) => {
      setSignatures(prev => prev.map(s => {
          if (s.id === id) {
              const updated = { ...s, [prop]: value };
              
              // Helper to decide font family
              const getFont = (item: SignatureItem) => 
                  item.type === SignatureType.PLAINTEXT ? 'Helvetica, Arial' : (item.fontFamily || 'Arial');

              // If updating content or formatting, recalculate width
              if (prop === 'content' || prop === 'fontSize' || prop === 'dateFormat' || prop === 'fontFamily' || prop === 'isBold' || prop === 'isItalic') {
                  
                  // Handle Date Format specifically
                  if (prop === 'dateFormat' && s.originalDateTimestamp) {
                      updated.content = getFormattedDate(value, new Date(s.originalDateTimestamp));
                  }

                  // Calculate new width
                  const fontSize = updated.fontSize || (updated.type === SignatureType.PLAINTEXT ? 16 : 32);
                  const font = getFont(updated);
                  
                  updated.width = calculateTextWidth(updated.content, fontSize, font, updated.isBold || false, updated.isItalic || false);
                  
                  if (prop === 'fontSize') {
                      updated.height = fontSize * 1.5;
                  }
              }

              return updated;
          }
          return s;
      }));
  };

  const handleDownload = async () => {
    if (!file) return;
    setIsLoading(true);
    setProgress(10);
    try {
        // Yield to UI to show loading
        await new Promise(resolve => setTimeout(resolve, 100));
        setProgress(30);
        
        const pdfBytes = await generateSignedPDF(file.data, signatures, pages);
        setProgress(100);
        
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Signed_${file.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Download error", e);
        alert("Error generating PDF. Please check console.");
    } finally {
        setIsLoading(false);
    }
  };

  // --- RENDER ---

  if (!file) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-xl p-8 md:p-12 max-w-2xl w-full text-center relative overflow-hidden border border-white/50">
          
          {isLoading && (
            <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="w-64 h-3 bg-slate-100 rounded-full mb-4 overflow-hidden shadow-inner">
                    <div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-blue-600 font-bold animate-pulse">Analyzing Document...</p>
            </div>
          )}

          <div className="w-24 h-24 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-200 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            <FileText size={48} />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-6 tracking-tighter">
            Digital Signature <br/><span className="text-blue-600 text-2xl md:text-4xl font-bold">or Sign on PDF</span>
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-lg mx-auto leading-relaxed font-light">
            The professional way to digitally sign PDFs. 
            <span className="block mt-2 font-medium text-slate-800">Drag, Drop, Sign & Go.</span>
          </p>
          
          {/* UPDATED: Blue Upload Button */}
          <label className="group relative inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-white transition-all duration-200 bg-blue-600 rounded-full focus:outline-none hover:bg-blue-700 hover:scale-105 cursor-pointer shadow-xl hover:shadow-2xl">
            <Upload className="mr-3 group-hover:-translate-y-1 transition-transform" />
            <span>Upload PDF Document</span>
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>
    );
  }

  const selectedSig = signatures.find(s => s.id === selectedSigId);

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">DS</div>
                <span className="font-bold text-lg text-slate-800 hidden md:inline truncate max-w-[200px]">{file.name}</span>
            </div>
            
            {/* UPDATED: Upload Another Button - Calls handleReset which uses custom modal */}
            <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-2 md:px-4 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-md hover:shadow-lg"
            >
                <Upload size={16} />
                <span className="hidden sm:inline">Upload Another PDF</span>
            </button>
        </div>
        
        <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all"><ZoomOut size={18} /></button>
            <span className="text-xs font-bold w-12 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.25))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all"><ZoomIn size={18} /></button>
            <div className="w-px h-4 bg-slate-300 mx-2"></div>
            <button onClick={undo} disabled={historyIndex < 0} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 disabled:opacity-30 transition-all"><Undo size={18} /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 disabled:opacity-30 transition-all"><Redo size={18} /></button>
        </div>

        <div className="flex items-center gap-3">
             <button 
                onClick={handleDownload}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
            >
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                <span className="hidden sm:inline">Download PDF</span>
            </button>
        </div>
      </header>

      {/* --- MAIN LAYOUT --- */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT SIDEBAR */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col p-4 gap-4 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] overflow-y-auto hidden md:flex">
            
            <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Essentials</p>
                <button 
                    onClick={() => setShowSigModal(true)} 
                    className="w-full bg-blue-600 text-white p-3 rounded-xl flex items-center justify-start gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 group active:scale-95"
                >
                    <div className="bg-white/20 p-1.5 rounded-lg"><PenTool size={20} className="text-white" /></div>
                    <span className="font-bold">Add Signature</span>
                </button>
                
                <button 
                    onClick={() => handleQuickAction('date')} 
                    className="w-full bg-white border border-slate-200 text-slate-700 p-3 rounded-xl flex items-center justify-start gap-3 hover:bg-slate-50 hover:border-blue-300 transition-all shadow-sm active:scale-95"
                >
                    <div className="bg-slate-100 p-1.5 rounded-lg"><Calendar size={20} className="text-slate-600" /></div>
                    <span className="font-medium">Add Date</span>
                </button>

                <button 
                    onClick={() => handleQuickAction('text')} 
                    className="w-full bg-white border border-slate-200 text-slate-700 p-3 rounded-xl flex items-center justify-start gap-3 hover:bg-slate-50 hover:border-blue-300 transition-all shadow-sm active:scale-95"
                >
                    <div className="bg-slate-100 p-1.5 rounded-lg"><ALargeSmall size={20} className="text-slate-600" /></div>
                    <span className="font-medium">Add Text</span>
                </button>
            </div>

            <div className="space-y-3 mt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Quick Symbols</p>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                         onClick={() => handleQuickAction('symbol', { symbol: '✓', color: '#16a34a' })}
                         className="flex items-center justify-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-all"
                    >
                        <Check size={18} />
                    </button>
                    <button 
                         onClick={() => handleQuickAction('symbol', { symbol: '✕', color: '#dc2626' })}
                         className="flex items-center justify-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="space-y-3 mt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Stamps</p>
                <div className="grid grid-cols-2 gap-2">
                    {STAMPS.slice(0, 6).map(stamp => (
                        <button 
                            key={stamp.label} 
                            onClick={() => handleQuickAction('stamp', stamp)}
                            className="w-full text-center px-2 py-2 text-[10px] font-bold rounded-lg border hover:opacity-80 transition-all"
                            style={{ color: stamp.color, borderColor: stamp.borderColor, backgroundColor: `${stamp.color}10` }}
                        >
                            {stamp.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100">
                 <button 
                    onClick={() => setFitToWidth(!fitToWidth)} 
                    className="flex items-center gap-3 w-full p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all text-sm font-medium"
                >
                    <Maximize2 size={18} />
                    {fitToWidth ? 'Original Size' : 'Fit to Width'}
                </button>
            </div>
        </div>

        {/* CENTER SCROLLABLE AREA */}
        <div 
            className={`flex-1 overflow-auto bg-slate-100/50 relative p-4 md:p-10 transition-colors duration-200 ${placingItem ? 'cursor-crosshair-custom' : ''}`} 
            ref={containerRef}
            onClick={() => setSelectedSigId(null)}
        >
            <div className="max-w-max mx-auto flex flex-col items-center gap-8 min-h-full pb-20">
                {pages.map((page, index) => (
                    <div 
                        key={index} 
                        className="relative bg-white shadow-xl transition-all duration-200"
                        style={{ 
                            width: fitToWidth ? '100%' : page.width * zoom, 
                            height: fitToWidth ? 'auto' : page.height * zoom,
                        }}
                        onClick={(e) => { e.stopPropagation(); handlePageClick(e, index); }}
                    >
                        <img 
                            src={page.dataUrl} 
                            alt={`Page ${index + 1}`}
                            className="w-full h-full object-contain pointer-events-none select-none"
                            draggable={false}
                        />

                        {/* Signatures Layer */}
                        {signatures.filter(s => s.pageIndex === index).map((sig) => (
                            <div
                                key={sig.id}
                                className={`absolute select-none group/sig ${selectedSigId === sig.id ? 'z-20' : 'z-10'}`}
                                style={{
                                    left: sig.x * zoom,
                                    top: sig.y * zoom,
                                    width: sig.width * zoom,
                                    height: sig.height * zoom,
                                    transform: `rotate(${sig.rotation || 0}deg)`,
                                    opacity: sig.opacity ?? 1,
                                    cursor: isResizing || editingId === sig.id ? 'default' : 'move'
                                }}
                                onMouseDown={(e) => handleMouseDown(e, sig.id)}
                                onDoubleClick={(e) => { e.stopPropagation(); handleTextEdit(sig.id); }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSigId(sig.id);
                                }}
                            >
                                <div className={`w-full h-full relative transition-all duration-150 ${selectedSigId === sig.id && !editingId ? 'ring-2 ring-blue-500 ring-offset-4 ring-offset-transparent' : 'group-hover/sig:ring-1 group-hover/sig:ring-blue-300 group-hover/sig:ring-dashed'}`}>
                                    
                                    {/* RESIZE HANDLES (Only when selected and not editing) */}
                                    {selectedSigId === sig.id && !editingId && (
                                        <>
                                            <div className="resize-handle -top-1.5 -left-1.5 cursor-nw-resize" onMouseDown={(e) => handleResizeStart(e, sig.id, 'nw')} />
                                            <div className="resize-handle -top-1.5 -right-1.5 cursor-ne-resize" onMouseDown={(e) => handleResizeStart(e, sig.id, 'ne')} />
                                            <div className="resize-handle -bottom-1.5 -left-1.5 cursor-sw-resize" onMouseDown={(e) => handleResizeStart(e, sig.id, 'sw')} />
                                            <div className="resize-handle -bottom-1.5 -right-1.5 cursor-se-resize" onMouseDown={(e) => handleResizeStart(e, sig.id, 'se')} />
                                        </>
                                    )}

                                    {/* CONTENT */}
                                    {sig.type === SignatureType.TEXT || sig.type === SignatureType.DATE || sig.type === SignatureType.PLAINTEXT ? (
                                        editingId === sig.id ? (
                                            <textarea
                                                autoFocus
                                                value={sig.content}
                                                onChange={(e) => updateSignatureProp(sig.id, 'content', e.target.value)}
                                                onBlur={() => setEditingId(null)}
                                                className="w-full h-full resize-none bg-transparent outline-none overflow-hidden p-1 leading-none"
                                                style={{
                                                    fontFamily: sig.type === SignatureType.PLAINTEXT ? 'Helvetica, Arial, sans-serif' : sig.fontFamily,
                                                    color: sig.color,
                                                    fontWeight: sig.isBold ? 'bold' : 'normal',
                                                    fontStyle: sig.isItalic ? 'italic' : 'normal',
                                                    fontSize: `${(sig.fontSize || 32) * zoom}px`
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()} // Allow text selection
                                            />
                                        ) : (
                                            <div 
                                                className="w-full h-full flex items-center p-1 leading-none whitespace-nowrap overflow-hidden"
                                                style={{
                                                    fontFamily: sig.type === SignatureType.PLAINTEXT ? 'Helvetica, Arial, sans-serif' : sig.fontFamily,
                                                    color: sig.color,
                                                    fontWeight: sig.isBold ? 'bold' : 'normal',
                                                    fontStyle: sig.isItalic ? 'italic' : 'normal',
                                                    fontSize: `${(sig.fontSize || 32) * zoom}px`
                                                }}
                                            >
                                                {sig.content}
                                            </div>
                                        )
                                    ) : sig.type === SignatureType.STAMP ? (
                                        <div 
                                            className="w-full h-full flex items-center justify-center p-1 border-4"
                                            style={{
                                                borderColor: sig.color,
                                                color: sig.color,
                                                fontSize: `${(sig.fontSize || 24) * zoom}px`, // Use updated fontSize
                                                fontWeight: 'bold',
                                                opacity: 0.8
                                            }}
                                        >
                                            {sig.content}
                                        </div>
                                    ) : sig.type === SignatureType.SYMBOL ? (
                                         <div 
                                            className="w-full h-full flex items-center justify-center"
                                            style={{
                                                color: sig.color,
                                                fontSize: `${(sig.fontSize || 40) * zoom}px`,
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            {sig.content}
                                        </div>
                                    ) : (
                                        <img src={sig.content} className="w-full h-full object-contain pointer-events-none" alt="signature" />
                                    )}

                                    {/* Edit Controls */}
                                    {selectedSigId === sig.id && !isResizing && !isDragging && !editingId && (
                                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-lg flex items-center p-1.5 shadow-xl gap-2 z-50 pointer-events-auto">
                                             {/* Date Format Helper in Floating Toolbar */}
                                             {sig.type === SignatureType.DATE && (
                                                <>
                                                    <select 
                                                        value={sig.dateFormat || 'MM/DD/YYYY'} 
                                                        onChange={(e) => updateSignatureProp(sig.id, 'dateFormat', e.target.value)}
                                                        className="bg-slate-700 text-white text-xs p-1 rounded border-none outline-none mr-2 max-w-[100px]"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                    >
                                                        {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                                                    </select>
                                                    <div className="w-px h-3 bg-slate-600"></div>
                                                </>
                                            )}

                                            <button 
                                                onClick={(e) => { e.stopPropagation(); updateSignatureProp(sig.id, 'rotation', (sig.rotation || 0) - 90) }} 
                                                className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white" title="Rotate"
                                            >
                                                <RotateCw size={14}/>
                                            </button>
                                            <div className="w-px h-3 bg-slate-600"></div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); duplicateSignature(sig.id); }} 
                                                className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white" title="Duplicate"
                                            >
                                                <Copy size={14}/>
                                            </button>
                                            <div className="w-px h-3 bg-slate-600"></div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); deleteSignature(sig.id); }} 
                                                className="p-1 hover:bg-red-900/50 rounded text-red-400 hover:text-red-300" title="Delete"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>

        {/* RIGHT SIDEBAR (Stats & Props) */}
        <div className="hidden lg:block w-72 bg-white border-l border-slate-200 p-6 z-10 overflow-y-auto">
             <div className="mb-6">
                <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Document Analysis</h2>
                {stats && <StatsChart stats={stats} />}
             </div>
             
             {selectedSig && (
                 <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                    <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 mt-8">Properties</h2>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                        
                         {/* Edit Text Content directly in sidebar */}
                         {(selectedSig.type === SignatureType.TEXT || selectedSig.type === SignatureType.PLAINTEXT || selectedSig.type === SignatureType.DATE) && (
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Text Content</label>
                                <textarea 
                                    value={selectedSig.content}
                                    onChange={(e) => updateSignatureProp(selectedSig.id, 'content', e.target.value)}
                                    className="w-full p-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 outline-none resize-y min-h-[60px]"
                                />
                            </div>
                         )}

                        {/* Date Format Selector */}
                        {selectedSig.type === SignatureType.DATE && (
                             <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Date Format</label>
                                <select 
                                    value={selectedSig.dateFormat || 'MM/DD/YYYY'} 
                                    onChange={(e) => {
                                        updateSignatureProp(selectedSig.id, 'dateFormat', e.target.value);
                                    }}
                                    className="w-full p-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 outline-none"
                                >
                                    {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Opacity</label>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="1" 
                                step="0.1"
                                value={selectedSig.opacity ?? 1}
                                onChange={(e) => updateSignatureProp(selectedSig.id, 'opacity', parseFloat(e.target.value))}
                                className="w-full accent-blue-600"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Rotation</label>
                            <input 
                                type="range" 
                                min="0" 
                                max="360" 
                                step="15"
                                value={selectedSig.rotation || 0}
                                onChange={(e) => updateSignatureProp(selectedSig.id, 'rotation', parseInt(e.target.value))}
                                className="w-full accent-blue-600"
                            />
                        </div>
                         
                         {/* Manual Size slider for non-mouse users */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Size</label>
                            <input 
                                type="range" 
                                min="10" 
                                max="200" 
                                step="2"
                                value={selectedSig.fontSize || 32}
                                onChange={(e) => updateSignatureProp(selectedSig.id, 'fontSize', parseInt(e.target.value))}
                                className="w-full accent-blue-600"
                            />
                        </div>
                    </div>
                 </div>
             )}
        </div>
      </div>

      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4 z-50">
        <button 
          onClick={() => setShowSigModal(true)}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 hover:scale-110 transition-all"
        >
          <PenTool size={24} />
        </button>
        <button 
          onClick={() => handleQuickAction('date')}
          className="w-14 h-14 bg-white text-blue-600 border border-slate-200 rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-50 transition-all"
        >
          <Calendar size={24} />
        </button>
      </div>

      {/* --- GHOST CURSOR --- */}
      {placingItem && (
        <div 
            className="fixed pointer-events-none z-50 opacity-60"
            style={{ 
                left: mousePos.x, 
                top: mousePos.y,
                transform: 'translate(-50%, -50%)'
            }}
        >
            {placingItem.type === SignatureType.TEXT || placingItem.type === SignatureType.DATE || placingItem.type === SignatureType.PLAINTEXT ? (
                <div 
                    style={{
                        fontFamily: placingItem.type === SignatureType.PLAINTEXT ? 'Helvetica' : placingItem.style.fontFamily,
                        color: placingItem.style.color,
                        fontSize: '32px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {placingItem.content}
                </div>
            ) : placingItem.type === SignatureType.STAMP ? (
                 <div 
                    className="border-4 p-2 font-bold text-center"
                    style={{
                        borderColor: placingItem.style.color,
                        color: placingItem.style.color,
                        fontSize: '24px',
                        minWidth: '150px'
                    }}
                >
                    {placingItem.content}
                </div>
            ) : (
                <div className="bg-blue-100 border-2 border-blue-400 p-2 rounded text-xs text-blue-700 font-bold whitespace-nowrap shadow-xl">
                    Click to Place
                </div>
            )}
        </div>
      )}

      {/* --- RESET CONFIRMATION MODAL --- */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 z-[60] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Upload New File?</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Your current signatures will be lost. Are you sure you want to continue?
                        </p>
                    </div>
                    <div className="flex gap-3 w-full mt-2">
                         <button 
                            onClick={() => setShowResetConfirm(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                         >
                            Cancel
                         </button>
                         <button 
                            onClick={performReset}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
                         >
                            Yes, Upload
                         </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL --- */}
      {showSigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col h-[85vh] overflow-hidden transform transition-all scale-100">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Create Signature</h3>
                        <p className="text-sm text-slate-400">Customize your digital signature</p>
                    </div>
                    <button onClick={() => setShowSigModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                
                {/* Tabs */}
                <div className="flex p-2 bg-slate-50 border-b border-slate-100">
                    {['type', 'draw', 'image'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl capitalize transition-all flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                        >
                            {tab === 'type' && <Type size={18} />}
                            {tab === 'draw' && <PenTool size={18} />}
                            {tab === 'image' && <ImageIcon size={18} />}
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8">
                    {activeTab === 'type' && (
                        <div className="flex flex-col h-full">
                            <input
                                type="text"
                                placeholder="Type your name..."
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                className="w-full text-4xl p-4 border-b-2 border-slate-200 focus:border-blue-500 focus:outline-none bg-transparent text-center font-medium placeholder:text-slate-300 mb-8"
                                autoFocus
                            />
                            
                            {/* Styling Tools */}
                            <div className="flex flex-wrap items-center justify-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full max-w-3xl mx-auto mb-8">
                                <button onClick={() => setIsBold(!isBold)} className={`p-3 rounded-xl transition-all ${isBold ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Bold"><Bold size={20}/></button>
                                <button onClick={() => setIsItalic(!isItalic)} className={`p-3 rounded-xl transition-all ${isItalic ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Italic"><Italic size={20}/></button>
                                <div className="h-8 w-px bg-slate-200 mx-2"></div>
                                <div className="flex gap-3 items-center flex-wrap justify-center">
                                    {COLORS.map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setSelectedColor(c)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === c ? 'border-slate-400 scale-110 shadow-sm ring-2 ring-slate-200' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                            title={c}
                                        />
                                    ))}
                                    {/* Custom Color Input */}
                                    <div className="relative group">
                                         <label className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform bg-gradient-to-br from-red-500 via-green-500 to-blue-500">
                                            <input 
                                                type="color" 
                                                value={customColor}
                                                onChange={(e) => {
                                                    setCustomColor(e.target.value);
                                                    setSelectedColor(e.target.value);
                                                }}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            />
                                         </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                    {SIGNATURE_FONTS.map(font => (
                                        <button
                                            key={font}
                                            onClick={() => setSelectedFont(font)}
                                            className={`p-8 border rounded-2xl hover:border-blue-300 transition-all text-center group relative overflow-hidden flex items-center justify-center min-h-[120px] ${selectedFont === font ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 shadow-md' : 'border-slate-100 hover:shadow-lg hover:-translate-y-1'}`}
                                        >
                                            <span 
                                                className="text-5xl block w-full truncate px-4" 
                                                style={{ 
                                                    fontFamily: font, 
                                                    color: selectedColor,
                                                    fontWeight: isBold ? 'bold' : 'normal',
                                                    fontStyle: isItalic ? 'italic' : 'normal',
                                                }}
                                            >
                                                {typedName || 'Signature'}
                                            </span>
                                            <p className="absolute bottom-2 right-4 text-[10px] text-slate-300 uppercase tracking-wider font-bold group-hover:text-blue-400 transition-colors">{font}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'draw' && (
                        <div className="space-y-6">
                            <SignaturePad onSave={setDrawnData} color={selectedColor} />
                             <div className="flex justify-center gap-3">
                                {COLORS.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setSelectedColor(c)}
                                        className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === c ? 'border-slate-400 scale-110 shadow-sm' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'image' && (
                         <div className="border-2 border-dashed border-slate-300 rounded-2xl h-64 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all relative group">
                             <input type="file" accept="image/*" onChange={(e) => {
                                 const f = e.target.files?.[0];
                                 if (f) {
                                     const r = new FileReader();
                                     r.onload = (ev) => setUploadedSigImage(ev.target?.result as string);
                                     r.readAsDataURL(f);
                                 }
                             }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                             {uploadedSigImage ? (
                                 <div className="relative w-full h-full p-4">
                                     <img src={uploadedSigImage} alt="Uploaded" className="w-full h-full object-contain" />
                                     <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                         <p className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">Click to change</p>
                                     </div>
                                 </div>
                             ) : (
                                 <>
                                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Upload size={28} />
                                    </div>
                                    <p className="text-lg font-bold text-slate-700">Click to upload image</p>
                                    <p className="text-sm text-slate-400">SVG, PNG, JPG supported</p>
                                 </>
                             )}
                         </div>
                    )}
                </div>

                <div className="p-6 border-t bg-slate-50 flex justify-between items-center rounded-b-3xl">
                    <div className="text-xs text-slate-400 font-medium px-2">
                        Pro Tip: Drag corners to resize items on the page.
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowSigModal(false)} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                        <button 
                            onClick={handleCreateSignature}
                            disabled={(activeTab === 'type' && !typedName) || (activeTab === 'draw' && !drawnData) || (activeTab === 'image' && !uploadedSigImage)}
                            className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center gap-2"
                        >
                            <Check size={18} />
                            Create & Place
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;