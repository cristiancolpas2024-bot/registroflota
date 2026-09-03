import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, 
  Calendar, 
  User, 
  Building2, 
  Wrench, 
  Camera, 
  Trash2, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  History, 
  FileSpreadsheet, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Filter, 
  Mail, 
  Truck, 
  Hash, 
  Send, 
  Loader2, 
  ExternalLink, 
  Info, 
  X, 
  Copy, 
  Layers, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Eye,
  Plus,
  Images,
  Maximize2
} from 'lucide-react';
import { Vehicle, NoveltyReport, NoveltyReportPayload } from '../types';
import { submitNoveltyReport, submitNoveltyClose, fetchNoveltyReportsFromSheet } from '../services/sheetService';

export const NOVELTY_WORKSHOPS = [
  'ELECTRONIC',
  'VEHIPESA',
  'TODOFIBRA',
  'TECNIBENZ',
  'NAVITRANS'
];

export const CORREO_TALLER: Record<string, string> = {
  "TECNIBENZ": "Gerente@mtecnibenz.com,Contabilidad@mtecnibenz.com",
  "TODOFIBRA": "administracion@carroceriastodofibra.com.co",
  "ELECTRONIC": "zonanorte@elec-s.com,comercial5@elec-s.com",
  "NAVITRANS": "jfrancot@navitrans.com.co",
  "VEHIPESA": "auxi.adm.vehipesa@gmail.com,aux.operativo.vehipesa@gmail.com"
};

export const CC_NOVIDADES = "aperez@rentingcolombia.com,edgar.arrieta@ab-inbev.com";

// ==========================================
// UTILIDADES DE COLLAGE Y COMPRESIÓN
// ==========================================

const compressSingleImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Error al leer la imagen'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al cargar archivo'));
    reader.readAsDataURL(file);
  });
};

/**
 * Genera un collage limpio, equilibrado y de alta resolución (hasta 4 imágenes)
 */
export const buildCollageFromImages = (images: string[]): Promise<string> => {
  return new Promise((resolve) => {
    if (!images || images.length === 0) {
      resolve('');
      return;
    }
    const count = Math.min(images.length, 4);
    if (count === 1) {
      resolve(images[0]);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(images[0]);
      return;
    }

    const padding = 10;
    const canvasWidth = 1200;
    let canvasHeight = 800;

    if (count === 2) {
      canvasHeight = 650;
    } else if (count === 3) {
      canvasHeight = 850;
    } else if (count === 4) {
      canvasHeight = 900;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fondo blanco nítido
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    const renderGrid = () => {
      const drawSlot = (image: HTMLImageElement | undefined, x: number, y: number, w: number, h: number, num: number) => {
        if (!image) return;
        ctx.save();
        
        // Bordes redondeados sutiles en cada celda
        const radius = 8;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.clip();

        // Object-fit: cover
        const imgAspect = image.width / image.height;
        const slotAspect = w / h;
        let sx = 0, sy = 0, sW = image.width, sH = image.height;

        if (imgAspect > slotAspect) {
          sW = image.height * slotAspect;
          sx = (image.width - sW) / 2;
        } else {
          sH = image.width / slotAspect;
          sy = (image.height - sH) / 2;
        }

        ctx.drawImage(image, sx, sy, sW, sH, x, y, w, h);
        ctx.restore();

        // Badge indicador numerado (#1, #2, #3, #4)
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; // Slate 900
        ctx.beginPath();
        ctx.arc(x + 22, y + 22, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num.toString(), x + 22, y + 22);
        ctx.restore();
      };

      if (count === 2) {
        const slotW = (canvasWidth - padding * 3) / 2;
        const slotH = canvasHeight - padding * 2;
        drawSlot(loadedImages[0], padding, padding, slotW, slotH, 1);
        drawSlot(loadedImages[1], padding * 2 + slotW, padding, slotW, slotH, 2);
      } else if (count === 3) {
        const topSlotW = (canvasWidth - padding * 3) / 2;
        const topSlotH = (canvasHeight - padding * 3) / 2;
        const botSlotW = canvasWidth - padding * 2;
        const botSlotH = topSlotH;

        drawSlot(loadedImages[0], padding, padding, topSlotW, topSlotH, 1);
        drawSlot(loadedImages[1], padding * 2 + topSlotW, padding, topSlotW, topSlotH, 2);
        drawSlot(loadedImages[2], padding, padding * 2 + topSlotH, botSlotW, botSlotH, 3);
      } else if (count === 4) {
        const slotW = (canvasWidth - padding * 3) / 2;
        const slotH = (canvasHeight - padding * 3) / 2;
        [0, 1, 2, 3].forEach((i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = padding + col * (slotW + padding);
          const y = padding + row * (slotH + padding);
          drawSlot(loadedImages[i], x, y, slotW, slotH, i + 1);
        });
      }

      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };

    images.slice(0, 4).forEach((src, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadedImages[idx] = img;
        loadedCount++;
        if (loadedCount === count) renderGrid();
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === count) renderGrid();
      };
      img.src = src;
    });
  });
};

// ==========================================
// COMPONENTE DE SUBIDA DE FOTOS Y COLLAGE
// ==========================================

