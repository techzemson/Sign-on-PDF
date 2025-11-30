import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { PDFPageInfo, SignatureItem, SignatureType, DocStats } from '../types';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export const loadPDF = async (fileData: ArrayBuffer): Promise<{ pages: PDFPageInfo[], stats: DocStats }> => {
  const loadingTask = window.pdfjsLib.getDocument({ data: fileData });
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
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();

    for (const sig of signatures) {
      if (sig.pageIndex >= pages.length) continue;
      
      const page = pages[sig.pageIndex];
      const pageInfo = pageInfos[sig.pageIndex];
      const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize();
      
      // Scale factors (Canvas Viewport -> PDF Point)
      // pageInfo.width/height are the dimensions of the viewport used to render on screen (at scale 1.5 usually)
      // pdfPageWidth/Height are the actual PDF point dimensions.
      // We stored sig.x/y based on the *rendered* size at zoom level.
      // WAIT: in App.tsx, we divide by `zoom` when storing sig.x/y/width/height.
      // So sig.x is relative to page.width (which comes from pageInfo.width).
      
      const scaleX = pdfPageWidth / pageInfo.width;
      const scaleY = pdfPageHeight / pageInfo.height;

      const x = sig.x * scaleX;
      // PDF coordinate system starts from bottom-left
      const y = pdfPageHeight - (sig.y * scaleY) - (sig.height * scaleY);
      
      const rotationAngle = degrees(sig.rotation || 0);

      // We use a temporary canvas to render all text/stamps to ensure they look exactly like on screen
      // then embed as PNG. This avoids font embedding issues in PDF files.
      
      let imgBytes: string | Uint8Array | null = null;
      let isPng = true;

      if (sig.type === SignatureType.IMAGE || sig.type === SignatureType.DRAWING) {
        imgBytes = sig.content;
      } else {
        // Render text/stamp to high-res canvas
        const textCanvas = document.createElement('canvas');
        const renderScale = 3; // High resolution multiplier
        textCanvas.width = sig.width * renderScale;
        textCanvas.height = sig.height * renderScale;
        
        const ctx = textCanvas.getContext('2d');
        if (ctx) {
          ctx.scale(renderScale, renderScale);
          
          // Clear background (transparent)
          ctx.clearRect(0, 0, sig.width, sig.height);

          if (sig.type === SignatureType.STAMP) {
             // Draw border
             ctx.strokeStyle = sig.color || '#000';
             ctx.lineWidth = 4; // Relative to unscaled coord
             ctx.strokeRect(2, 2, sig.width - 4, sig.height - 4);
             
             // Auto-fit text for stamp
             const fontSize = sig.fontSize || 24;
             ctx.font = `bold ${fontSize}px sans-serif`;
             ctx.fillStyle = sig.color || '#000';
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillText(sig.content, sig.width / 2, sig.height / 2);
          } else if (sig.type === SignatureType.PLAINTEXT) {
              const fontSize = sig.fontSize || 16;
              ctx.font = `${sig.isItalic ? 'italic' : ''} ${sig.isBold ? 'bold' : ''} ${fontSize}px Helvetica, Arial, sans-serif`;
              ctx.fillStyle = sig.color || '#000000';
              ctx.textBaseline = 'top';
              // Simple text wrapping or clipping? Simple text for now.
              ctx.fillText(sig.content, 0, 0);
          } else if (sig.type === SignatureType.SYMBOL) {
              const fontSize = sig.fontSize || 32;
              ctx.font = `bold ${fontSize}px sans-serif`;
              ctx.fillStyle = sig.color || '#000000';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(sig.content, sig.width / 2, sig.height / 2);
          } else {
              // Signature / Date
              const fontSize = sig.fontSize || 32;
              // Ensure font is loaded, otherwise it might fallback. 
              // Since it's client side, the font should be available in the browser cache.
              ctx.font = `${sig.isItalic ? 'italic' : ''} ${sig.isBold ? 'bold' : ''} ${fontSize}px "${sig.fontFamily || 'sans-serif'}"`;
              ctx.fillStyle = sig.color || '#000000';
              ctx.textBaseline = 'middle';
              // Center vertically for better alignment in the box
              ctx.fillText(sig.content, 0, sig.height / 2);
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