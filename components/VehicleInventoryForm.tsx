import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Vehicle, VehicleInventoryPayload, InventoryQueueItem } from '../types';
import { 
  enqueueInventory, 
  subscribeToInventoryQueue, 
  retryQueueItem, 
  retryAllFailed 
} from '../services/inventoryQueueService';
import { 
  ClipboardCheck, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  Calendar, 
  User, 
  Truck, 
  Trash2, 
  ImageIcon,
  RefreshCw,
  AlertTriangle,
  Cloud,
  Shield
} from 'lucide-react';
import { procesarFoto } from '../utils';

interface VehicleInventoryFormProps {
  vehicles: Vehicle[];
  onSubmit?: (data: VehicleInventoryPayload) => Promise<boolean | void>;
}

// Opciones exactas de Nombre
export const INSPECTORES_INVENTARIO = [
  'Edwin Correa',
  'Leonardo Rodriguez',
  'David Reales'
] as const;

// Convierte 'YYYY-MM-DD' a 'dd/mm/yyyy'
const formatToDDMMYYYY = (isoDate: string): string => {
  if (!isoDate) return '';
  if (isoDate.includes('/')) return isoDate;
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
};

export const VehicleInventoryForm: React.FC<VehicleInventoryFormProps> = ({
  vehicles = [],
  onSubmit,
}) => {
  // 1. Datos Generales
  const todayStr = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState<string>(todayStr);
  const [plate, setPlate] = useState<string>('');
  const [plateSearch, setPlateSearch] = useState<string>('');
  const [nombre, setNombre] = useState<string>('');

  // 2. 4 Fotos obligatorias del vehículo
  const [fotoFrontal, setFotoFrontal] = useState<string>('');
  const [fotoLateralIzq, setFotoLateralIzq] = useState<string>('');
  const [fotoLateralDer, setFotoLateralDer] = useState<string>('');
  const [fotoTrasera, setFotoTrasera] = useState<string>('');

  // 3. Conteo (aparecen vacíos inicialmente)
  const [carretilla, setCarretilla] = useState<string>('');
  const [conos, setConos] = useState<string>('');

  // 4. Fotos de Estribo (2 obligatorias)
  const [estriboIzq, setEstriboIzq] = useState<string>('');
  const [estriboDer, setEstriboDer] = useState<string>('');

  // 5. Tacos (SI / NO obligatorio y foto)
  const [estadoTacos, setEstadoTacos] = useState<'SI' | 'NO' | ''>('');
  const [fotoTacos, setFotoTacos] = useState<string>('');

  // 6. Fotos de Novedades (hasta 3 opcionales)
  const [novedad1, setNovedad1] = useState<string>('');
  const [novedad2, setNovedad2] = useState<string>('');
  const [novedad3, setNovedad3] = useState<string>('');

  // 7. Observación general (opcional)
  const [observacion, setObservacion] = useState<string>('');

  // Estado del formulario
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [processingField, setProcessingField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados para Overlay de confirmación pantalla completa
  const [showSuccessOverlay, setShowSuccessOverlay] = useState<boolean>(false);
  const [isOverlayFadingOut, setIsOverlayFadingOut] = useState<boolean>(false);
  const [overlayData, setOverlayData] = useState<{ plate: string; nombre: string } | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Estado de la cola local (IndexedDB)
  const [queueItems, setQueueItems] = useState<InventoryQueueItem[]>([]);
  const [isRetryingAll, setIsRetryingAll] = useState<boolean>(false);

  // Indicador de pendientes: delay de 3s para evitar parpadeos si se envía rápido
  const [showPendingBadge, setShowPendingBadge] = useState<boolean>(false);
  const pendingBadgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToInventoryQueue((items) => {
      setQueueItems(items);
    });
    return unsubscribe;
  }, []);

  // Evitar que el indicador "pendientes por enviar" parpadee si el envío tarda menos de 3s
  useEffect(() => {
    const pendingNonFailed = queueItems.filter((item) => (item.retryCount || 0) < 5);

    if (pendingNonFailed.length === 0) {
      if (pendingBadgeTimerRef.current) {
        clearTimeout(pendingBadgeTimerRef.current);
        pendingBadgeTimerRef.current = null;
      }
      setShowPendingBadge(false);
    } else if (!showPendingBadge && !pendingBadgeTimerRef.current) {
      pendingBadgeTimerRef.current = setTimeout(() => {
        setShowPendingBadge(true);
        pendingBadgeTimerRef.current = null;
      }, 3000);
    }
  }, [queueItems, showPendingBadge]);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (pendingBadgeTimerRef.current) clearTimeout(pendingBadgeTimerRef.current);
    };
  }, []);

  const failedItems = useMemo(() => {
    return queueItems.filter((item) => (item.retryCount || 0) >= 5);
  }, [queueItems]);

  const isSyncing = useMemo(() => {
    return queueItems.some((item) => item.status === 'uploading');
  }, [queueItems]);

  // Cierre suave del overlay de pantalla completa
  const closeOverlay = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setIsOverlayFadingOut(true);
    setTimeout(() => {
      setShowSuccessOverlay(false);
      setIsOverlayFadingOut(false);
      setOverlayData(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  // Referencias a inputs de archivo
  const frontalCameraRef = useRef<HTMLInputElement>(null);
  const frontalGalleryRef = useRef<HTMLInputElement>(null);

  const latIzqCameraRef = useRef<HTMLInputElement>(null);
  const latIzqGalleryRef = useRef<HTMLInputElement>(null);

  const latDerCameraRef = useRef<HTMLInputElement>(null);
  const latDerGalleryRef = useRef<HTMLInputElement>(null);

  const traseraCameraRef = useRef<HTMLInputElement>(null);
  const traseraGalleryRef = useRef<HTMLInputElement>(null);

  const estriboIzqCameraRef = useRef<HTMLInputElement>(null);
  const estriboIzqGalleryRef = useRef<HTMLInputElement>(null);

  const estriboDerCameraRef = useRef<HTMLInputElement>(null);
  const estriboDerGalleryRef = useRef<HTMLInputElement>(null);

  const tacosCameraRef = useRef<HTMLInputElement>(null);
  const tacosGalleryRef = useRef<HTMLInputElement>(null);

  const nov1CameraRef = useRef<HTMLInputElement>(null);
  const nov1GalleryRef = useRef<HTMLInputElement>(null);

  const nov2CameraRef = useRef<HTMLInputElement>(null);
  const nov2GalleryRef = useRef<HTMLInputElement>(null);

  const nov3CameraRef = useRef<HTMLInputElement>(null);
  const nov3GalleryRef = useRef<HTMLInputElement>(null);

  // Rastreo de la placa al momento de tomar fotos (para avisar si se cambia después)
  const [photosPlate, setPhotosPlate] = useState<string>('');

  const hasPhotos = Boolean(
    fotoFrontal || fotoLateralIzq || fotoLateralDer || fotoTrasera ||
    estriboIzq || estriboDer || fotoTacos || novedad1 || novedad2 || novedad3
  );

  // Lista filtrada de placas
  const filteredVehicles = useMemo(() => {
    let list = (vehicles || []).filter(v => v && v.plate);
    if (plateSearch) {
      const search = plateSearch.toUpperCase().trim();
      list = list.filter(v => String(v.plate || '').toUpperCase().includes(search));
    }
    return list.sort((a, b) => String(a.plate || '').localeCompare(String(b.plate || '')));
  }, [vehicles, plateSearch]);

  // Manejo de captura / compresión de fotos con marca de agua única
  const handlePhotoSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldKey: string,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingField(fieldKey);
    setErrorMessage(null);
    try {
      const processed = await procesarFoto(file, {
        placa: plate,
        modulo: 'INVENTARIO DIARIO',
        usuario: nombre
      });
      setter(processed);
      if (plate) {
        setPhotosPlate(plate.toUpperCase().trim());
      }
    } catch (err) {
      console.error('Error al procesar foto:', err);
      setErrorMessage('No se pudo procesar la imagen seleccionada. Por favor intenta de nuevo.');
    } finally {
      setProcessingField(null);
      e.target.value = '';
    }
  };

  // Limpiar formulario completo
  const resetForm = () => {
    setPlate('');
    setPlateSearch('');
    setPhotosPlate('');
    setNombre('');
    setFotoFrontal('');
    setFotoLateralIzq('');
    setFotoLateralDer('');
    setFotoTrasera('');
    setCarretilla('');
    setConos('');
    setEstriboIzq('');
    setEstriboDer('');
    setEstadoTacos('');
    setFotoTacos('');
    setNovedad1('');
    setNovedad2('');
    setNovedad3('');
    setObservacion('');
    setErrorMessage(null);
  };

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);

    // 1. Validaciones generales
    if (!fecha) {
      setErrorMessage('Por favor ingresa la fecha del inventario.');
      return;
    }

    if (!plate) {
      setErrorMessage('Por favor selecciona la placa del vehículo.');
      return;
    }

    if (!nombre) {
      setErrorMessage('Por favor selecciona el NOMBRE de quien registra (Edwin Correa, Leonardo Rodriguez o David Reales).');
      return;
    }

    // 2. Validación de 4 fotos obligatorias del vehículo
    const missingPhotos: string[] = [];
    if (!fotoFrontal) missingPhotos.push('Foto Frontal');
    if (!fotoLateralIzq) missingPhotos.push('Foto Lateral Izquierdo');
    if (!fotoLateralDer) missingPhotos.push('Foto Lateral Derecho');
    if (!fotoTrasera) missingPhotos.push('Foto Trasera');

    if (missingPhotos.length > 0) {
      setErrorMessage(`Faltan fotos obligatorias del vehículo: ${missingPhotos.join(', ')}.`);
      return;
    }

    // 3. Validación de conteo (no debe venir vacío, entero >= 0)
    if (carretilla === '' || carretilla === null || isNaN(Number(carretilla))) {
      setErrorMessage('El campo Carretillas es obligatorio. Si no tiene, ingresa 0.');
      return;
    }
    const numCarretilla = Number(carretilla);
    if (!Number.isInteger(numCarretilla) || numCarretilla < 0) {
      setErrorMessage('Carretillas debe ser un número entero mayor o igual a 0.');
      return;
    }

    if (conos === '' || conos === null || isNaN(Number(conos))) {
      setErrorMessage('El campo Conos es obligatorio. Si no tiene, ingresa 0.');
      return;
    }
    const numConos = Number(conos);
    if (!Number.isInteger(numConos) || numConos < 0) {
      setErrorMessage('Conos debe ser un número entero mayor o igual a 0.');
      return;
    }

    // 4. Validación de fotos obligatorias de estribo
    const missingEstribos: string[] = [];
    if (!estriboIzq) missingEstribos.push('Estribo Izquierdo');
    if (!estriboDer) missingEstribos.push('Estribo Derecho');

    if (missingEstribos.length > 0) {
      setErrorMessage(`Faltan fotos obligatorias de estribo: ${missingEstribos.join(', ')}.`);
      return;
    }

    // 5. Validación de Tacos (obligatorio elegir SI / NO)
    if (!estadoTacos) {
      setErrorMessage('Por favor responde a la pregunta de si el vehículo tiene tacos (SI / NO).');
      return;
    }

    // Foto obligatoria si elige SI, opcional si elige NO
    if (estadoTacos === 'SI' && !fotoTacos) {
      setErrorMessage('La foto de los tacos es obligatoria cuando se selecciona que SI tiene tacos.');
      return;
    }

    // Desactivar botón de inmediato para evitar doble envío
    setIsSubmitting(true);

    const cleanPlate = plate.toUpperCase().trim();
    const formattedDate = formatToDDMMYYYY(fecha);
    const inspectorNombre = nombre;

    try {
      // 1. Mostrar de inmediato la PANTALLA COMPLETA de confirmación (sin parpadeo)
      setOverlayData({ plate: cleanPlate, nombre: inspectorNombre });
      setShowSuccessOverlay(true);
      setIsOverlayFadingOut(false);

      // Programar cierre automático a los 4 segundos con fade-out de 300ms
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = setTimeout(() => {
        closeOverlay();
      }, 4000);

      // 2. Guardar en cola local IndexedDB en segundo plano
      enqueueInventory({
        fecha: formattedDate,
        plate: cleanPlate,
        nombre: inspectorNombre,
        fotoFrontal,
        fotoLateralIzq,
        fotoLateralDer,
        fotoTrasera,
        carretilla: numCarretilla,
        conos: numConos,
        estriboIzq,
        estriboDer,
        estadoTacos,
        fotoTacos: fotoTacos || '',
        novedad1: novedad1 || '',
        novedad2: novedad2 || '',
        novedad3: novedad3 || '',
        observacion: observacion.trim(),
        inspector: inspectorNombre,
        carretillas: numCarretilla
      }).catch((err) => {
        console.error('Error al guardar en cola local:', err);
      });

      // 3. Limpiar el formulario POR DETRÁS (sin que el usuario lo vea)
      resetForm();
    } catch (err: any) {
      console.error('Error al procesar registro:', err);
      setErrorMessage(err?.message || 'Error al procesar el inventario. Por favor reintenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Componente de tarjeta de foto
  const renderPhotoSlot = (
    title: string,
    fieldKey: string,
    photoValue: string,
    setter: (val: string) => void,
    cameraRef: React.RefObject<HTMLInputElement | null>,
    galleryRef?: React.RefObject<HTMLInputElement | null>,
    isMandatory: boolean = true
  ) => {
    const isProcessing = processingField === fieldKey;

    return (
      <div 
        id={`photo-slot-${fieldKey}`}
        className={`p-3.5 rounded-2xl border transition-all ${
          photoValue 
            ? 'bg-emerald-50/70 border-emerald-300' 
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
            {photoValue ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <span className={`w-2 h-2 rounded-full ${isMandatory ? 'bg-rose-500' : 'bg-slate-300'}`} />
            )}
            {title}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${
            photoValue 
              ? 'text-emerald-700' 
              : isMandatory 
                ? 'text-rose-600 font-extrabold' 
                : 'text-slate-400'
          }`}>
            {photoValue ? '✓ Cargada' : isMandatory ? 'Obligatoria' : 'Opcional'}
          </span>
        </div>

        {/* Inputs ocultos de archivo */}
        <input 
          type="file"
          ref={cameraRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handlePhotoSelect(e, fieldKey, setter)}
        />
        {galleryRef && (
          <input 
            type="file"
            ref={galleryRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhotoSelect(e, fieldKey, setter)}
          />
        )}

        {photoValue ? (
          /* Vista previa de foto cargada */
          <div className="space-y-2">
            <div className="relative w-full h-44 sm:h-48 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
              <img 
                src={photoValue} 
                alt={title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                1280px • 0.7
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={isProcessing || isSubmitting}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Camera size={14} />
                )}
                <span>Retomar</span>
              </button>

              <button
                type="button"
                onClick={() => setter('')}
                disabled={isProcessing || isSubmitting}
                className="p-2 bg-rose-50 hover:bg-rose-100 active:scale-98 text-rose-600 border border-rose-200 rounded-xl transition-all cursor-pointer"
                title="Eliminar foto"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Botón para abrir la cámara / galería */
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={isProcessing || isSubmitting}
              className={`w-full py-4 px-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 ${
                isMandatory 
                  ? 'border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 text-indigo-700' 
                  : 'border-slate-200 hover:border-slate-400 bg-slate-50/50 text-slate-600'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">Comprimiendo imagen...</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-indigo-600">
                    <Camera size={20} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider">Abrir Cámara</span>
                  <span className="text-[10px] text-slate-400">Cámara trasera optimizada</span>
                </>
              )}
            </button>

            {galleryRef && (
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                disabled={isProcessing || isSubmitting}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ImageIcon size={13} />
                <span>O elegir de la galería</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 1. OVERLAY DE PANTALLA COMPLETA: CONFIRMACIÓN INMEDIATA */}
      {showSuccessOverlay && overlayData && (
        <div 
          className={`fixed inset-0 z-[100] flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-b from-[#0F9D6E] via-[#0d8c62] to-[#096346] text-white transition-opacity duration-300 ease-in-out select-none ${
            isOverlayFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ willChange: 'opacity' }}
        >
          {/* Badge superior sutil */}
          <div className="w-full flex justify-end pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100/70 bg-black/15 px-3 py-1 rounded-full border border-white/10">
              Gestión Flota BQA
            </span>
          </div>

          {/* Bloque central: Ícono grande animado, Título, Placa, Inspector */}
          <div className="flex flex-col items-center justify-center text-center my-auto px-4 max-w-sm mx-auto w-full">
            {/* Ícono animado de check */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center text-white shadow-2xl shadow-emerald-950/40 mb-6">
              <CheckCircle2 className="w-14 h-14 sm:w-16 sm:h-16 text-white stroke-[2.5]" />
            </div>

            {/* Título grande */}
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase">
              ¡REGISTRO EXITOSO!
            </h2>

            {/* PLACA en grande */}
            <div className="mt-4 px-7 py-3 rounded-2xl bg-black/25 border border-white/20 shadow-inner">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-widest font-mono">
                {overlayData.plate}
              </span>
            </div>

            {/* NOMBRE del inspector */}
            <div className="mt-3.5 text-emerald-100 text-sm sm:text-base font-bold flex items-center justify-center gap-2">
              <User size={18} className="text-emerald-300 shrink-0" />
              <span>{overlayData.nombre}</span>
            </div>

            {/* Texto pequeño */}
            <p className="mt-2 text-xs sm:text-sm text-emerald-100/80 font-medium">
              Inventario diario enviado
            </p>
          </div>

          {/* Botón grande abajo: NUEVO REGISTRO */}
          <div className="w-full max-w-sm mx-auto pb-4 sm:pb-6">
            <button
              type="button"
              onClick={closeOverlay}
              className="w-full py-4 px-6 rounded-2xl bg-white text-[#096346] hover:bg-emerald-50 active:scale-[0.98] font-black text-sm sm:text-base uppercase tracking-wider shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ClipboardCheck size={20} className="shrink-0" />
              <span>NUEVO REGISTRO</span>
            </button>
            <p className="text-[11px] text-center text-emerald-200/70 font-medium mt-2.5">
              Se cerrará automáticamente en unos segundos
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Encabezado */}
        <div className="p-5 sm:p-6 bg-[#0f172a] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <ClipboardCheck size={22} className="text-[#0F9D6E]" /> Inventario Diario
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Registro y verificación física del vehículo con soporte fotográfico
            </p>
          </div>

          {/* Indicador de estado de la cola de sincronización */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {failedItems.length > 0 ? (
              <button
                type="button"
                onClick={async () => {
                  setIsRetryingAll(true);
                  try {
                    await retryAllFailed();
                  } finally {
                    setTimeout(() => setIsRetryingAll(false), 800);
                  }
                }}
                disabled={isRetryingAll}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <AlertTriangle size={14} className="text-white shrink-0 animate-pulse" />
                <span>
                  ⚠ {failedItems.length} inventario{failedItems.length > 1 ? 's' : ''} sin enviar – Reintentar
                </span>
                <RefreshCw size={12} className={`shrink-0 ${isRetryingAll ? "animate-spin" : ""}`} />
              </button>
            ) : showPendingBadge && queueItems.length > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold tracking-wide">
                {isSyncing ? (
                  <Loader2 size={14} className="animate-spin text-sky-400 shrink-0" />
                ) : (
                  <span className="text-sky-400 text-sm">☁</span>
                )}
                <span>☁ {queueItems.length} pendiente{queueItems.length > 1 ? 's' : ''} por enviar</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>✓ Todo sincronizado</span>
              </div>
            )}
          </div>
        </div>

        {/* Alerta de registros con fallos persistentes */}
        {failedItems.length > 0 && (
          <div className="p-4 mx-4 sm:mx-6 mt-4 sm:mt-6 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                <h4 className="text-xs font-black uppercase text-rose-900 tracking-wide">
                  Atención: {failedItems.length} registro(s) sin enviar
                </h4>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setIsRetryingAll(true);
                  try {
                    await retryAllFailed();
                  } finally {
                    setTimeout(() => setIsRetryingAll(false), 800);
                  }
                }}
                disabled={isRetryingAll}
                className="text-xs font-black text-rose-700 hover:text-rose-900 underline cursor-pointer"
              >
                Reintentar todos
              </button>
            </div>
            <div className="space-y-2 pt-1">
              {failedItems.map((fi) => (
                <div key={fi.id} className="p-3 bg-white rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-black text-slate-900 mr-2">{fi.plate}</span>
                    <span className="text-slate-500">{fi.fecha} • {fi.nombre} • {fi.retryCount} reintentos</span>
                    {fi.lastError && (
                      <p className="text-[11px] text-rose-600 font-medium mt-0.5">{fi.lastError}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => retryQueueItem(fi.id)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold rounded-lg shrink-0 cursor-pointer text-xs self-start sm:self-auto"
                  >
                    Reintentar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Alerta de Error */}
      {errorMessage && (
        <div className="p-4 mx-4 sm:mx-6 mt-4 sm:mt-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle size={24} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-grow">
            <h3 className="text-xs sm:text-sm font-black text-rose-900 uppercase">Atención</h3>
            <p className="text-xs text-rose-700 font-medium">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Formulario en Columna Única */}
      <form 
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
        className="p-4 sm:p-6 space-y-5 sm:space-y-6"
      >
        {/* SECCIÓN 1: DATOS GENERALES */}
        <div className="space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <Calendar size={16} className="text-indigo-600" /> 1. Datos Generales
          </h3>

          <div className="space-y-3">
            {/* Fecha (formato dd/mm/yyyy al enviar) */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                Fecha del Inventario <span className="text-rose-500">*</span>
              </label>
              <input 
                type="date"
                required
                id="input-inventario-fecha"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all"
              />
            </div>

            {/* Placa con buscador */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Truck size={14} className="text-indigo-600" /> Placa del Vehículo <span className="text-rose-500">*</span>
              </label>

              {/* Filtro rápido */}
              <div className="relative mb-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  id="input-inventario-buscar-placa"
                  placeholder="FILTRAR PLACA..."
                  value={plateSearch}
                  onChange={(e) => setPlateSearch(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-black uppercase text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 outline-none"
                />
              </div>

              <select
                required
                id="select-inventario-placa"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all uppercase cursor-pointer"
              >
                <option value="">-- SELECCIONE LA PLACA --</option>
                {filteredVehicles.map((v) => (
                  <option key={v.id || v.plate} value={v.plate}>
                    {v.plate} {v.cd ? `• ${v.cd}` : ''} {v.contractor ? `(${v.contractor})` : ''}
                  </option>
                ))}
              </select>

              {/* Aviso si el usuario cambia la placa después de tomar fotos */}
              {hasPhotos && photosPlate && plate && plate.toUpperCase().trim() !== photosPlate.toUpperCase().trim() && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2.5 text-amber-900 text-xs font-bold mt-2 animate-pulse">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>Cambiaste la placa: vuelve a tomar las fotos para que la marca sea correcta.</span>
                </div>
              )}
            </div>

            {/* NOMBRE: selector con solo las 3 opciones exactas */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-indigo-600" /> Nombre del Responsable <span className="text-rose-500">*</span>
              </label>
              <select
                required
                id="select-inventario-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all cursor-pointer"
              >
                <option value="">-- SELECCIONE EL NOMBRE --</option>
                {INSPECTORES_INVENTARIO.map((insp) => (
                  <option key={insp} value={insp}>
                    {insp}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: 4 FOTOS FIJAS OBLIGATORIAS DEL VEHÍCULO */}
        <div className="space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <Camera size={16} className="text-indigo-600" /> 2. Fotos del Vehículo (4 Obligatorias)
            </h3>
            <span className="text-[10px] font-bold uppercase text-slate-500">
              {[fotoFrontal, fotoLateralIzq, fotoLateralDer, fotoTrasera].filter(Boolean).length} de 4
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderPhotoSlot('Foto Frontal', 'fotoFrontal', fotoFrontal, setFotoFrontal, frontalCameraRef, frontalGalleryRef, true)}
            {renderPhotoSlot('Foto Lateral Izq.', 'fotoLateralIzq', fotoLateralIzq, setFotoLateralIzq, latIzqCameraRef, latIzqGalleryRef, true)}
            {renderPhotoSlot('Foto Lateral Der.', 'fotoLateralDer', fotoLateralDer, setFotoLateralDer, latDerCameraRef, latDerGalleryRef, true)}
            {renderPhotoSlot('Foto Trasera', 'fotoTrasera', fotoTrasera, setFotoTrasera, traseraCameraRef, traseraGalleryRef, true)}
          </div>
        </div>

        {/* SECCIÓN 3: CONTEO DE ELEMENTOS (VACÍOS POR DEFECTO, OBLIGATORIOS) */}
        <div className="space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <Truck size={16} className="text-indigo-600" /> 3. Conteo de Elementos (Obligatorio)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Carretillas */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                <span>Carretillas <span className="text-rose-500">*</span></span>
                <span className="text-[10px] font-bold text-slate-400">Entero (mín. 0)</span>
              </label>
              <input 
                type="number"
                min="0"
                step="1"
                required
                inputMode="numeric"
                id="input-inventario-carretillas"
                placeholder="Ingresa cantidad..."
                value={carretilla}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setCarretilla(val);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base font-black text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all text-center"
              />
            </div>

            {/* Conos */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                <span>Conos <span className="text-rose-500">*</span></span>
                <span className="text-[10px] font-bold text-slate-400">Entero (mín. 0)</span>
              </label>
              <input 
                type="number"
                min="0"
                step="1"
                required
                inputMode="numeric"
                id="input-inventario-conos"
                placeholder="Ingresa cantidad..."
                value={conos}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setConos(val);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base font-black text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all text-center"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: FOTOS DE ESTRIBO (2 OBLIGATORIAS, DESPUÉS DE CARRETILLAS Y CONOS) */}
        <div className="space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <Camera size={16} className="text-indigo-600" /> 4. Fotos de Estribo (2 Obligatorias)
            </h3>
            <span className="text-[10px] font-bold uppercase text-slate-500">
              {[estriboIzq, estriboDer].filter(Boolean).length} de 2
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderPhotoSlot('Estribo Izquierdo', 'estriboIzq', estriboIzq, setEstriboIzq, estriboIzqCameraRef, estriboIzqGalleryRef, true)}
            {renderPhotoSlot('Estribo Derecho', 'estriboDer', estriboDer, setEstriboDer, estriboDerCameraRef, estriboDerGalleryRef, true)}
          </div>
        </div>

        {/* SECCIÓN 5: TACOS (DESPUÉS DE ESTRIBOS Y ANTES DE FOTOS DE NOVEDAD) */}
        <div className="space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <Shield size={16} className="text-indigo-600" /> 5. Tacos <span className="text-rose-500">*</span>
            </h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              estadoTacos === 'SI' 
                ? 'text-[#0F9D6E]' 
                : estadoTacos === 'NO' 
                  ? 'text-rose-600' 
                  : 'text-slate-400'
            }`}>
              {estadoTacos ? `Seleccionado: ${estadoTacos}` : 'Obligatorio'}
            </span>
          </div>

          {/* Pregunta: ¿Tiene tacos? con dos botones grandes SI / NO */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
              <span>¿Tiene tacos? <span className="text-rose-500">*</span></span>
              <span className="text-[10px] font-bold text-slate-400">Obligatorio elegir uno</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-tacos-si"
                onClick={() => setEstadoTacos('SI')}
                className={`py-4 px-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-98 ${
                  estadoTacos === 'SI'
                    ? 'bg-[#0F9D6E] text-white border-2 border-[#0F9D6E] shadow-lg shadow-[#0F9D6E]/30 scale-[1.01]'
                    : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>SI</span>
              </button>
              <button
                type="button"
                id="btn-tacos-no"
                onClick={() => setEstadoTacos('NO')}
                className={`py-4 px-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-98 ${
                  estadoTacos === 'NO'
                    ? 'bg-rose-600 text-white border-2 border-rose-600 shadow-lg shadow-rose-600/30 scale-[1.01]'
                    : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>NO</span>
              </button>
            </div>
          </div>

          {/* Campo de foto: Foto de los tacos (obligatoria si elige SI, opcional si elige NO) */}
          <div className="pt-1">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Foto de los tacos:
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                estadoTacos === 'SI' ? 'text-rose-600 font-extrabold' : 'text-slate-400'
              }`}>
                {estadoTacos === 'SI' ? 'Obligatoria (eligió SI)' : estadoTacos === 'NO' ? 'Opcional (eligió NO)' : 'Obligatoria si elige SI'}
              </span>
            </div>
            {renderPhotoSlot(
              'Foto de los tacos',
              'fotoTacos',
              fotoTacos,
              setFotoTacos,
              tacosCameraRef,
              tacosGalleryRef,
              estadoTacos === 'SI'
            )}
          </div>
        </div>

        {/* SECCIÓN 6: FOTOS DE NOVEDAD (3 OPCIONALES) */}
        <div className="space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" /> 6. Fotos de Novedades (Hasta 3 Opcionales)
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Opcional</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {renderPhotoSlot('Novedad 1', 'novedad1', novedad1, setNovedad1, nov1CameraRef, nov1GalleryRef, false)}
            {renderPhotoSlot('Novedad 2', 'novedad2', novedad2, setNovedad2, nov2CameraRef, nov2GalleryRef, false)}
            {renderPhotoSlot('Novedad 3', 'novedad3', novedad3, setNovedad3, nov3CameraRef, nov3GalleryRef, false)}
          </div>
        </div>

        {/* SECCIÓN 7: OBSERVACIÓN GENERAL (OPCIONAL) */}
        <div className="space-y-2 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <label className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <span>7. Observación</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Opcional</span>
          </label>
          <textarea 
            rows={2}
            id="textarea-inventario-observacion"
            placeholder="COMENTARIOS U OBSERVACIONES ADICIONALES (OPCIONAL)..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value.toUpperCase())}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all uppercase resize-none"
          />
        </div>

        {/* BOTÓN REGISTRAR INVENTARIO */}
        <div className="pt-2">
          <button
            type="submit"
            id="btn-guardar-inventario"
            disabled={isSubmitting || processingField !== null}
            className="w-full py-4 px-6 bg-[#0F9D6E] hover:bg-[#0c855d] active:scale-98 text-white rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg shadow-[#0F9D6E]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Registrando...
              </>
            ) : processingField ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Comprimiendo Foto...
              </>
            ) : (
              <>
                <ClipboardCheck size={20} /> Registrar Inventario
              </>
            )}
          </button>
          <p className="text-[10px] text-center text-slate-400 font-bold uppercase mt-2">
            Guardado inmediato con sincronización en segundo plano a Google Sheets
          </p>
        </div>
      </form>
    </div>
    </>
  );
};

export default VehicleInventoryForm;
