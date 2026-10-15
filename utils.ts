
import { DocumentStatus } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const normalizePlate = (plate: string): string => {
  if (!plate) return "";
  return String(plate)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
};

export const normalizeStr = (str: string): string => {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/_/g, ' ') 
    .replace(/\s+/g, ' ') 
    .trim();
};

export const calculateStatus = (expiryDate: string): DocumentStatus => {
  if (!expiryDate) return 'expired';
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime()) || expiry.getFullYear() < 1900) return 'expired';
  
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays >= 0 && diffDays <= 14) return 'critical';
  if (diffDays >= 15 && diffDays <= 29) return 'warning';
  return 'active';
};

export const getDaysDiff = (expiryDate: string): number => {
  if (!expiryDate) return 0;
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return 0;
  
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'No disponible';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  } catch (e) { return dateString; }
};

export const getDriveDirectLink = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith('data:image')) return cleanUrl;
  if (!cleanUrl.includes('drive.google.com') && !cleanUrl.includes('docs.google.com')) return cleanUrl;
  
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/, 
    /id=([a-zA-Z0-9_-]+)/, 
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/file\/([a-zA-Z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      // thumbnail?id= is very reliable for public/shared Drive files
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
  }
  return cleanUrl;
};

export const isImageLink = (url: string): boolean => {
  if (!url) return false;
  return url.startsWith('data:image') || url.includes('drive.google.com') || /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(url);
};

export interface ProcesarFotoOptions {
  placa?: string;
  modulo?: string;
  usuario?: string;
}

/**
 * Obtiene la fecha y hora actual en zona horaria de Colombia (formato dd/mm/yyyy hh:mm)
 */
export const getColombiaFormattedDate = (): string => {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(now);

    const get = (t: string) => parts.find(p => p.type === t)?.value || '';
    const day = get('day');
    const month = get('month');
    const year = get('year');
    const hour = get('hour');
    const minute = get('minute');
    if (day && month && year && hour && minute) {
      return `${day}/${month}/${year} ${hour}:${minute}`;
    }
  } catch {
    // Fallback manual si Intl falla
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

/**
 * Procesa UNA sola vez una foto tomada o subida en la app:
 * 1. Redimensiona manteniendo proporción (máx 1280px en el lado mayor)
 * 2. Dibuja marca de agua mini en esquina inferior derecha (margen 12px, franja negra 45%, 2 líneas)
 * 3. Comprime a JPEG 0.7 y devuelve la cadena base64 DataURL
 */
export const procesarFoto = (
  fileOrBase64: File | Blob | string,
  options?: ProcesarFotoOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!fileOrBase64) {
      resolve('');
      return;
    }

    const processLoadedImage = (img: HTMLImageElement, fallbackSrc: string) => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        if (!origW || !origH) {
          resolve(fallbackSrc);
          return;
        }

        // 1. Redimensionar (máx 1280px en el lado mayor)
        const maxDim = 1280;
        const scale = Math.min(1, maxDim / Math.max(origW, origH));
        const width = Math.max(1, Math.round(origW * scale));
        const height = Math.max(1, Math.round(origH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(fallbackSrc);
          return;
        }

        // Dibujar imagen
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Construir textos de la marca de agua
        // Línea 1: "BQA · [PLACA] · [MÓDULO]" (sin huecos vacíos)
        const line1Parts: string[] = ['BQA'];
        if (options?.placa && options.placa.trim()) {
          line1Parts.push(options.placa.trim().toUpperCase());
        }
        if (options?.modulo && options.modulo.trim()) {
          line1Parts.push(options.modulo.trim().toUpperCase());
        }
        const line1 = line1Parts.join(' · ');

        // Línea 2: "dd/mm/yyyy hh:mm · [Nombre del usuario]" (sin huecos vacíos)
        const fechaHora = getColombiaFormattedDate();
        const line2Parts: string[] = [fechaHora];
        if (options?.usuario && options.usuario.trim()) {
          line2Parts.push(options.usuario.trim());
        }
        const line2 = line2Parts.join(' · ');

        // Tamaño proporcional a la foto (~2.2% del ancho, mínimo 14px)
        const fontSize = Math.max(14, Math.round(width * 0.022));
        const lineHeight = Math.round(fontSize * 1.34);
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

        const m1 = ctx.measureText(line1);
        const m2 = ctx.measureText(line2);
        const maxTextW = Math.max(m1.width, m2.width);

        const padX = Math.max(9, Math.round(fontSize * 0.65));
        const padY = Math.max(6, Math.round(fontSize * 0.45));
        const boxWidth = Math.round(maxTextW + (padX * 2));
        const boxHeight = Math.round((lineHeight * 2) + (padY * 2));

        // Margen de 12px en la esquina inferior derecha
        const margin = 12;
        const x = width - boxWidth - margin;
        const y = height - boxHeight - margin;
        const radius = Math.max(6, Math.round(fontSize * 0.35));

        // Franja semitransparente (negro al 45% de opacidad) con bordes redondeados
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, boxWidth, boxHeight, radius);
        } else {
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + boxWidth - radius, y);
          ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + radius);
          ctx.lineTo(x + boxWidth, y + boxHeight - radius);
          ctx.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - radius, y + boxHeight);
          ctx.lineTo(x + radius, y + boxHeight);
          ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
        }
        ctx.closePath();
        ctx.fill();

        // Texto blanco con sombra suave
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;

        ctx.fillText(line1, x + padX, y + padY);
        ctx.fillText(line2, x + padX, y + padY + lineHeight);
        ctx.restore();

        // 3. Comprimir a JPEG 0.7
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch (err) {
        console.warn('Error al procesar foto con marca de agua:', err);
        resolve(fallbackSrc);
      }
    };

    if (typeof fileOrBase64 === 'string') {
      const img = new Image();
      img.onload = () => processLoadedImage(img, fileOrBase64);
      img.onerror = () => resolve(fileOrBase64);
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = (ev.target?.result as string) || '';
        const img = new Image();
        img.onload = () => processLoadedImage(img, src);
        img.onerror = () => resolve(src);
        img.src = src;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    }
  });
};

