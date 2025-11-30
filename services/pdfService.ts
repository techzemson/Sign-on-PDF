import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { PDFPageInfo, SignatureItem, SignatureType, DocStats } from '../types';

// We access the global window.pdfjsLib which is loaded via script tag
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
    estimatedTextContent: 75, // Placeholder for chart
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
    // We need to map the screen coordinates back to PDF coordinates
    // The screen (canvas) was rendered at scale 1.5 usually, or whatever the container width is
    // However, we stored 'pageInfos' with the render dimensions.
    
    const pageInfo = pageInfos[sig.pageIndex];
    const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize();
    
    // Scale factors
    const scaleX = pdfPageWidth / pageInfo.width;
    const scaleY = pdfPageHeight / pageInfo.height;

    const x = sig.x * scaleX;
    // PDF coordinate system starts from bottom-left, but web is top-left
    const y = pdfPageHeight - ((sig.y + sig.height) * scaleY) + (sig.height * scaleY) - (sig.height * scaleY); // Adjusted calculation
    // Correct PDF Y: height - (y_from_top + element_height)
    const correctedY = pdfPageHeight - (sig.y * scaleY) - (sig.height * scaleY);

    if (sig.type === SignatureType.IMAGE || sig.type === SignatureType.DRAWING) {
      const pngImage = await pdfDoc.embedPng(sig.content);
      page.drawImage(pngImage, {
        x: x,
        y: correctedY,
        width: sig.width * scaleX,
        height: sig.height * scaleY,
      });
    } else if (sig.type === SignatureType.TEXT) {
      // For text, we will convert the text element to an image using a hidden canvas
      // This preserves the exact font look without embedding huge font files into the PDF
      const textCanvas = document.createElement('canvas');
      // High resolution for text
      const scaleFactor = 3; 
      textCanvas.width = sig.width * scaleFactor;
      textCanvas.height = sig.height * scaleFactor;
      const ctx = textCanvas.getContext('2d');
      if (ctx) {
        ctx.scale(scaleFactor, scaleFactor);
        ctx.font = `${sig.isItalic ? 'italic' : ''} ${sig.isBold ? 'bold' : ''} ${sig.fontSize || 32}px "${sig.fontFamily}"`;
        ctx.fillStyle = sig.color || '#000000';
        ctx.textBaseline = 'top';
        ctx.fillText(sig.content, 0, 0, sig.width); // Allow max width
      }
      
      const textImgData = textCanvas.toDataURL('image/png');
      const pngImage = await pdfDoc.embedPng(textImgData);
       page.drawImage(pngImage, {
        x: x,
        y: correctedY,
        width: sig.width * scaleX,
        height: sig.height * scaleY,
      });
    }
  }

  return await pdfDoc.save();
};