interface EvidenceCollageUploaderProps {
  label: string;
  slotNumber: number;
  photos: string[];
  collage: string;
  onChange: (photos: string[], collage: string) => void;
  onViewImage: (url: string, title: string) => void;
  disabled?: boolean;
}

const EvidenceCollageUploader: React.FC<EvidenceCollageUploaderProps> = ({
  label,
  slotNumber,
  photos,
  collage,
  onChange,
  onViewImage,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      const remainingSlots = 4 - photos.length;
      const filesToProcess = files.slice(0, remainingSlots);

      const newBase64s = await Promise.all(
        filesToProcess.map((f: File) => compressSingleImage(f))
      );

      const updatedPhotos = [...photos, ...newBase64s].slice(0, 4);
      const newCollage = await buildCollageFromImages(updatedPhotos);
      onChange(updatedPhotos, newCollage);
    } catch (err) {
      console.error('Error procesando fotos de evidencia:', err);
      alert('Hubo un error al procesar alguna de las imágenes.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveSinglePhoto = async (indexToRemove: number) => {
    const updatedPhotos = photos.filter((_, idx) => idx !== indexToRemove);
    if (updatedPhotos.length === 0) {
      onChange([], '');
    } else {
      setIsProcessing(true);
      const newCollage = await buildCollageFromImages(updatedPhotos);
      onChange(updatedPhotos, newCollage);
      setIsProcessing(false);
    }
  };

  const handleClearAll = () => {
    onChange([], '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isFull = photos.length >= 4;

  return (
    <div className="border-2 border-slate-200 hover:border-indigo-300 rounded-3xl p-4 bg-slate-50/60 transition-all flex flex-col justify-between min-h-[220px]">
      {/* Cabecera del Slot */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
            {slotNumber}
          </div>
          <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
            {label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
            photos.length === 0 
              ? 'bg-slate-100 text-slate-500 border-slate-200' 
              : isFull 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
            {photos.length}/4 fotos {isFull ? '(Máx)' : ''}
          </span>

          {photos.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={disabled || isProcessing}
              title="Borrar todas las fotos de este slot"
              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Cuerpo: Empty State o Grid con Miniaturas y Collage */}
      {photos.length === 0 ? (
        <div 
          onClick={() => !disabled && fileInputRef.current?.click()}
          className="flex-1 flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl bg-white hover:bg-indigo-50/30 cursor-pointer transition-all text-center group min-h-[140px]"
        >
          <input
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFiles}
            disabled={disabled || isProcessing}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
          </div>

          <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
            Toca para subir fotos
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Puedes seleccionar hasta 4 fotos (crea collage automático)
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Miniaturas de fotos individuales subidas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Fotos Seleccionadas ({photos.length}):
              </span>
              {!isFull && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isProcessing}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 uppercase"
                >
                  <Plus size={12} /> Agregar foto
                </button>
              )}
            </div>

            <input
              type="file"
              multiple
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFiles}
              disabled={disabled || isProcessing}
              className="hidden"
            />

            <div className="grid grid-cols-4 gap-2">
              {photos.map((photo, pIdx) => (
                <div key={pIdx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-black aspect-square shadow-xs">
                  <img
                    src={photo}
                    alt={`Foto ${pIdx + 1}`}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                  <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-slate-900/80 text-white text-[9px] font-black flex items-center justify-center">
                    {pIdx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSinglePhoto(pIdx)}
                    disabled={disabled || isProcessing}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all shadow-sm"
                    title="Eliminar esta foto"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}

              {!isFull && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isProcessing}
                  className="border-2 border-dashed border-indigo-300 hover:border-indigo-600 rounded-xl flex flex-col items-center justify-center bg-indigo-50/40 hover:bg-indigo-50 text-indigo-600 transition-all aspect-square"
                  title="Agregar otra foto"
                >
                  <Plus size={16} />
                  <span className="text-[9px] font-bold mt-0.5">Más</span>
                </button>
              )}
            </div>
          </div>

          {/* Vista previa del Collage / Imagen Compuesta */}
          {collage && (
            <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight flex items-center gap-1">
                  <Images size={12} className="text-indigo-600" />
                  {photos.length > 1 ? `Collage Generado (${photos.length} Fotos)` : 'Foto Final'}
                </span>
                <button
                  type="button"
                  onClick={() => onViewImage(collage, `${label} (${photos.length} Fotos)`)}
                  className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 transition-colors"
                >
                  <Maximize2 size={10} /> Ampliar
                </button>
              </div>

              <div 
                onClick={() => onViewImage(collage, `${label} (${photos.length} Fotos)`)}
                className="relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-32 cursor-pointer group"
              >
                <img
                  src={collage}
                  alt="Collage"
                  className="max-h-32 w-full object-contain rounded-lg group-hover:scale-102 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                  <Eye size={14} /> Ver Collage
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface NoveltyReportModuleProps {
  vehicles?: Vehicle[];
  reports?: NoveltyReport[];
  onRefresh?: () => Promise<NoveltyReport[] | void>;
}

export default function NoveltyReportModule({ 
  vehicles = [], 
  reports = [], 
  onRefresh 
}: NoveltyReportModuleProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'docs'>('form');

  // Form State
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [plate, setPlate] = useState<string>('');
  const [cd, setCd] = useState<string>('');
  const [contratista, setContratista] = useState<string>('');
  const [conductor, setConductor] = useState<string>('');
  const [novedad, setNovedad] = useState<string>('');
  const [taller, setTaller] = useState<string>(NOVELTY_WORKSHOPS[0]);
  
  // Evidencias (Fotos individuales y Collage compuesto en Base64)
  const [evidencia1Photos, setEvidencia1Photos] = useState<string[]>([]);
  const [evidencia1, setEvidencia1] = useState<string>('');
  const [evidencia2Photos, setEvidencia2Photos] = useState<string[]>([]);
  const [evidencia2, setEvidencia2] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [plateSearch, setPlateSearch] = useState<string>('');
  const [isPlateDropdownOpen, setIsPlateDropdownOpen] = useState(false);

  // History State
  const [internalReports, setInternalReports] = useState<NoveltyReport[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTaller, setFilterTaller] = useState('ALL');
  const [filterEstado, setFilterEstado] = useState<'ALL' | 'ABIERTO' | 'CERRADO'>('ALL');
  const [filterCd, setFilterCd] = useState('ALL');

  // Sync with incoming reports prop or local state
  const allReports = reports && reports.length > 0 ? reports : internalReports;

  // Image Modal
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);

  // Close Novelty Modal State
  const [closingRecord, setClosingRecord] = useState<NoveltyReport | null>(null);
  const [cierre1Photos, setCierre1Photos] = useState<string[]>([]);
  const [cierreEvidencia1, setCierreEvidencia1] = useState<string>('');
  const [cierre2Photos, setCierre2Photos] = useState<string[]>([]);
  const [cierreEvidencia2, setCierreEvidencia2] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);
  const [closeSuccess, setCloseSuccess] = useState(false);

  // Copy code state
  const [copiedCode, setCopiedCode] = useState(false);

  // Auto-fill CD and Contratista on plate selection
  const handleSelectPlate = (selectedPlate: string) => {
    const cleanPlate = selectedPlate.trim().toUpperCase();
    setPlate(cleanPlate);
    setPlateSearch(cleanPlate);
    setIsPlateDropdownOpen(false);

    const match = vehicles.find(v => v.plate.toUpperCase() === cleanPlate);
    if (match) {
      if (match.cd) setCd(match.cd);
      if (match.contractor) setContratista(match.contractor);
    }
  };

  // Load History
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      if (onRefresh) {
        const res = await onRefresh();
        if (res && Array.isArray(res)) {
          setInternalReports(res);
        }
      } else {
        const data = await fetchNoveltyReportsFromSheet();
        setInternalReports(data);
      }
    } catch (err) {
      console.error('Error cargando historial de novedades:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    // Cargar historial al montar el componente para tener los reportes siempre listos
    loadHistory();
  }, []);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!plate.trim()) {
      setErrorMessage('Por favor ingrese o seleccione la placa del vehículo.');
      return;
    }
    if (!novedad.trim()) {
      setErrorMessage('Por favor describa detalladamente la novedad o falla reportada.');
      return;
    }
    if (!taller) {
      setErrorMessage('Por favor seleccione el taller asignado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: NoveltyReportPayload = {
        fecha,
        cd: cd.trim().toUpperCase(),
        contratista: contratista.trim().toUpperCase(),
        plate: plate.trim().toUpperCase(),
        conductor: conductor.trim(),
        novedad: novedad.trim(),
        taller: taller.trim().toUpperCase(),
        evidencia1: evidencia1 || undefined,
        evidencia2: evidencia2 || undefined,
      };

      const success = await submitNoveltyReport(payload);

      if (success) {
        setSubmitSuccess(`¡Novedad reportada con éxito! Se guardó en la hoja NOVEDADES y se envió notificación por correo al taller ${taller}.`);
        // Reset form
        setPlate('');
        setPlateSearch('');
        setCd('');
        setContratista('');
        setConductor('');
        setNovedad('');
        setEvidencia1Photos([]);
        setEvidencia1('');
        setEvidencia2Photos([]);
        setEvidencia2('');
        
        // Auto reload history
        await loadHistory();
      } else {
        setErrorMessage('Ocurrió un error al enviar el reporte. Por favor intente nuevamente.');
      }
    } catch (err) {
      console.error('Error al reportar novedad:', err);
      setErrorMessage('Error de conexión con Google Sheets / Apps Script.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Closure
  const handleCloseNoveltySubmit = async () => {
    if (!closingRecord) return;
    setIsClosing(true);
    try {
      const ok = await submitNoveltyClose({
        ot: closingRecord.ot,
        plate: closingRecord.plate,
        evidenciaCierre1: cierreEvidencia1 || undefined,
        evidenciaCierre2: cierreEvidencia2 || undefined,
      });

      if (ok) {
        setCloseSuccess(true);
        setTimeout(async () => {
          setClosingRecord(null);
          setCierre1Photos([]);
          setCierreEvidencia1('');
          setCierre2Photos([]);
          setCierreEvidencia2('');
          setCloseSuccess(false);
          await loadHistory();
        }, 1200);
      } else {
        alert('Error al cerrar la novedad. Verifique la conexión.');
      }
    } catch (e) {
      console.error('Error al cerrar novedad:', e);
      alert('Error al cerrar la novedad.');
    } finally {
      setIsClosing(false);
    }
  };

  // Export CSV
  const exportToCSV = () => {
    if (allReports.length === 0) return;

    const headers = [
      'Orden de Trabajo', 
      'Fecha', 
      'CD', 
      'Contratista', 
      'Placa', 
      'Conductor', 
      'Novedades', 
      'Taller', 
      'Evidencia 1', 
      'Evidencia 2', 
      'Estado', 
      'Evidencia Cierre 1', 
      'Evidencia Cierre 2'
    ];

    const rows = allReports.map(r => [
      `"${r.ot || ''}"`,
      `"${r.fecha || ''}"`,
      `"${r.cd || ''}"`,
      `"${r.contratista || ''}"`,
      `"${r.plate || ''}"`,
      `"${(r.conductor || '').replace(/"/g, '""')}"`,
      `"${(r.novedad || '').replace(/"/g, '""')}"`,
      `"${r.taller || ''}"`,
      `"${(r.evidenciaReporte1 || '').replace(/"/g, '""')}"`,
      `"${(r.evidenciaReporte2 || '').replace(/"/g, '""')}"`,
      `"${r.estado || ''}"`,
      `"${(r.evidenciaCierre1 || '').replace(/"/g, '""')}"`,
      `"${(r.evidenciaCierre2 || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reportes_Novedades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered vehicles list for search dropdown
  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(plateSearch.toLowerCase()) ||
    (v.cd && v.cd.toLowerCase().includes(plateSearch.toLowerCase())) ||
    (v.contractor && v.contractor.toLowerCase().includes(plateSearch.toLowerCase()))
  );

  // Filtered and sorted history records (descending by OT or Fecha)
  const filteredHistory = allReports
    .filter(r => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        (r.plate || '').toLowerCase().includes(search) ||
        (r.ot || '').toLowerCase().includes(search) ||
        (r.conductor || '').toLowerCase().includes(search) ||
        (r.novedad || '').toLowerCase().includes(search) ||
        (r.taller || '').toLowerCase().includes(search) ||
        (r.cd || '').toLowerCase().includes(search) ||
        (r.contratista || '').toLowerCase().includes(search);

      const matchesTaller = filterTaller === 'ALL' || (r.taller || '').toUpperCase() === filterTaller.toUpperCase();
      const matchesEstado = filterEstado === 'ALL' || (r.estado || '').toUpperCase() === filterEstado.toUpperCase();
      const matchesCd = filterCd === 'ALL' || (r.cd || '').toUpperCase() === filterCd.toUpperCase();

      return matchesSearch && matchesTaller && matchesEstado && matchesCd;
    })
    .sort((a, b) => {
      // Orden descendente por OT o por Fecha
      if (b.ot && a.ot) {
        return b.ot.localeCompare(a.ot, undefined, { numeric: true, sensitivity: 'base' });
      }
      return (b.fecha || '').localeCompare(a.fecha || '');
    });

  const countAbiertos = allReports.filter(r => (r.estado || '').toUpperCase() === 'ABIERTO').length;
  const countCerrados = allReports.filter(r => (r.estado || '').toUpperCase() === 'CERRADO').length;

  const appsScriptSnippet = `// APPS SCRIPT: Código para el Reporte de Novedades
// Documento (docId): 1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU
// Hoja: NOVEDADES (gid 1190843304)

else if (m === 'POST_NOVELTY_REPORT') {
  var s = findSheetCaseInsensitive(ss, "NOVEDADES") || getSheetByGid(ss, "1190843304") || getS(ss, "NOVEDADES");
  if (!s) {
    if (lock.hasLock()) lock.releaseLock();
    return output("error", "No se encontró la hoja NOVEDADES.");
  }

  var placa = (d.plate || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
  var novedad = (d.novedad || "").toString().trim();
  var fechaR = d.fecha || today();

  // DEDUP: revisar las últimas 5 filas por placa+novedad+fecha iguales para evitar doble registro
  var data = s.getDataRange().getValues();
  for (var i = Math.max(1, data.length - 5); i < data.length; i++) {
    var rPlaca = (data[i][4] || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
    var rNov = (data[i][6] || "").toString().trim();
    var rFecha = (data[i][1] || "").toString().trim();
    if (rPlaca === placa && rNov === novedad && rFecha.indexOf(fechaR) !== -1) {
      // Ya existe: no duplicar, devolver éxito con la OT existente
      if (lock.hasLock()) lock.releaseLock();
      return output("success", "Novedad ya registrada (" + (data[i][0] || "") + ").");
    }
  }

  // Orden de trabajo automática: OT- + (número de filas)
  var lastRow = s.getLastRow();
  var ot = "OT-" + ("0000" + (lastRow)).slice(-4);

  var ev1 = sImg(d.evidencia1, "NOV_REP1_" + placa);
  var ev2 = sImg(d.evidencia2, "NOV_REP2_" + placa);

  var rowData = [
    ot,
    fechaR,
    d.cd || "",
    d.contratista || "",
    placa,
    d.conductor || "",
    novedad,
    (d.taller || "").toString().toUpperCase().trim(),
    ev1 || "",
    ev2 || "",
    "ABIERTO",
    "",  // evidencia cierre 1
    ""   // evidencia cierre 2
  ];
  s.appendRow(rowData);

  // Enviar correo directo al taller con copia fija
  try {
    enviarCorreoNovedad(d.taller, ot, fechaR, d.cd, d.contratista, placa, d.conductor, novedad, ev1, ev2);
  } catch (mailErr) {
    log("Error correo novedad: " + mailErr.toString(), docId);
  }

  if (lock.hasLock()) lock.releaseLock();
  return output("success", "Novedad reportada (" + ot + ") y correo enviado al taller " + d.taller + ".");
}

function enviarCorreoNovedad(taller, ot, fecha, cd, contratista, placa, conductor, novedad, ev1, ev2) {
  var correosTaller = {
    "TECNIBENZ": "Gerente@mtecnibenz.com,Contabilidad@mtecnibenz.com",
    "TODOFIBRA": "administracion@carroceriastodofibra.com.co",
    "ELECTRONIC": "zonanorte@elec-s.com,comercial5@elec-s.com",
    "NAVITRANS": "jfrancot@navitrans.com.co",
    "VEHIPESA": "auxi.adm.vehipesa@gmail.com,aux.operativo.vehipesa@gmail.com"
  };
  var cc = "aperez@rentingcolombia.com,edgar.arrieta@ab-inbev.com";
  var destino = correosTaller[(taller || "").toUpperCase().trim()] || cc;

  var estado = "ABIERTO";
  var estadoColor = "#F2B705"; // dorado para ABIERTO

  // Fila auxiliar (label + valor) con fondo alterno
  function fila(label, valor, bg, valorColor, bold) {
    return '<tr style="background:' + bg + ';">' +
             '<td style="padding:12px 16px;color:#6B7280;font-size:14px;width:45%;">' + label + '</td>' +
             '<td style="padding:12px 16px;color:' + (valorColor || '#111827') + ';font-size:14px;' + (bold ? 'font-weight:bold;' : '') + '">' + (valor || '') + '</td>' +
           '</tr>';
  }

  var filas =
    fila('Taller Asignado:', taller, '#F1F3F5', '#111827', true) +
    fila('Fecha de Reporte:', fecha, '#FFFFFF') +
    fila('Placa del Vehículo:', placa, '#F1F3F5', '#111827', true) +
    fila('Centro de Distribución (CD):', cd, '#FFFFFF') +
    fila('Contratista:', contratista, '#F1F3F5') +
    fila('Conductor:', conductor, '#FFFFFF') +
    fila('Descripción Novedad:', novedad, '#F1F3F5', '#DC2626', true) +
    fila('Estado:', estado, '#FFFFFF', estadoColor, true);

  var evHtml = "";
  if (ev1 && ev1.indexOf("http") === 0) evHtml += '<p style="margin:8px 0;"><a href="' + ev1 + '" style="color:#0D2B4E;text-decoration:none;font-weight:bold;">🔗 Ver Evidencia de Reporte 1</a></p>';
  if (ev2 && ev2.indexOf("http") === 0) evHtml += '<p style="margin:8px 0;"><a href="' + ev2 + '" style="color:#0D2B4E;text-decoration:none;font-weight:bold;">🔗 Ver Evidencia de Reporte 2</a></p>';
  if (!evHtml) evHtml = '<p style="color:#6B7280;">Sin evidencias adjuntas.</p>';

  var html =
  '<div style="background:#FFFFFF;padding:24px;font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;border:1px solid #F1F3F5;border-radius:12px;">' +
    '<h1 style="color:#0D2B4E;font-size:22px;margin:0 0 4px 0;">🔧 Reporte de Novedad - ' + ot + '</h1>' +
    '<p style="color:#6B7280;font-size:13px;margin:0 0 20px 0;border-bottom:1px solid #F1F3F5;padding-bottom:12px;">Gestión y Control de Flota Barranquilla</p>' +
    '<table style="border-collapse:collapse;width:100%;border-radius:8px;overflow:hidden;">' +
      filas +
    '</table>' +
    '<div style="background:#F1F3F5;border-radius:8px;padding:16px;margin-top:20px;">' +
      '<h3 style="color:#0D2B4E;font-size:15px;margin:0 0 12px 0;letter-spacing:1px;">EVIDENCIAS FOTOGRÁFICAS</h3>' +
      evHtml +
    '</div>' +
    '<p style="color:#9CA3AF;font-size:12px;text-align:center;margin-top:24px;">Mensaje generado automáticamente por el Sistema de Gestión Flota Barranquilla.</p>' +
  '</div>';

  MailApp.sendEmail({
    to: destino,
    cc: cc,
    subject: "🔧 Reporte de Novedad " + ot + " - Placa " + placa + " (" + taller + ")",
    htmlBody: html
  });
}`;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-1 md:px-0">
      {/* HEADER PRINCIPAL */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] rounded-[2rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
              <Mail size={12} className="text-indigo-400" /> Envío Automático por Correo al Taller
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-3">
              <ClipboardList className="text-indigo-400" size={32} />
              Reporte de Novedades
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl font-medium">
              Registra fallas operativas con evidencias fotográficas. Al guardar, se genera automáticamente el consecutivo <span className="text-indigo-300 font-mono font-bold">OT-XXXX</span>, se almacena en la hoja <span className="text-indigo-300 font-mono font-bold">NOVEDADES</span> y se despacha la notificación por correo al taller seleccionado.
            </p>
          </div>

          {/* Estado Formulario */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-700/60 shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              Formulario Activo
            </span>
          </div>
        </div>
      </div>

      {/* PESTAÑA 1: FORMULARIO NUEVO REPORTE */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulario Principal (8 columnas en lg, 1 col en mobile) */}
          <div className="lg:col-span-8 bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Wrench size={20} className="text-indigo-600" /> Formulario de Reporte Operativo
                </h2>
                <p className="text-xs text-slate-500 font-medium">Complete todos los datos de la falla o requerimiento</p>
              </div>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                Estado inicial: ABIERTO
              </span>
            </div>

            <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6">
              {submitSuccess && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-3 animate-in fade-in duration-300">
                  <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-wide">¡Reporte Generado con Éxito!</p>
                    <p className="text-xs">{submitSuccess}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setSubmitSuccess(null)} 
                    className="ml-auto text-emerald-600 hover:text-emerald-800"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {errorMessage && (
                <div className="p-4 bg-rose-50 border-2 border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 animate-in fade-in duration-300">
                  <AlertTriangle size={24} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-wide">Atención</p>
                    <p className="text-xs">{errorMessage}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setErrorMessage(null)} 
                    className="ml-auto text-rose-600 hover:text-rose-800"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Fila 1: OT (automático) y Fecha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Orden de Trabajo */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Hash size={14} className="text-indigo-600" /> Orden de Trabajo (Automático)
                  </label>
                  <div className="w-full px-4 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-mono font-bold text-sm flex items-center justify-between">
                    <span>Se generará automáticamente (OT-XXXX)</span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-sans font-bold">Auto</span>
                  </div>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar size={14} className="text-indigo-600" /> Fecha del Reporte *
                  </label>
                  <input 
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-800 font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Fila 2: Placa con búsqueda/autocompletado */}
              <div className="relative">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Truck size={14} className="text-indigo-600" /> Placa del Vehículo *
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Buscar o escribir placa (ej. SKL625)..."
                    value={plateSearch}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setPlateSearch(val);
                      setPlate(val);
                      setIsPlateDropdownOpen(true);
                      // Si coincide con alguna placa exacta, autocompletar CD y contratista
                      const exact = vehicles.find(v => v.plate.toUpperCase() === val);
                      if (exact) {
                        if (exact.cd) setCd(exact.cd);
                        if (exact.contractor) setContratista(exact.contractor);
                      }
                    }}
                    onFocus={() => setIsPlateDropdownOpen(true)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-900 font-mono font-black text-base uppercase tracking-wider focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm pr-10"
                    required
                  />
                  <div className="absolute right-3 top-3.5 text-slate-400">
                    <Search size={20} />
                  </div>
                </div>

                {/* Dropdown de placas filtradas */}
                {isPlateDropdownOpen && filteredVehicles.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto custom-scrollbar p-1">
                    {filteredVehicles.slice(0, 15).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectPlate(v.plate)}
                        className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-between text-xs"
                      >
                        <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded">
                          {v.plate}
                        </span>
                        <div className="text-right text-[11px] text-slate-500 font-bold">
                          <span>{v.cd || 'CD S/N'}</span> • <span className="text-slate-700">{v.contractor || 'Sin Contratista'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fila 3: CD y Contratista (Autocompletados y editables) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CD */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-600" /> Centro de Distribución (CD)
                  </label>
                  <input 
                    type="text"
                    placeholder="Ej. BARRANQUILLA, GALAPA, SOLEDAD..."
                    value={cd}
                    onChange={(e) => setCd(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-slate-800 font-bold text-sm uppercase focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Contratista */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-600" /> Contratista / Proveedor
                  </label>
                  <input 
                    type="text"
                    placeholder="Ej. TRANSPORTES S.A.S..."
                    value={contratista}
                    onChange={(e) => setContratista(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-slate-800 font-bold text-sm uppercase focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Fila 4: Conductor y Taller Asignado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Conductor */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <User size={14} className="text-indigo-600" /> Nombre del Conductor
                  </label>
                  <input 
                    type="text"
                    placeholder="Nombre y apellido del conductor..."
                    value={conductor}
                    onChange={(e) => setConductor(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-800 font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                  />
                </div>

                {/* Taller */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Wrench size={14} className="text-indigo-600" /> Taller Asignado *
                  </label>
                  <div className="relative">
                    <select 
                      value={taller}
                      onChange={(e) => setTaller(e.target.value)}
                      className="w-full px-4 py-3.5 bg-white border border-indigo-300 rounded-2xl text-indigo-950 font-black text-sm uppercase tracking-wide focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm cursor-pointer appearance-none pr-10"
                      required
                    >
                      {NOVELTY_WORKSHOPS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3.5 top-4 pointer-events-none text-indigo-600">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fila 5: Descripción de la Novedad */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ClipboardList size={14} className="text-indigo-600" /> Descripción Detallada de la Novedad *
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">
                    {novedad.length} caracteres
                  </span>
                </label>
                <textarea 
                  rows={4}
                  placeholder="Detalla la falla mecánica, eléctrica, de carrocería o novedad encontrada..."
                  value={novedad}
                  onChange={(e) => setNovedad(e.target.value)}
                  className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-slate-800 font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm resize-y"
                  required
                />
              </div>

              {/* Fila 6: Evidencias Fotográficas con Soporte Collage (hasta 4 fotos por slot) */}
              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera size={14} className="text-indigo-600" /> Evidencias de Reporte (Fotos / Collages)
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    Hasta 4 fotos por evidencia (Collage automático)
                  </span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Evidencia 1 */}
                  <EvidenceCollageUploader
                    label="Evidencia de Reporte 1"
                    slotNumber={1}
                    photos={evidencia1Photos}
                    collage={evidencia1}
                    onChange={(photos, collage) => {
                      setEvidencia1Photos(photos);
                      setEvidencia1(collage);
                    }}
                    onViewImage={(url, title) => setViewingImage({ url, title })}
                    disabled={isSubmitting}
                  />

                  {/* Evidencia 2 */}
                  <EvidenceCollageUploader
                    label="Evidencia de Reporte 2"
                    slotNumber={2}
                    photos={evidencia2Photos}
                    collage={evidencia2}
                    onChange={(photos, collage) => {
                      setEvidencia2Photos(photos);
                      setEvidencia2(collage);
                    }}
                    onViewImage={(url, title) => setViewingImage({ url, title })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Botón de Envío a ancho completo */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Guardando y Enviando Correo...</span>
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      <span>Enviar Reporte de Novedad</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Panel Lateral: Talleres y Flujo (4 columnas en lg) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Tarjeta de Talleres Autorizados */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Talleres de Mantenimiento</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Red autorizada para atención</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {NOVELTY_WORKSHOPS.map((w) => {
                  const isSelected = taller === w;
                  return (
                    <div 
                      key={w}
                      onClick={() => setTaller(w)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-300 shadow-xs' : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80'}`}
                    >
                      <div className="space-y-0.5">
                        <p className={`text-xs font-black uppercase ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>{w}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Taller Autorizado</p>
                      </div>
                      {isSelected ? (
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-sm">
                          <Check size={14} />
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Elegir</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 italic">
                La notificación automática se despacha de forma interna al taller seleccionado al registrar la novedad.
              </div>
            </div>

            {/* Tarjeta de Resumen Rápido */}
            <div className="bg-slate-900 text-white rounded-[2rem] p-6 space-y-4 shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-white/5 pointer-events-none">
                <ClipboardList size={120} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                <ShieldCheck size={16} /> Flujo de la Novedad
              </h4>
              <ul className="text-xs text-slate-300 space-y-2.5 font-medium">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>El usuario diligencia la novedad y adjunta hasta 2 fotografías.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>El backend asigna el consecutivo consecutivo <b className="text-white">OT-XXXX</b> y guarda la fila en estado <b className="text-amber-400">ABIERTO</b>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <span>Se despacha un correo HTML estructurado al taller con los enlaces de evidencias.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                  <span>Al solucionar el problema, se adjuntan evidencias de cierre y pasa a <b className="text-emerald-400">CERRADO</b>.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE NOVEDADES */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Métricas KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Novedades</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{allReports.length}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ClipboardList size={24} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Novedades Abiertas</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{countAbiertos}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={24} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Novedades Cerradas</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{countCerrados}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar por placa, OT, conductor, novedad, taller..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Taller */}
              <select
                value={filterTaller}
                onChange={(e) => setFilterTaller(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">TODOS LOS TALLERES</option>
                {NOVELTY_WORKSHOPS.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>

              {/* Filtro Estado */}
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">TODOS LOS ESTADOS</option>
                <option value="ABIERTO">ABIERTO</option>
                <option value="CERRADO">CERRADO</option>
              </select>

              {/* Botón Recargar */}
              <button
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Recargar"
              >
                <RefreshCw size={14} className={isLoadingHistory ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              {/* Botón Exportar */}
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Download size={14} />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Tabla / Lista de Registros */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
            {isLoadingHistory ? (
              <div className="p-16 text-center space-y-3">
                <Loader2 size={36} className="animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cargando registros de novedades...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <ClipboardList size={48} className="text-slate-200 mx-auto" />
                <p className="text-sm font-black text-slate-700 uppercase tracking-tight">No se encontraron novedades</p>
                <p className="text-xs text-slate-400">Intenta modificar los filtros o registra un nuevo reporte.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                      <th className="p-4">OT</th>
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Placa</th>
                      <th className="p-4">CD / Contratista</th>
                      <th className="p-4">Taller</th>
                      <th className="p-4">Novedad / Falla</th>
                      <th className="p-4">Evidencias</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredHistory.map((item, idx) => (
                      <tr key={item.ot || `nov-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-lg text-xs">
                            {item.ot || '—'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                          {item.fecha}
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-900 px-2 py-1 rounded text-white font-mono font-black text-xs">
                            {item.plate}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{item.cd || '—'}</div>
                          <div className="text-[10px] text-slate-500">{item.contratista || '—'}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-black text-slate-900 uppercase text-[11px]">
                            {item.taller}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="line-clamp-2 text-slate-700 text-xs font-medium">
                            {item.novedad}
                          </p>
                          {item.conductor && (
                            <span className="text-[10px] text-slate-400 italic block mt-0.5">Cond: {item.conductor}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {item.evidenciaReporte1 && (
                              <button
                                onClick={() => setViewingImage({ url: item.evidenciaReporte1!, title: `${item.ot} - Evidencia 1` })}
                                className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 text-xs font-bold"
                                title="Ver Evidencia 1"
                              >
                                📷 1
                              </button>
                            )}
                            {item.evidenciaReporte2 && (
                              <button
                                onClick={() => setViewingImage({ url: item.evidenciaReporte2!, title: `${item.ot} - Evidencia 2` })}
                                className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 text-xs font-bold"
                                title="Ver Evidencia 2"
                              >
                                📷 2
                              </button>
                            )}
                            {!item.evidenciaReporte1 && !item.evidenciaReporte2 && (
                              <span className="text-[10px] text-slate-400 italic">Sin fotos</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span 
                            className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-xs"
                            style={{
                              backgroundColor: (item.estado || '').toUpperCase() === 'CERRADO' ? '#DCFCE7' : '#FEF3C7',
                              color: (item.estado || '').toUpperCase() === 'CERRADO' ? '#16A34A' : '#D97706',
                              borderColor: (item.estado || '').toUpperCase() === 'CERRADO' ? '#86EFAC' : '#FCD34D',
                              borderWidth: '1px'
                            }}
                          >
                            <span 
                              className="w-1.5 h-1.5 rounded-full" 
                              style={{
                                backgroundColor: (item.estado || '').toUpperCase() === 'CERRADO' ? '#16A34A' : '#F2B705'
                              }}
                            />
                            {(item.estado || 'ABIERTO').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          {(item.estado || '').toUpperCase() === 'ABIERTO' ? (
                            <button
                              onClick={() => {
                                setClosingRecord(item);
                                setCierreEvidencia1('');
                                setCierreEvidencia2('');
                              }}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
                            >
                              Cerrar Novedad
                            </button>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                                <CheckCircle2 size={13} /> Resuelto
                              </span>
                              {(item.evidenciaCierre1 || item.evidenciaCierre2) && (
                                <div className="flex items-center gap-1 mt-1">
                                  {item.evidenciaCierre1 && (
                                    <button
                                      onClick={() => setViewingImage({ url: item.evidenciaCierre1, title: `${item.ot} - Cierre 1` })}
                                      className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-100"
                                      title="Evidencia Cierre 1"
                                    >
                                      Cierre 1
                                    </button>
                                  )}
                                  {item.evidenciaCierre2 && (
                                    <button
                                      onClick={() => setViewingImage({ url: item.evidenciaCierre2, title: `${item.ot} - Cierre 2` })}
                                      className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-100"
                                      title="Evidencia Cierre 2"
                                    >
                                      Cierre 2
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: APPS SCRIPT Y DOCUMENTACIÓN */}
      {activeTab === 'docs' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Info size={22} className="text-indigo-600" /> Código Google Apps Script (Backend)
              </h2>
              <p className="text-xs text-slate-500">
                Pega este bloque en tu archivo <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-mono font-bold">Código.gs</code> del proyecto operativo.
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(appsScriptSnippet);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
            >
              {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
            </button>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto text-slate-200 font-mono text-xs custom-scrollbar">
            <pre className="whitespace-pre">{appsScriptSnippet}</pre>
          </div>
        </div>
      )}

      {/* MODAL: VISOR DE IMAGEN */}
      {viewingImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase">{viewingImage.title}</h3>
              <button 
                onClick={() => setViewingImage(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center bg-slate-950 rounded-2xl overflow-hidden p-2">
              <img 
                src={viewingImage.url} 
                alt={viewingImage.title} 
                className="max-h-[65vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CIERRE DE NOVEDAD */}
      {closingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {closingRecord.ot || 'OT'}
                </span>
                <h3 className="text-base font-black text-slate-900 uppercase mt-1">Cierre de Novedad - {closingRecord.plate}</h3>
              </div>
              <button 
                onClick={() => setClosingRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p><span className="font-bold text-slate-700">Falla Reportada:</span> {closingRecord.novedad}</p>
              <p><span className="font-bold text-slate-700">Taller:</span> {closingRecord.taller}</p>
            </div>

            {closeSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-600" />
                <p className="text-xs font-bold">¡Novedad cerrada y actualizada exitosamente!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-700 uppercase">
                  Adjuntar Evidencias de Solución / Cierre (Hasta 4 fotos por slot)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cierre Evidencia 1 */}
                  <EvidenceCollageUploader
                    label="Evidencia Cierre 1"
                    slotNumber={1}
                    photos={cierre1Photos}
                    collage={cierreEvidencia1}
                    onChange={(photos, collage) => {
                      setCierre1Photos(photos);
                      setCierreEvidencia1(collage);
                    }}
                    onViewImage={(url, title) => setViewingImage({ url, title })}
                    disabled={isClosing}
                  />

                  {/* Cierre Evidencia 2 */}
                  <EvidenceCollageUploader
                    label="Evidencia Cierre 2"
                    slotNumber={2}
                    photos={cierre2Photos}
                    collage={cierreEvidencia2}
                    onChange={(photos, collage) => {
                      setCierre2Photos(photos);
                      setCierreEvidencia2(collage);
                    }}
                    onViewImage={(url, title) => setViewingImage({ url, title })}
                    disabled={isClosing}
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setClosingRecord(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseNoveltySubmit}
                    disabled={isClosing}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {isClosing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>Confirmar Cierre</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
