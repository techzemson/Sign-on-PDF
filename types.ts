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
  DATE = 'DATE',
  STAMP = 'STAMP'
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
  rotation?: number; // Degrees
  
  // Text specific
  fontFamily?: string;
  color?: string;
  isBold?: boolean;
  isItalic?: boolean;
  fontSize?: number;
  opacity?: number;
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
  'Aguafina Script', 'Alex Brush', 'Allura', 'Allison', 'Arizonia', 'Bad Script', 
  'Bilbo Swash Caps', 'Birthstone', 'Birthstone Bounce', 'Bonheur Royale', 
  'Calligraffitti', 'Caramel', 'Cedarville Cursive', 'Cherish', 'Clicker Script', 
  'Comforter', 'Comforter Brush', 'Corinthia', 'Dancing Script', 'Dawne', 
  'DynaPuff', 'Ephesis', 'Euphoria Script', 'Explora', 'Give You Glory', 
  'Glories', 'Gloria Hallelujah', 'Gochi Hand', 'Grape Nuts', 'Great Vibes', 
  'Grechen Fuemen', 'Grey Qo', 'Herr Von Muellerhoff', 'Homemade Apple', 
  'Ingrid Darling', 'Italianno', 'Jim Nightshade', 'Just Me Again Down Here', 
  'Kaushan Script', 'Kristi', 'La Belle Aurore', 'League Script', 'Licorice', 
  'Loved by the King', 'Lovers Quarrel', 'Marck Script', 'Meddon', 'Meie Script', 
  'Miss Fajardose', 'Monsieur La Doulaise', 'Moon Dance', 'Mr Bedfort', 
  'Mr Dafoe', 'Mr De Haviland', 'Mrs Saint Delafield', 'Ms Madi', 'My Soul', 
  'Nothing You Could Do', 'Oooh Baby', 'Over the Rainbow', 'Parisienne', 
  'Passions Conflict', 'Petit Formal Script', 'Pinyon Script', 'Puppies Play', 
  'Qwigley', 'Rancho', 'Redressed', 'Reenie Beanie', 'Rochester', 'Rock Salt', 
  'Rouge Script', 'Ruthie', 'Sacramento', 'Satisfy', 'Schoolbell', 
  'Seaweed Script', 'Sedgwick Ave', 'Shadows Into Light', 'Shadows Into Light Two', 
  'Shalimar', 'Square Peg', 'Stalemate', 'Sue Ellen Francisco', 'Tangerine', 
  'Taprom', 'Twinkle Star', 'Updock', 'Vibs', 'Water Brush', 'Whisper', 
  'WindSong', 'Yellowtail', 'Yesteryear', 'Zeyada'
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
  '#ea580c', // Burnt Orange
  '#0891b2', // Cyan
  '#be185d', // Pink
];

export const STAMPS = [
  { label: 'APPROVED', color: '#166534', borderColor: '#166534' },
  { label: 'REJECTED', color: '#dc2626', borderColor: '#dc2626' },
  { label: 'CONFIDENTIAL', color: '#9a3412', borderColor: '#9a3412' },
  { label: 'DRAFT', color: '#64748b', borderColor: '#64748b' },
  { label: 'COMPLETED', color: '#1e3a8a', borderColor: '#1e3a8a' },
];