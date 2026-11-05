import React, { useState, useRef } from 'react';
import { 
  ClipboardList, 
  Calendar, 
  User, 
  Building2, 
  Wrench, 
  Camera, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  ChevronDown, 
  Truck, 
  Hash, 
  Send, 
  Loader2, 
  X, 
  Plus, 
  Images, 
  Maximize2, 
  Eye,
  Mail
} from 'lucide-react';
import { Vehicle, NoveltyReport, NoveltyReportPayload } from '../types';
import { submitNoveltyReport } from '../services/sheetService';
import { procesarFoto } from '../utils';

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

const compressSingleImage = (file: File, placa?: string): Promise<string> => {
  return procesarFoto(file, { placa, modulo: 'NOVEDADES' });
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
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
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
  placa?: string;
}

const EvidenceCollageUploader: React.FC<EvidenceCollageUploaderProps> = ({
  label,
  slotNumber,
  photos,
  collage,
  onChange,
  onViewImage,
  disabled = false,
  placa,
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
        filesToProcess.map((f: File) => compressSingleImage(f, placa))
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

// ==========================================
// MÓDULO PRINCIPAL: REPORTE DE NOVEDADES
// ==========================================

interface NoveltyReportModuleProps {
  vehicles?: Vehicle[];
  reports?: NoveltyReport[];
  onRefresh?: () => Promise<NoveltyReport[] | void>;
  initialTab?: string;
}

export default function NoveltyReportModule({ 
  vehicles = [], 
  onRefresh
}: NoveltyReportModuleProps) {
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

  // Image Modal
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);

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

  const handleResetForm = () => {
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
    setSubmitSuccess(null);
    setErrorMessage(null);
  };

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
        setSubmitSuccess(`¡Novedad reportada con éxito! Se guardó en la hoja NOVEDADES y se notificó al taller ${taller}.`);
        handleResetForm();
        setSubmitSuccess(`¡Novedad reportada con éxito! Se guardó en la hoja NOVEDADES y se notificó al taller ${taller}.`);
        if (onRefresh) {
          await onRefresh();
        }
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

  // Filtered vehicles list for search dropdown
  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(plateSearch.toLowerCase()) ||
    (v.cd && v.cd.toLowerCase().includes(plateSearch.toLowerCase())) ||
    (v.contractor && v.contractor.toLowerCase().includes(plateSearch.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-1 md:px-0">
      {/* FORMULARIO PRINCIPAL DE REPORTE OPERATIVO */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
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
              <div className="space-y-2 flex-1">
                <p className="text-xs font-black uppercase tracking-wide">¡Reporte Generado con Éxito!</p>
                <p className="text-xs">{submitSuccess}</p>
                <button
                  type="button"
                  onClick={() => setSubmitSuccess(null)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm inline-flex items-center gap-2 mt-1"
                >
                  <Plus size={14} />
                  <span>Registrar Otra Novedad</span>
                </button>
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
              {taller && CORREO_TALLER[taller] && (
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Mail size={11} className="text-indigo-500 shrink-0" />
                  <span className="truncate">Notificará a: {CORREO_TALLER[taller]}</span>
                </p>
              )}
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
                placa={plate}
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
                placa={plate}
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
    </div>
  );
}
