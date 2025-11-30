import React from 'react';
import { ArrowLeft, Zap, Shield, MousePointer, PenTool, Type, Download, Layers, Smartphone, Layout, CheckCircle } from 'lucide-react';

interface DocumentationProps {
  onBack: () => void;
  isFileLoaded: boolean;
}

const Documentation: React.FC<DocumentationProps> = ({ onBack, isFileLoaded }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 shadow-sm">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">DS</div>
            <span className="font-bold text-lg text-slate-800">Documentation</span>
         </div>
         <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-bold transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-lg"
         >
            <ArrowLeft size={18} />
            Back to {isFileLoaded ? 'Editor' : 'Home'}
         </button>
      </header>
      
      {/* Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12 space-y-16 pb-24">
        
        {/* Intro */}
        <section className="space-y-6 text-center max-w-3xl mx-auto">
            <div className="inline-block p-3 bg-blue-100 text-blue-600 rounded-2xl mb-2">
                <Type size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                Mastering Digital Signatures
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed font-light">
                A complete guide to signing, annotating, and managing your PDF documents with our professional, free, and secure tool.
            </p>
        </section>

        {/* Quick Start */}
        <section className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-10 flex items-center gap-3 relative z-10">
                <Zap className="text-amber-500 fill-amber-500" /> Quick Start Guide
            </h2>
            
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-10 relative z-10">
                <div className="flex gap-5 group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">1</div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Upload Document</h3>
                        <p className="text-slate-600 leading-relaxed">Click the "Upload PDF" button on the home screen. We support large files and high-resolution documents.</p>
                    </div>
                </div>
                
                <div className="flex gap-5 group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">2</div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Create Signature</h3>
                        <p className="text-slate-600 leading-relaxed">Click "Add Signature" to Type, Draw, or Upload. Choose from 50+ styles, customize colors, and adjust boldness.</p>
                    </div>
                </div>

                <div className="flex gap-5 group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">3</div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Place & Edit</h3>
                        <p className="text-slate-600 leading-relaxed">Click anywhere to place items. Drag to move, grab corners to resize, and <strong>double-click text</strong> to edit directly on the page.</p>
                    </div>
                </div>

                <div className="flex gap-5 group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">4</div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Download</h3>
                        <p className="text-slate-600 leading-relaxed">Hit "Download PDF" to finalize. Your document is processed locally and securely in your browser.</p>
                    </div>
                </div>
            </div>
        </section>
        
        {/* Benefits */}
        <section>
            <h2 className="text-3xl font-black text-slate-900 mb-10 text-center">Why use this tool?</h2>
            <div className="grid md:grid-cols-3 gap-6">
                 <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
                        <Shield size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">100% Secure</h3>
                    <p className="text-slate-600">Your files never leave your device. All processing happens in your browser.</p>
                 </div>
                 <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                        <MousePointer size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Easy to Use</h3>
                    <p className="text-slate-600">Intuitive drag-and-drop interface designed for speed and simplicity.</p>
                 </div>
                 <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                        <Smartphone size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Mobile Friendly</h3>
                    <p className="text-slate-600">Sign documents on the go with a fully responsive mobile design.</p>
                 </div>
            </div>
        </section>

        {/* Features List */}
        <section className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <Layout /> Comprehensive Feature List
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
                <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={18} className="text-blue-400" /> 50+ Handwriting Fonts</li>
                    <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={18} className="text-blue-400" /> Custom Color Picker & Opacity Control</li>
                    <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={18} className="text-blue-400" /> Draw Signature with Pressure Sensitivity</li>
                    <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={18} className="text-blue-400" /> Upload Image Signatures (PNG/JPG)</li>
                    <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={18} className="text-blue-400" /> In-Place Text Editing</li>
                </ul>
                <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={18} className="text-blue-400" /> Smart Date Stamps (Multiple Formats)</li>
                    <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={18} className="text-blue-400" /> Quick Status Stamps (Approved, Paid...)</li>
                    <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={18} className="text-blue-400" /> Undo / Redo History</li>
                    <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={18} className="text-blue-400" /> Drag, Resize & Rotate Anything</li>
                    <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={18} className="text-blue-400" /> Zoom Controls & View Modes</li>
                </ul>
            </div>
        </section>

      </main>
    </div>
  );
};

export default Documentation;
