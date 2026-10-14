import React, { useState, useMemo, useRef } from 'react';
import { Vehicle } from '../types';
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
  Plus, 
  Minus, 
  ImageIcon,
  Sparkles,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface VehicleInventoryFormProps {
  vehicles: Vehicle[];
  onSubmit: (data: {
    fecha: string;
    plate: string;
    inspector: string;
    fotoFrontal: string;
    fotoLateralIzq: string;
    fotoLateralDer: string;
    fotoTrasera: string;
    carretillas: number;
    conos: number;
    novedad?: string;
    fotoNovedad1?: string;
    fotoNovedad2?: string;
    fotoNovedad3?: string;
    fotoNovedad4?: string;
    observacion?: string;
  }) => Promise<boolean | void>;
}

// Exact compressor specified by user: max 1600px, JPEG 0.85
const comprimirFoto = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const maxLado = 1600;
      const scale = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(ev.target?.result as string);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = ev.target?.result as string;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const VehicleInventoryForm: React.FC<VehicleInventoryFormProps> = ({
  vehicles = [],
  onSubmit,
}) => {
  // General Data
  const todayStr = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState<string>(todayStr);
  const [plate, setPlate] = useState<string>('');
  const [plateSearch, setPlateSearch] = useState<string>('');
  const [inspector, setInspector] = useState<string>('');

  // 4 Mandatory vehicle photos
  const [fotoFrontal, setFotoFrontal] = useState<string>('');
  const [fotoLateralIzq, setFotoLateralIzq] = useState<string>('');
  const [fotoLateralDer, setFotoLateralDer] = useState<string>('');
  const [fotoTrasera, setFotoTrasera] = useState<string>('');

  // Counts
  const [carretillas, setCarretillas] = useState<number>(0);
  const [conos, setConos] = useState<number>(0);

  // Optional Novelties & up to 4 photos
  const [novedad, setNovedad] = useState<string>('');
  const [fotoNovedad1, setFotoNovedad1] = useState<string>('');
  const [fotoNovedad2, setFotoNovedad2] = useState<string>('');
  const [fotoNovedad3, setFotoNovedad3] = useState<string>('');
  const [fotoNovedad4, setFotoNovedad4] = useState<string>('');

  // General Observation
  const [observacion, setObservacion] = useState<string>('');

  // Form State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [processingField, setProcessingField] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hidden file inputs for direct camera triggers
  const frontalCameraRef = useRef<HTMLInputElement>(null);
  const frontalGalleryRef = useRef<HTMLInputElement>(null);

  const latIzqCameraRef = useRef<HTMLInputElement>(null);
  const latIzqGalleryRef = useRef<HTMLInputElement>(null);

  const latDerCameraRef = useRef<HTMLInputElement>(null);
  const latDerGalleryRef = useRef<HTMLInputElement>(null);

  const traseraCameraRef = useRef<HTMLInputElement>(null);
  const traseraGalleryRef = useRef<HTMLInputElement>(null);

  const nov1CameraRef = useRef<HTMLInputElement>(null);
  const nov2CameraRef = useRef<HTMLInputElement>(null);
  const nov3CameraRef = useRef<HTMLInputElement>(null);
  const nov4CameraRef = useRef<HTMLInputElement>(null);

  // Filtered vehicles for plate selection
  const filteredVehicles = useMemo(() => {
    let list = (vehicles || []).filter(v => v && v.plate);
    if (plateSearch) {
      const search = plateSearch.toUpperCase().trim();
      list = list.filter(v => String(v.plate || '').toUpperCase().includes(search));
    }
    return list.sort((a, b) => String(a.plate || '').localeCompare(String(b.plate || '')));
  }, [vehicles, plateSearch]);

  // Handle Photo Capture / Upload
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
      const compressed = await comprimirFoto(file);
      setter(compressed);
    } catch (err) {
      console.error('Error al comprimir foto:', err);
      setErrorMessage('No se pudo procesar la imagen seleccionada. Por favor intenta de nuevo.');
    } finally {
      setProcessingField(null);
      e.target.value = '';
    }
  };

  // Reset all state to blank
  const resetForm = () => {
    setPlate('');
    setPlateSearch('');
    setInspector('');
    setFotoFrontal('');
    setFotoLateralIzq('');
    setFotoLateralDer('');
    setFotoTrasera('');
    setCarretillas(0);
    setConos(0);
    setNovedad('');
    setFotoNovedad1('');
    setFotoNovedad2('');
    setFotoNovedad3('');
    setFotoNovedad4('');
    setObservacion('');
    setErrorMessage(null);
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Strict validation
    if (!fecha) {
      setErrorMessage('Por favor ingresa la fecha del inventario.');
      return;
    }

    if (!plate) {
      setErrorMessage('Por favor selecciona la placa del vehículo.');
      return;
    }

    if (!inspector.trim()) {
      setErrorMessage('Por favor indica el nombre del inspector.');
      return;
    }

    // 4 mandatory photos check
    const missingPhotos: string[] = [];
    if (!fotoFrontal) missingPhotos.push('Foto Frontal');
    if (!fotoLateralIzq) missingPhotos.push('Foto Lateral Izquierdo');
    if (!fotoLateralDer) missingPhotos.push('Foto Lateral Derecho');
    if (!fotoTrasera) missingPhotos.push('Foto Trasera');

    if (missingPhotos.length > 0) {
      setErrorMessage(`Faltan fotos obligatorias del vehículo: ${missingPhotos.join(', ')}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fecha,
        plate: plate.toUpperCase().trim(),
        inspector: inspector.trim(),
        fotoFrontal,
        fotoLateralIzq,
        fotoLateralDer,
        fotoTrasera,
        carretillas: Number(carretillas || 0),
        conos: Number(conos || 0),
        novedad: novedad.trim(),
        fotoNovedad1,
        fotoNovedad2,
        fotoNovedad3,
        fotoNovedad4,
        observacion: observacion.trim(),
      };

      await onSubmit(payload);
      setSuccessMessage(`¡Inventario del vehículo ${plate.toUpperCase()} guardado correctamente!`);
      resetForm();

      // Scroll to top to see confirmation
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error al registrar inventario:', err);
      setErrorMessage(err?.message || 'Error al guardar el inventario. Por favor verifique la conexión y reintente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Photo Card Sub-component
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
            ? 'bg-emerald-50/70 border-emerald-300 shadow-xs' 
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
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
            photoValue 
              ? 'bg-emerald-100 text-emerald-800' 
              : isMandatory 
                ? 'bg-rose-100 text-rose-700' 
                : 'bg-slate-100 text-slate-500'
          }`}>
            {photoValue ? 'Cargada' : isMandatory ? 'Obligatoria' : 'Opcional'}
          </span>
        </div>

        {/* Hidden File Inputs */}
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
          <div className="space-y-2">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-emerald-300 shadow-inner group">
              <img 
                src={photoValue} 
                alt={title} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="p-2 bg-white text-slate-800 rounded-full hover:bg-slate-100 text-xs font-bold transition-transform active:scale-95"
                  title="Tomar de nuevo"
                >
                  <Camera size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setter('')}
                  className="p-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 text-xs font-bold transition-transform active:scale-95"
                  title="Eliminar foto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-emerald-700 font-bold">✓ Imagen comprimida lista</span>
              <button
                type="button"
                onClick={() => setter('')}
                className="text-rose-600 font-black uppercase hover:underline flex items-center gap-1"
              >
                <Trash2 size={12} /> Quitar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {isProcessing ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-indigo-600 bg-indigo-50/50 rounded-xl border border-indigo-200">
                <Loader2 size={24} className="animate-spin" />
                <span className="text-xs font-bold">Procesando y comprimiendo foto...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id={`btn-camera-${fieldKey}`}
                  onClick={() => cameraRef.current?.click()}
                  className="py-3 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Camera size={16} /> Cámara
                </button>
                <button
                  type="button"
                  id={`btn-gallery-${fieldKey}`}
                  onClick={() => (galleryRef?.current ? galleryRef.current.click() : cameraRef.current?.click())}
                  className="py-3 px-3 bg-white hover:bg-slate-100 active:scale-98 text-slate-700 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <ImageIcon size={16} className="text-slate-500" /> Galería
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
            <Sparkles size={12} /> Gestión Operativa
          </div>
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <ClipboardCheck size={22} className="text-emerald-400" /> Inventario Diario
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            Registro y verificación física del vehículo con soporte fotográfico
          </p>
        </div>
      </div>

      {/* Confirmation / Success Banner */}
      {successMessage && (
        <div className="p-4 mx-4 sm:mx-6 mt-4 sm:mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-grow">
            <h3 className="text-xs sm:text-sm font-black text-emerald-900 uppercase">¡Registro Exitoso!</h3>
            <p className="text-xs text-emerald-700 font-medium">{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 mx-4 sm:mx-6 mt-4 sm:mt-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle size={24} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-grow">
            <h3 className="text-xs sm:text-sm font-black text-rose-900 uppercase">Atención</h3>
            <p className="text-xs text-rose-700 font-medium">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-bold"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Main Single-Column Form */}
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
            {/* Fecha */}
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

              {/* Quick filter box */}
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
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all uppercase"
              >
                <option value="">-- SELECCIONE LA PLACA --</option>
                {filteredVehicles.map((v) => (
                  <option key={v.id || v.plate} value={v.plate}>
                    {v.plate} {v.cd ? `• ${v.cd}` : ''} {v.contractor ? `(${v.contractor})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Inspector */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-indigo-600" /> Inspector que Registra <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                required
                id="input-inventario-inspector"
                placeholder="NOMBRE COMPLETO DEL INSPECTOR"
                value={inspector}
                onChange={(e) => setInspector(e.target.value.toUpperCase())}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all uppercase"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: 4 FOTOS FIJAS OBLIGATORIAS DEL VEHÍCULO */}
        <div className="space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <Camera size={16} className="text-indigo-600" /> 2. Fotos del Vehículo (4 Obligatorias)
            </h3>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {[fotoFrontal, fotoLateralIzq, fotoLateralDer, fotoTrasera].filter(Boolean).length} / 4 Listas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderPhotoSlot('Foto Frontal', 'fotoFrontal', fotoFrontal, setFotoFrontal, frontalCameraRef, frontalGalleryRef, true)}
            {renderPhotoSlot('Foto Lateral Izq.', 'fotoLateralIzq', fotoLateralIzq, setFotoLateralIzq, latIzqCameraRef, latIzqGalleryRef, true)}
            {renderPhotoSlot('Foto Lateral Der.', 'fotoLateralDer', fotoLateralDer, setFotoLateralDer, latDerCameraRef, latDerGalleryRef, true)}
            {renderPhotoSlot('Foto Trasera', 'fotoTrasera', fotoTrasera, setFotoTrasera, traseraCameraRef, traseraGalleryRef, true)}
          </div>
        </div>

        {/* SECCIÓN 3: CONTEO DE ELEMENTOS */}
        <div className="space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <Truck size={16} className="text-indigo-600" /> 3. Conteo de Elementos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Carretillas */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                <span>Carretillas</span>
                <span className="text-[10px] font-bold text-slate-400">Cantidad</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCarretillas(prev => Math.max(0, prev - 1))}
                  className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-base font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Minus size={18} />
                </button>
                <input 
                  type="number"
                  min="0"
                  inputMode="numeric"
                  id="input-inventario-carretillas"
                  value={carretillas}
                  onChange={(e) => setCarretillas(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-grow text-center bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-lg font-black text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCarretillas(prev => prev + 1)}
                  className="w-11 h-11 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center text-base font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Conos */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                <span>Conos de Seguridad</span>
                <span className="text-[10px] font-bold text-slate-400">Cantidad</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConos(prev => Math.max(0, prev - 1))}
                  className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-base font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Minus size={18} />
                </button>
                <input 
                  type="number"
                  min="0"
                  inputMode="numeric"
                  id="input-inventario-conos"
                  value={conos}
                  onChange={(e) => setConos(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-grow text-center bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-lg font-black text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setConos(prev => prev + 1)}
                  className="w-11 h-11 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center text-base font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: NOVEDADES ADICIONALES (OPCIONAL) */}
        <div className="space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" /> 4. Novedades Adicionales (Opcional)
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Si aplica</span>
          </div>

          <div className="space-y-3">
            {/* Nota de Novedad */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider">
                Descripción de la Novedad / Daño
              </label>
              <textarea 
                rows={2}
                id="textarea-inventario-novedad"
                placeholder="DETALLE DE GOLPES, FALTANTES, RAYONES O ANOMALÍAS DETECTADAS..."
                value={novedad}
                onChange={(e) => setNovedad(e.target.value.toUpperCase())}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all uppercase resize-none"
              />
            </div>

            {/* Hasta 4 fotos de novedad */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Fotos de la Novedad (Hasta 4 fotos opcionales)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {renderPhotoSlot('Foto Novedad 1', 'fotoNovedad1', fotoNovedad1, setFotoNovedad1, nov1CameraRef, undefined, false)}
                {renderPhotoSlot('Foto Novedad 2', 'fotoNovedad2', fotoNovedad2, setFotoNovedad2, nov2CameraRef, undefined, false)}
                {renderPhotoSlot('Foto Novedad 3', 'fotoNovedad3', fotoNovedad3, setFotoNovedad3, nov3CameraRef, undefined, false)}
                {renderPhotoSlot('Foto Novedad 4', 'fotoNovedad4', fotoNovedad4, setFotoNovedad4, nov4CameraRef, undefined, false)}
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 5: OBSERVACIÓN GENERAL */}
        <div className="space-y-2 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <label className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <span>5. Observaciones Generales</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Opcional</span>
          </label>
          <textarea 
            rows={2}
            id="textarea-inventario-observacion"
            placeholder="COMENTARIOS U OBSERVACIONES ADICIONALES DEL ESTADO DEL VEHÍCULO..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value.toUpperCase())}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all uppercase resize-none"
          />
        </div>

        {/* BOTÓN GUARDAR INVENTARIO (ANCHO COMPLETO Y DESHABILITADO EN ENVÍO) */}
        <div className="pt-2">
          <button
            type="submit"
            id="btn-guardar-inventario"
            disabled={isSubmitting || processingField !== null}
            className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Guardando Inventario...
              </>
            ) : processingField ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Procesando Imagen...
              </>
            ) : (
              <>
                <ClipboardCheck size={20} /> Guardar Inventario
              </>
            )}
          </button>
          <p className="text-[10px] text-center text-slate-400 font-bold uppercase mt-2">
            Al enviar se guardará en la hoja INVENTARIO DIARIO del sistema
          </p>
        </div>
      </form>
    </div>
  );
};

export default VehicleInventoryForm;
