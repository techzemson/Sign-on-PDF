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
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();

  for (const sig of signatures) {
    const page = pages[sig.pageIndex];
    const pageInfo = pageInfos[sig.pageIndex];
    const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize();
    
    // Scale factors
    const scaleX = pdfPageWidth / pageInfo.width;
    const scaleY = pdfPageHeight / pageInfo.height;

    const x = sig.x * scaleX;
    // PDF coordinate system starts from bottom-left
    // For rotated items, we might need adjustments, but pdf-lib handles rotation at center usually if specified
    // Here we treat x,y as top-left of the element on screen
    const y = pdfPageHeight - (sig.y * scaleY) - (sig.height * scaleY);
    
    const rotationAngle = degrees(sig.rotation || 0);

    if (sig.type === SignatureType.IMAGE || sig.type === SignatureType.DRAWING) {
      const pngImage = await pdfDoc.embedPng(sig.content);
      page.drawImage(pngImage, {
        x: x,
        y: y,
        width: sig.width * scaleX,
        height: sig.height * scaleY,
        rotate: rotationAngle,
        opacity: sig.opacity ?? 1,
      });
    } else if (sig.type === SignatureType.TEXT || sig.type === SignatureType.DATE || sig.type === SignatureType.STAMP) {
      const textCanvas = document.createElement('canvas');
      const scaleFactor = 3; 
      textCanvas.width = sig.width * scaleFactor;
      textCanvas.height = sig.height * scaleFactor;
      const ctx = textCanvas.getContext('2d');
      if (ctx) {
        ctx.scale(scaleFactor, scaleFactor);
        
        if (sig.type === SignatureType.STAMP) {
           // Draw border
           ctx.strokeStyle = sig.color || '#000';
           ctx.lineWidth = 4;
           ctx.strokeRect(4, 4, sig.width - 8, sig.height - 8);
           ctx.font = `bold ${sig.fontSize || 32}px sans-serif`;
           ctx.fillStyle = sig.color || '#000';
           ctx.textAlign = 'center';
           ctx.textBaseline = 'middle';
           ctx.fillText(sig.content, sig.width / 2, sig.height / 2);
        } else {
            ctx.font = `${sig.isItalic ? 'italic' : ''} ${sig.isBold ? 'bold' : ''} ${sig.fontSize || 32}px "${sig.fontFamily || 'sans-serif'}"`;
            ctx.fillStyle = sig.color || '#000000';
            ctx.textBaseline = 'top';
            // Handle multi-line if needed, but for signature usually single line
            ctx.fillText(sig.content, 0, 0, sig.width);
        }
      }
      
      const textImgData = textCanvas.toDataURL('image/png');
      const pngImage = await pdfDoc.embedPng(textImgData);
       page.drawImage(pngImage, {
        x: x,
        y: y,
        width: sig.width * scaleX,
        height: sig.height * scaleY,
        rotate: rotationAngle,
        opacity: sig.opacity ?? 1,
      });
    }
  }

  return await pdfDoc.save();
};