// Mantiene compatibilidad con módulos existentes canalizando hacia procesarFoto
export const processImageWithWatermark = (
  base64Str: string, 
  text: string, 
  _coords?: { lat: number, lng: number },
  _customDate?: string
): Promise<string> => {
  return procesarFoto(base64Str, { placa: text });
};

export const compressImage = (base64Str: string, maxWidth = 1920): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(base64Str);
  });
};

export const createMosaic = async (base64Array: string[], title?: string): Promise<string> => {
  if (base64Array.length === 0) return "";
  
  const images = await Promise.all(base64Array.map(base64 => {
    return new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Fallback for broken images
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(0, 0, 100, 100);
        }
        const fallbackImg = new Image();
        fallbackImg.src = canvas.toDataURL();
        resolve(fallbackImg);
      };
    });
  }));

  const numImages = images.length;
  let cols = 2;
  let rows = 1;

  if (numImages === 1) { cols = 1; rows = 1; }
  else if (numImages === 2) { cols = 2; rows = 1; }
  else if (numImages <= 4) { cols = 2; rows = 2; }
  else if (numImages <= 6) { cols = 3; rows = 2; }
  else {
    cols = Math.ceil(Math.sqrt(numImages));
    rows = Math.ceil(numImages / cols);
  }

  const canvas = document.createElement('canvas');
  // Reducir la resolución del collage para evitar exceder el límite de 10MB de Google Apps Script
  const cellWidth = 800; 
  const cellHeight = 600;
  const headerHeight = title ? 80 : 0;

  canvas.width = cols * cellWidth;
  canvas.height = (rows * cellHeight) + headerHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) return base64Array[0];

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Title Header
  if (title) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, headerHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(headerHeight * 0.45)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.toUpperCase(), canvas.width / 2, headerHeight / 2);
  }

  images.forEach((img, i) => {
    const x = (i % cols) * cellWidth;
    const y = Math.floor(i / cols) * cellHeight + headerHeight;
    
    // Draw cell background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x, y, cellWidth, cellHeight);

    // Calculate aspect ratio to fit image in cell with padding
    const padding = 20;
    const innerWidth = cellWidth - (padding * 2);
    const innerHeight = cellHeight - (padding * 2);
    
    const imgRatio = img.width / img.height;
    const innerRatio = innerWidth / innerHeight;
    
    let drawWidth = innerWidth;
    let drawHeight = innerHeight;
    let offsetX = padding;
    let offsetY = padding;

    if (imgRatio > innerRatio) {
      drawHeight = innerWidth / imgRatio;
      offsetY = padding + (innerHeight - drawHeight) / 2;
    } else {
      drawWidth = innerHeight * imgRatio;
      offsetX = padding + (innerWidth - drawWidth) / 2;
    }

    // Shadow effect for images
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cellWidth, cellHeight);
  });

  // Reducir la calidad de compresión a 0.8 para ahorrar peso
  return canvas.toDataURL('image/jpeg', 0.8); 
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const extractNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.floor(val);
  const cleaned = String(val).replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};
