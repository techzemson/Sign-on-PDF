import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { PDFPageInfo, SignatureItem, SignatureType, DocStats } from '../types';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export const loadPDF = async (fileData: ArrayBuffer): Promise<{ pages: PDFPageInfo[], stats: DocStats }> => {
  // CRITICAL FIX: Create a copy of the buffer. 
  // PDF.js (especially with workers) often transfers ownership of the ArrayBuffer, 
  // causing the original 'fileData' to become detached. 
  // We need the original 'fileData' to remain valid for the final PDF generation/download.
  const dataCopy = fileData.slice(0);

  const loadingTask = window.pdfjsLib.getDocument({ data: dataCopy });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages: PDFPageInfo[] = [];

  // Analyze simple stats
  const stats: DocStats = {
    pageCount: numPages,
    fileSizeMB: parseFloat((fileData.byteLength / (1024 * 1024)).toFixed(2)),
    hasImages: true, // Simplified assumption
    estimatedTextContent: 75,
  };

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // High quality render
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    pages.push({
      pageIndex: i - 1,
      width: viewport.width,
      height: viewport.height,
      dataUrl: canvas.toDataURL('image/jpeg', 0.8),
    });
  }

  return { pages, stats };
};

export const generateSignedPDF = async (
  originalPdfBytes: ArrayBuffer,
  signatures: SignatureItem[],
  pageInfos: PDFPageInfo[]
): Promise<Uint8Array> => {
  try {
    // Check if buffer is detached before trying to load
    if (originalPdfBytes.byteLength === 0) {
        throw new Error("PDF Buffer is empty or detached. Please reload the file.");
    }

    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();

    for (const sig of signatures) {
      if (sig.pageIndex >= pages.length) continue;
      
      const page = pages[sig.pageIndex];
      const pageInfo = pageInfos[sig.pageIndex];
      const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize();
      
      // Scale factors (Canvas Viewport -> PDF Point)
      const scaleX = pdfPageWidth / pageInfo.width;
      const scaleY = pdfPageHeight / pageInfo.height;

      const x = sig.x * scaleX;
      // PDF coordinate system starts from bottom-left
      // sig.y is top-left based.
      const y = pdfPageHeight - (sig.y * scaleY) - (sig.height * scaleY);
      
      const rotationAngle = degrees(sig.rotation || 0);

      let imgBytes: string | Uint8Array | null = null;

      if (sig.type === SignatureType.IMAGE || sig.type === SignatureType.DRAWING) {
        imgBytes = sig.content;
      } else {
        // Render text/stamp to high-res canvas
        const textCanvas = document.createElement('canvas');
        
        // Use a higher render scale for crispness
        const renderScale = 3; 
        
        // Ensure minimum dimensions to prevent 0-size canvas error
        const w = Math.max(sig.width, 10);
        const h = Math.max(sig.height, 10);
        
        textCanvas.width = w * renderScale;
        textCanvas.height = h * renderScale;
        
        const ctx = textCanvas.getContext('2d');
        if (ctx) {
          ctx.scale(renderScale, renderScale);
          
          // Clear background (transparent)
          ctx.clearRect(0, 0, w, h);

          if (sig.type === SignatureType.STAMP) {
             // Draw border
             ctx.strokeStyle = sig.color || '#000';
             ctx.lineWidth = 4;
             ctx.strokeRect(2, 2, w - 4, h - 4);
             
             // Auto-fit text for stamp
             const fontSize = sig.fontSize || 24;
             ctx.font = `bold ${fontSize}px sans-serif`;
             ctx.fillStyle = sig.color || '#000';
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillText(sig.content, w / 2, h / 2);

          } else if (sig.type === SignatureType.SYMBOL) {
              const fontSize = sig.fontSize || 32;
              ctx.font = `bold ${fontSize}px sans-serif`;
              ctx.fillStyle = sig.color || '#000000';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(sig.content, w / 2, h / 2);

          } else {
              // Signature / Date / PlainText
              // IMPORTANT: Use the exact same logic as App.tsx to determine font
              const fontSize = sig.fontSize || (sig.type === SignatureType.PLAINTEXT ? 16 : 32);
              const fontFamily = sig.type === SignatureType.PLAINTEXT ? 'Helvetica, Arial, sans-serif' : (sig.fontFamily || 'sans-serif');
              
              ctx.font = `${sig.isBold ? 'bold ' : ''}${sig.isItalic ? 'italic ' : ''}${fontSize}px ${fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily}`;
              ctx.fillStyle = sig.color || '#000000';
              ctx.textBaseline = 'middle';
              // Draw text - align left, middle
              // We add a small padding (fontSize * 0.25) to match the visual center calculation
              ctx.fillText(sig.content, 0, h / 2);
          }
        }
        imgBytes = textCanvas.toDataURL('image/png');
      }

      if (imgBytes) {
         try {
           const embeddedImage = await pdfDoc.embedPng(imgBytes);
           page.drawImage(embeddedImage, {
            x: x,
            y: y,
            width: sig.width * scaleX,
            height: sig.height * scaleY,
            rotate: rotationAngle,
            opacity: sig.opacity ?? 1,
          });
         } catch (err) {
           console.error("Failed to embed image for signature", sig.id, err);
         }
      }
    }

    return await pdfDoc.save();
  } catch (e) {
    console.error("Fatal error generating PDF", e);
    throw e;
  }
};