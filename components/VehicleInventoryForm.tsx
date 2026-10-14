import React, { useState, useMemo, useRef } from 'react';
import { Vehicle, VehicleInventoryPayload } from '../types';
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
  AlertTriangle
} from 'lucide-react';

interface VehicleInventoryFormProps {
  vehicles: Vehicle[];
  onSubmit: (data: VehicleInventoryPayload) => Promise<boolean | void>;
}

// Opciones exactas de Nombre
export const INSPECTORES_INVENTARIO = [
  'Edwion Correa',
  'Leonardo Rodriguez',
  'David Reales'
] as const;

// Compresor canvas: máx 1600px, JPEG 0.85
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

  // 5. Fotos de Novedades (hasta 3 opcionales)
  const [novedad1, setNovedad1] = useState<string>('');
  const [novedad2, setNovedad2] = useState<string>('');
  const [novedad3, setNovedad3] = useState<string>('');

  // 6. Observación general (opcional)
  const [observacion, setObservacion] = useState<string>('');

  // Estado del formulario
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [processingField, setProcessingField] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const nov1CameraRef = useRef<HTMLInputElement>(null);
  const nov1GalleryRef = useRef<HTMLInputElement>(null);

  const nov2CameraRef = useRef<HTMLInputElement>(null);
  const nov2GalleryRef = useRef<HTMLInputElement>(null);

  const nov3CameraRef = useRef<HTMLInputElement>(null);
  const nov3GalleryRef = useRef<HTMLInputElement>(null);

  // Lista filtrada de placas
  const filteredVehicles = useMemo(() => {
    let list = (vehicles || []).filter(v => v && v.plate);
    if (plateSearch) {
      const search = plateSearch.toUpperCase().trim();
      list = list.filter(v => String(v.plate || '').toUpperCase().includes(search));
    }
    return list.sort((a, b) => String(a.plate || '').localeCompare(String(b.plate || '')));
  }, [vehicles, plateSearch]);

  // Manejo de captura / compresión de fotos
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

  // Limpiar formulario completo
  const resetForm = () => {
    setPlate('');
    setPlateSearch('');
    setNombre('');
    setFotoFrontal('');
    setFotoLateralIzq('');
    setFotoLateralDer('');
    setFotoTrasera('');
    setCarretilla('');
    setConos('');
    setEstriboIzq('');
    setEstriboDer('');
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
    setSuccessMessage(null);

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
      setErrorMessage('Por favor selecciona el NOMBRE de quien registra (Edwion Correa, Leonardo Rodriguez o David Reales).');
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

    setIsSubmitting(true);

    try {
      const payload: VehicleInventoryPayload = {
        fecha: formatToDDMMYYYY(fecha),
        plate: plate.toUpperCase().trim(),
        nombre,
        fotoFrontal,
        fotoLateralIzq,
        fotoLateralDer,
        fotoTrasera,
        carretilla: numCarretilla,
        conos: numConos,
        estriboIzq,
        estriboDer,
        novedad1: novedad1 || '',
        novedad2: novedad2 || '',
        novedad3: novedad3 || '',
        observacion: observacion.trim(),
        // Compatibilidad adicional
        inspector: nombre,
        carretillas: numCarretilla
      };

      const result = await onSubmit(payload);
      if (result === false) {
        throw new Error('El servidor respondió con error al guardar el inventario diario.');
      }

      setSuccessMessage(`¡Inventario del vehículo ${plate.toUpperCase()} guardado correctamente!`);
      resetForm();

      // Scroll arriba para ver la confirmación
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error al registrar inventario:', err);
      setErrorMessage(err?.message || 'Error al guardar el inventario. Por favor verifique la conexión y reintente.');
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
                1600px • 0.85
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Encabezado */}
      <div className="p-5 sm:p-6 bg-[#0f172a] text-white flex items-center justify-between border-b border-slate-800">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <ClipboardCheck size={22} className="text-[#0F9D6E]" /> Inventario Diario
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Registro y verificación física del vehículo con soporte fotográfico
          </p>
        </div>
      </div>

      {/* Mensaje de Confirmación */}
      {successMessage && (
        <div className="p-4 mx-4 sm:mx-6 mt-4 sm:mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
          <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-grow">
            <h3 className="text-xs sm:text-sm font-black text-emerald-900 uppercase">¡Registro Exitoso!</h3>
            <p className="text-xs text-emerald-700 font-medium">{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer"
          >
            Cerrar
          </button>
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

        {/* SECCIÓN 5: FOTOS DE NOVEDAD (3 OPCIONALES) */}
        <div className="space-y-3.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" /> 5. Fotos de Novedades (Hasta 3 Opcionales)
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Opcional</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {renderPhotoSlot('Novedad 1', 'novedad1', novedad1, setNovedad1, nov1CameraRef, nov1GalleryRef, false)}
            {renderPhotoSlot('Novedad 2', 'novedad2', novedad2, setNovedad2, nov2CameraRef, nov2GalleryRef, false)}
            {renderPhotoSlot('Novedad 3', 'novedad3', novedad3, setNovedad3, nov3CameraRef, nov3GalleryRef, false)}
          </div>
        </div>

        {/* SECCIÓN 6: OBSERVACIÓN GENERAL (OPCIONAL) */}
        <div className="space-y-2 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <label className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <span>6. Observación</span>
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

        {/* BOTÓN GUARDAR INVENTARIO */}
        <div className="pt-2">
          <button
            type="submit"
            id="btn-guardar-inventario"
            disabled={isSubmitting || processingField !== null}
            className="w-full py-4 px-6 bg-[#0F9D6E] hover:bg-[#0c855d] active:scale-98 text-white rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg shadow-[#0F9D6E]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            Se registrará en la pestaña INVENTARIO DIARIO del Google Sheet
          </p>
        </div>
      </form>
    </div>
  );
};

export default VehicleInventoryForm;
