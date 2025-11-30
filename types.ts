export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data: ArrayBuffer;
}

export enum SignatureType {
  DRAWING = 'DRAWING',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
}

export interface SignatureItem {
  id: string;
  type: SignatureType;
  content: string; // Base64 image or Text string
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  
  // Text specific
  fontFamily?: string;
  color?: string;
  isBold?: boolean;
  isItalic?: boolean;
  fontSize?: number;
}

export interface PDFPageInfo {
  pageIndex: number;
  width: number;
  height: number;
  dataUrl: string; // The rendered image of the page
}

export interface DocStats {
  pageCount: number;
  fileSizeMB: number;
  hasImages: boolean;
  estimatedTextContent: number; // percentage
}

export const SIGNATURE_FONTS = [
  'Aguafina Script', 'Alex Brush', 'Allura', 'Arizonia', 'Bad Script', 
  'Bilbo Swash Caps', 'Birthstone', 'Bonheur Royale', 'Calligraffitti', 
  'Cedarville Cursive', 'Clicker Script', 'Dancing Script', 'Dawne', 
  'Euphoria Script', 'Great Vibes', 'Herr Von Muellerhoff', 'Homemade Apple', 
  'Italianno', 'Jim Nightshade', 'Kristi', 'La Belle Aurore', 'League Script', 
  'Marck Script', 'Meddon', 'Meie Script', 'Monsieur La Doulaise', 
  'Mr De Haviland', 'Mrs Saint Delafield', 'Nothing You Could Do', 
  'Over the Rainbow', 'Parisienne', 'Petit Formal Script', 'Pinyon Script', 
  'Qwigley', 'Reenie Beanie', 'Rochester', 'Rouge Script', 'Sacramento', 
  'Seaweed Script', 'Shadows Into Light', 'Tangerine', 'WindSong', 
  'Yellowtail', 'Zeyada'
];

export const COLORS = [
  '#000000', // Black
  '#1e3a8a', // Dark Blue
  '#dc2626', // Red
  '#166534', // Green
  '#5b21b6', // Purple
  '#9a3412', // Orange
  '#0f172a', // Slate
  '#4a044e', // Fuchsia
];