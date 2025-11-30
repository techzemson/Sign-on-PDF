import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, ChevronLeft, ChevronRight, X, Download, MousePointer, Type, Image as ImageIcon, PenTool, Check, Trash2, Copy, Move, Maximize2, Palette, Bold, Italic, Loader2 } from 'lucide-react';
import { UploadedFile, PDFPageInfo, SignatureItem, SignatureType, DocStats, SIGNATURE_FONTS, COLORS } from './types';
import { loadPDF, generateSignedPDF } from './services/pdfService';
import StatsChart from './components/StatsChart';
import SignaturePad from './components/SignaturePad';

function App() {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [pages, setPages] = useState<PDFPageInfo[]>([]);
  const [stats, setStats] = useState<DocStats | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [signatures, setSignatures] = useState<SignatureItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Modal States
  const [showSigModal, setShowSigModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'image'>('type');
  
  // Creation States
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[1]); // Default Blue
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [drawnData, setDrawnData] = useState('');
  const [uploadedSigImage, setUploadedSigImage] = useState('');
  
  // Interaction State
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const itemStartPos = useRef({ x: 0, y: 0 });

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
            // Simulate heavy analysis for UX
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
            alert("Error parsing PDF");
            setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  // Add Signature Logic
  const addSignature = () => {
    const newSig: SignatureItem = {
      id: Date.now().toString(),
      type: activeTab === 'type' ? SignatureType.TEXT : activeTab === 'draw' ? SignatureType.DRAWING : SignatureType.IMAGE,
      content: activeTab === 'type' ? typedName : activeTab === 'draw' ? drawnData : uploadedSigImage,
      x: 50, // Default centerish
      y: 50,
      width: 200,
      height: activeTab === 'type' ? 60 : 100,
      pageIndex: currentPage,
      color: selectedColor,
      fontFamily: selectedFont,
      isBold,
      isItalic,
      fontSize: 32
    };

    if (!newSig.content) return;

    setSignatures([...signatures, newSig]);
    setShowSigModal(false);
    setSelectedSigId(newSig.id);
  };

  // Drag Logic
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedSigId(id);
    setIsDragging(true);
    
    const sig = signatures.find(s => s.id === id);
    if (!sig) return;

    dragStartPos.current = { x: e.clientX, y: e.clientY };
    itemStartPos.current = { x: sig.x, y: sig.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedSigId) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    setSignatures(prev => prev.map(sig => {
      if (sig.id === selectedSigId) {
        return {
          ...sig,
          x: itemStartPos.current.x + dx,
          y: itemStartPos.current.y + dy
        };
      }
      return sig;
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Touch Support for Dragging
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
     e.stopPropagation();
     setSelectedSigId(id);
     setIsDragging(true);
     const touch = e.touches[0];
     const sig = signatures.find(s => s.id === id);
     if (!sig) return;

     dragStartPos.current = { x: touch.clientX, y: touch.clientY };
     itemStartPos.current = { x: sig.x, y: sig.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !selectedSigId) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartPos.current.x;
    const dy = touch.clientY - dragStartPos.current.y;

    setSignatures(prev => prev.map(sig => {
        if (sig.id === selectedSigId) {
          return {
            ...sig,
            x: itemStartPos.current.x + dx,
            y: itemStartPos.current.y + dy
          };
        }
        return sig;
      }));
  };

  const deleteSignature = (id: string) => {
    setSignatures(prev => prev.filter(s => s.id !== id));
    setSelectedSigId(null);
  };

  const duplicateSignature = (id: string) => {
    const sig = signatures.find(s => s.id === id);
    if (sig) {
        const newSig = { ...sig, id: Date.now().toString(), x: sig.x + 20, y: sig.y + 20 };
        setSignatures(prev => [...prev, newSig]);
        setSelectedSigId(newSig.id);
    }
  };

  // Download
  const handleDownload = async () => {
    if (!file) return;
    setIsLoading(true);
    setProgress(50);
    try {
        const pdfBytes = await generateSignedPDF(file.data, signatures, pages);
        setProgress(100);
        
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `signed_${file.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error(e);
        alert("Error generating PDF");
    } finally {
        setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              setUploadedSigImage(ev.target?.result as string);
          };
          reader.readAsDataURL(file);
      }
  }

  // Effect to handle global mouse up
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  // View: Landing
  if (!file) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-2xl w-full text-center relative overflow-hidden">
          
          {isLoading && (
            <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center">
                <div className="w-64 h-2 bg-slate-200 rounded-full mb-4 overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-blue-600 font-medium animate-pulse">Analysing Document...</p>
            </div>
          )}

          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
            <FileText size={40} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4 tracking-tight">
            SignFlow <span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-lg mx-auto leading-relaxed">
            The advanced, free, and secure way to digitally sign your PDF documents. 
            Drag, drop, and customize your signature with 50+ unique styles.
          </p>
          
          <label className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 hover:bg-blue-700 hover:scale-105 cursor-pointer shadow-lg shadow-blue-200">
            <Upload className="mr-3 group-hover:animate-bounce" />
            <span>Upload PDF File</span>
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </label>
          
          <div className="mt-8 text-xs text-slate-400">
            Supports large files • 100% Free • Secure Client-Side Processing
          </div>
        </div>
      </div>
    );
  }

  // View: Editor
  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden" onMouseMove={handleMouseMove} onTouchMove={handleTouchMove}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 z-20 shadow-sm shrink-0">
        <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">SF</div>
            <span className="font-bold text-xl text-slate-800 hidden md:inline">SignFlow Pro</span>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4 bg-slate-50 px-2 md:px-4 py-1.5 rounded-full border border-slate-200">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="p-1.5 hover:bg-white rounded-full disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium text-slate-600 w-20 text-center">
            {currentPage + 1} / {pages.length}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
            disabled={currentPage === pages.length - 1}
            className="p-1.5 hover:bg-white rounded-full disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center space-x-3">
             <button 
                onClick={handleDownload}
                className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md"
            >
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                <span className="hidden md:inline">Download Signed PDF</span>
            </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Desktop) - Stats */}
        <div className="hidden lg:block w-72 bg-white border-r border-slate-200 p-4 overflow-y-auto z-10">
           <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Document Info</h2>
           {stats && <StatsChart stats={stats} />}
           
           <div className="mt-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
                <div className="space-y-2">
                    <button 
                        onClick={() => setShowSigModal(true)} 
                        className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100"
                    >
                        <span className="font-medium text-sm">Add New Signature</span>
                        <PenTool size={16} />
                    </button>
                </div>
           </div>
        </div>

        {/* Center - PDF Viewer */}
        <div className="flex-1 bg-slate-100 overflow-auto flex justify-center p-4 md:p-8 relative" onClick={() => setSelectedSigId(null)}>
           {pages.length > 0 && (
            <div 
                className="relative shadow-2xl transition-transform duration-200 ease-out"
                style={{ 
                    width: pages[currentPage].width, 
                    height: pages[currentPage].height,
                    maxWidth: '100%' 
                }}
            >
                {/* PDF Page Image */}
                <img 
                    src={pages[currentPage].dataUrl} 
                    alt={`Page ${currentPage + 1}`}
                    className="w-full h-full object-contain bg-white rounded-sm pointer-events-none select-none"
                    draggable={false}
                />
                
                {/* Overlay Layer for Signatures */}
                <div className="absolute inset-0 z-10">
                    {signatures.filter(s => s.pageIndex === currentPage).map((sig) => (
                        <div
                            key={sig.id}
                            className={`absolute group cursor-move select-none ${selectedSigId === sig.id ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:ring-1 hover:ring-blue-300'}`}
                            style={{
                                left: sig.x,
                                top: sig.y,
                                width: sig.width,
                                height: sig.height,
                                touchAction: 'none'
                            }}
                            onMouseDown={(e) => handleMouseDown(e, sig.id)}
                            onTouchStart={(e) => handleTouchStart(e, sig.id)}
                        >
                             {/* Content Render */}
                            {sig.type === SignatureType.TEXT ? (
                                <div 
                                    className="w-full h-full flex items-center p-1 leading-none whitespace-nowrap overflow-visible"
                                    style={{
                                        fontFamily: sig.fontFamily,
                                        color: sig.color,
                                        fontWeight: sig.isBold ? 'bold' : 'normal',
                                        fontStyle: sig.isItalic ? 'italic' : 'normal',
                                        fontSize: `${(sig.height / 1.5)}px` // Approximate sizing
                                    }}
                                >
                                    {sig.content}
                                </div>
                            ) : (
                                <img src={sig.content} className="w-full h-full object-contain pointer-events-none" alt="signature" />
                            )}
                            
                            {/* Controls (Only visible when selected) */}
                            {selectedSigId === sig.id && (
                                <>
                                    <div className="absolute -top-10 left-0 bg-slate-800 text-white rounded-lg flex items-center p-1 shadow-lg gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); deleteSignature(sig.id); }} className="p-1 hover:bg-slate-700 rounded"><Trash2 size={14}/></button>
                                        <div className="w-px h-3 bg-slate-600 mx-1"></div>
                                        <button onClick={(e) => { e.stopPropagation(); duplicateSignature(sig.id); }} className="p-1 hover:bg-slate-700 rounded"><Copy size={14}/></button>
                                    </div>
                                    {/* Resize Handles (Visual Only for this demo, fully functional resize is complex) */}
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize"></div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
           )}
        </div>
        
        {/* Floating Action Button (Mobile) */}
        <button 
            onClick={() => setShowSigModal(true)}
            className="lg:hidden absolute bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 hover:scale-110 transition-all z-30"
        >
            <PenTool size={24} />
        </button>
      </div>

      {/* Signature Modal */}
      {showSigModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-bold text-slate-800">Create Signature</h3>
                    <button onClick={() => setShowSigModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                
                {/* Tabs */}
                <div className="flex p-2 bg-slate-50 border-b">
                    {['type', 'draw', 'image'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab === 'type' && <Type size={16} />}
                            {tab === 'draw' && <PenTool size={16} />}
                            {tab === 'image' && <ImageIcon size={16} />}
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="p-6 overflow-y-auto">
                    {activeTab === 'type' && (
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Type your name..."
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                className="w-full text-2xl p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none bg-slate-50 text-center"
                            />
                            
                            {/* Styling Tools */}
                            <div className="flex items-center justify-center gap-3">
                                <button onClick={() => setIsBold(!isBold)} className={`p-2 rounded-lg border ${isBold ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 text-slate-500'}`}><Bold size={18}/></button>
                                <button onClick={() => setIsItalic(!isItalic)} className={`p-2 rounded-lg border ${isItalic ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 text-slate-500'}`}><Italic size={18}/></button>
                                <div className="h-6 w-px bg-slate-200"></div>
                                <div className="flex gap-1">
                                    {COLORS.map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setSelectedColor(c)}
                                            className={`w-6 h-6 rounded-full border-2 ${selectedColor === c ? 'border-slate-400 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 h-48 overflow-y-auto pr-1">
                                {SIGNATURE_FONTS.map(font => (
                                    <button
                                        key={font}
                                        onClick={() => setSelectedFont(font)}
                                        className={`p-3 border rounded-lg hover:border-blue-300 transition-all text-center ${selectedFont === font ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}
                                    >
                                        <span 
                                            className="text-2xl" 
                                            style={{ 
                                                fontFamily: font, 
                                                color: selectedColor,
                                                fontWeight: isBold ? 'bold' : 'normal',
                                                fontStyle: isItalic ? 'italic' : 'normal',
                                            }}
                                        >
                                            {typedName || 'Signature'}
                                        </span>
                                        <p className="text-[10px] text-slate-400 mt-1">{font}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'draw' && (
                        <div className="space-y-4">
                            <SignaturePad onSave={setDrawnData} color={selectedColor} />
                             <div className="flex justify-center gap-2 mt-2">
                                {COLORS.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setSelectedColor(c)}
                                        className={`w-8 h-8 rounded-full border-2 ${selectedColor === c ? 'border-slate-400 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'image' && (
                         <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                             <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                             {uploadedSigImage ? (
                                 <img src={uploadedSigImage} alt="Uploaded" className="max-h-32 object-contain mb-2" />
                             ) : (
                                 <>
                                    <Upload size={32} className="text-slate-400 mb-2" />
                                    <p className="text-sm text-slate-500">Click to upload image signature</p>
                                 </>
                             )}
                         </div>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={() => setShowSigModal(false)} className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button 
                        onClick={addSignature}
                        disabled={(activeTab === 'type' && !typedName) || (activeTab === 'draw' && !drawnData) || (activeTab === 'image' && !uploadedSigImage)}
                        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Use Signature
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;