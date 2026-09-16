import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Calibration, Vehicle } from '../types';
import { compressImage, createMosaic, processImageWithWatermark, normalizeStr, getWeekNumber } from '../utils';
import WhatsAppCameraModal from './WhatsAppCameraModal';
import { 
  X, 
  Camera, 
  CheckCircle, 
  Loader2, 
  Calendar, 
  Disc, 
  Upload, 
  Building2, 
  UserCircle, 
  Wrench, 
  Clock, 
  Trash2, 
  Search, 
  Sparkles,
  ArrowRight,
  Gauge,
  Image as ImageIcon,
  Plus
} from 'lucide-react';

interface TirePosition {
  id: string;
  code: string;
  name: string;
  initialKey: 'p1i' | 'p2i' | 'p3i' | 'p4i' | 'p5i' | 'p6i';
  finalKey: 'p1f' | 'p2f' | 'p3f' | 'p4f' | 'p5f' | 'p6f';
}

const TIRE_POSITIONS: TirePosition[] = [
  { id: '1', code: 'P1', name: 'Delantera Izquierda', initialKey: 'p1i', finalKey: 'p1f' },
  { id: '2', code: 'P2', name: 'Delantera Derecha', initialKey: 'p2i', finalKey: 'p2f' },
  { id: '3', code: 'P3', name: 'Trasera Ext. Izquierda', initialKey: 'p3i', finalKey: 'p3f' },
  { id: '4', code: 'P4', name: 'Trasera Int. Izquierda', initialKey: 'p4i', finalKey: 'p4f' },
  { id: '5', code: 'P5', name: 'Trasera Int. Derecha', initialKey: 'p5i', finalKey: 'p5f' },
  { id: '6', code: 'P6', name: 'Trasera Ext. Derecha', initialKey: 'p6i', finalKey: 'p6f' },
];

interface CalibrationFormProps {
  onClose?: () => void;
  onSubmit: (calibration: any) => Promise<void>;
  vehicles: Vehicle[];
  preSelectedPlate?: string;
  calibrationToUpdate?: Calibration;
  isInline?: boolean;
}

const COMMON_WORKSHOPS = [
  'AUTOMUNDIAL',
  'GARCILLANTAS',
  'OMNIPOTENTE',
  'LLANTERIA PATIÑO',
  'VEHIPESA'
];

const CalibrationForm: React.FC<CalibrationFormProps> = ({ 
  onClose, 
  onSubmit, 
  vehicles, 
  preSelectedPlate, 
  calibrationToUpdate,
  isInline = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUpdateMode = !!calibrationToUpdate;

  // Initial date & calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const initialDate = calibrationToUpdate?.calibrationDate || todayStr;
  const initialDateObj = new Date(initialDate + 'T12:00:00');

  const [formData, setFormData] = useState({
    plate: calibrationToUpdate?.plate || preSelectedPlate || '',
    calibrationDate: initialDate,
    month: initialDateObj.toLocaleString('es-ES', { month: 'long' }).toUpperCase(),
    week: `SEMANA ${getWeekNumber(initialDateObj)}`,
    taller: calibrationToUpdate?.equipment || 'AUTOMUNDIAL',
    customTaller: '',
    cd: '',
    contractor: '',
  });

  const [filterCd, setFilterCd] = useState<string>('all');
  const [plateSearch, setPlateSearch] = useState('');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [showWhatsAppCamera, setShowWhatsAppCamera] = useState(false);

  // Presiones de llantas (P1 a P6: inicial y final en PSI)
  const [presiones, setPresiones] = useState({
    p1i: calibrationToUpdate?.p1i !== undefined ? String(calibrationToUpdate.p1i) : '',
    p1f: calibrationToUpdate?.p1f !== undefined ? String(calibrationToUpdate.p1f) : '',
    p2i: calibrationToUpdate?.p2i !== undefined ? String(calibrationToUpdate.p2i) : '',
    p2f: calibrationToUpdate?.p2f !== undefined ? String(calibrationToUpdate.p2f) : '',
    p3i: calibrationToUpdate?.p3i !== undefined ? String(calibrationToUpdate.p3i) : '',
    p3f: calibrationToUpdate?.p3f !== undefined ? String(calibrationToUpdate.p3f) : '',
    p4i: calibrationToUpdate?.p4i !== undefined ? String(calibrationToUpdate.p4i) : '',
    p4f: calibrationToUpdate?.p4f !== undefined ? String(calibrationToUpdate.p4f) : '',
    p5i: calibrationToUpdate?.p5i !== undefined ? String(calibrationToUpdate.p5i) : '',
    p5f: calibrationToUpdate?.p5f !== undefined ? String(calibrationToUpdate.p5f) : '',
    p6i: calibrationToUpdate?.p6i !== undefined ? String(calibrationToUpdate.p6i) : '',
    p6f: calibrationToUpdate?.p6f !== undefined ? String(calibrationToUpdate.p6f) : '',
  });

  const handlePressureChange = (field: keyof typeof presiones, value: string) => {
    setPresiones(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Autocomplete CD & Contractor when preSelectedPlate or initial plate is provided
  useEffect(() => {
    if (formData.plate) {
      const v = vehicles.find(veh => veh.plate === formData.plate);
      if (v) {
        setFormData(prev => ({
          ...prev,
          cd: prev.cd || v.cd || 'GENERAL',
          contractor: prev.contractor || v.contractor || 'GENERAL'
        }));
      }
    }
  }, [formData.plate, vehicles]);

  // Unique CDs for quick filter
  const uniqueCds = useMemo(() => {
    const list = Array.from(new Set((vehicles || []).map(v => String(v?.cd || 'GENERAL').toUpperCase().trim()))).filter(Boolean);
    return list.sort();
  }, [vehicles]);

  const handlePlateSelect = (selectedPlate: string) => {
    const v = (vehicles || []).find(veh => String(veh?.plate || '').toUpperCase() === selectedPlate.toUpperCase());
    setFormData(prev => ({
      ...prev,
      plate: selectedPlate,
      cd: v?.cd || 'GENERAL',
      contractor: v?.contractor || 'GENERAL'
    }));
  };

  // Filtered vehicles for plate selection - safely guarded against null/undefined
  const filteredVehicles = useMemo(() => {
    let list = (vehicles || []).filter(v => {
      if (!v || !v.plate) return false;
      const vCd = String(v.cd || 'GENERAL').toUpperCase().trim();
      return filterCd === 'all' || normalizeStr(vCd) === normalizeStr(filterCd);
    });

    if (plateSearch) {
      const search = plateSearch.toUpperCase().trim();
      list = list.filter(v => String(v.plate || '').toUpperCase().includes(search));
    }

    return list.sort((a, b) => String(a.plate || '').localeCompare(String(b.plate || '')));
  }, [vehicles, filterCd, plateSearch]);

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    try {
      const dateObj = new Date(newDate + 'T12:00:00');
      if (isNaN(dateObj.getTime())) {
        setFormData(prev => ({ ...prev, calibrationDate: newDate }));
        return;
      }
      const monthName = dateObj.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      const weekNum = getWeekNumber(dateObj);
      const weekStr = isNaN(weekNum) ? 'SEMANA 1' : `SEMANA ${weekNum}`;
      setFormData(prev => ({
        ...prev,
        calibrationDate: newDate,
        month: monthName,
        week: weekStr
      }));
    } catch {
      setFormData(prev => ({ ...prev, calibrationDate: newDate }));
    }
  };

  const getCoords = (): Promise<{ lat: number; lng: number } | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(undefined),
        { timeout: 4000 }
      );
    });
  };

  const openWhatsAppCamera = () => {
    if (!formData.plate) {
      alert("Por favor seleccione primero la placa del vehículo antes de capturar las fotos.");
      return;
    }
    setShowWhatsAppCamera(true);
  };

  const processIncomingFiles = async (files: FileList | File[]) => {
    if (!formData.plate) {
      alert("Por favor seleccione primero la placa del vehículo antes de capturar la evidencia.");
      return;
    }

    setIsProcessingPhoto(true);
    try {
      const coords = await getCoords();

      const fileArray = Array.from(files);
      for (const file of fileArray) {
        if (capturedPhotos.length >= 8) break;
        if (!file.type.startsWith('image/') && !file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) continue;

        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Watermark with plate, date, coords, and compress
          const watermarked = await processImageWithWatermark(base64, formData.plate, coords, formData.calibrationDate);
          setCapturedPhotos(prev => [...prev, watermarked].slice(0, 8));
        } catch (err) {
          console.error("Error al procesar foto:", err);
        }
      }
    } catch (e) {
      console.error("Error global en processIncomingFiles:", e);
    } finally {
      setIsProcessingPhoto(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plate) {
      alert("Por favor seleccione la placa del vehículo.");
      return;
    }

    const workshopName = formData.taller === 'OTRO' ? formData.customTaller.trim() : formData.taller;
    if (!workshopName) {
      alert("Por favor indique el nombre del taller.");
      return;
    }

    if (capturedPhotos.length === 0) {
      alert("Por favor tome o adjunte al menos una foto de evidencia/certificado.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create mosaic if multiple photos or compress single image
      let finalEvidence = "";
      if (capturedPhotos.length > 1) {
        finalEvidence = await createMosaic(
          capturedPhotos, 
          `CALIBRACIÓN: ${formData.plate} - ${formData.calibrationDate}`
        );
      } else {
        finalEvidence = await compressImage(capturedPhotos[0], 1600);
      }

      // Exact data payload expected by Apps Script POST_CALIBRATION
      const payload = {
        month: formData.month,
        calibrationDate: formData.calibrationDate,
        week: formData.week,
        plate: formData.plate,
        taller: workshopName,
        certificateUrl: finalEvidence,
        cd: formData.cd || 'GENERAL',
        contractor: formData.contractor || 'GENERAL',
        ...presiones
      };

      await onSubmit(payload);

      setIsSuccess(true);

      // Reset form after short delay
      setTimeout(() => {
        setIsSuccess(false);
        setCapturedPhotos([]);
        setPlateSearch('');
        setPresiones({
          p1i: '', p1f: '', p2i: '', p2f: '', p3i: '', p3f: '',
          p4i: '', p4f: '', p5i: '', p5f: '', p6i: '', p6f: ''
        });
        const freshToday = new Date().toISOString().split('T')[0];
        const freshDateObj = new Date(freshToday + 'T12:00:00');
        setFormData({
          plate: '',
          calibrationDate: freshToday,
          month: freshDateObj.toLocaleString('es-ES', { month: 'long' }).toUpperCase(),
          week: `SEMANA ${getWeekNumber(freshDateObj)}`,
          taller: 'AUTOMUNDIAL',
          customTaller: '',
          cd: '',
          contractor: '',
        });
        if (onClose && !isInline) {
          onClose();
        }
      }, 1800);
    } catch (err: any) {
      console.error("Error al registrar calibración:", err);
      alert("Ocurrió un error al guardar la calibración: " + (err?.message || "Verifique su conexión"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 overflow-hidden ${isInline ? 'w-full' : 'max-w-xl w-full'}`}>
      {/* Header */}
      <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 bg-indigo-600 rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-600/30">
            <Disc size={22} className="text-white animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
              Registrar Calibración
            </h2>
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
              Control e ingreso de calibración de neumáticos
            </p>
          </div>
        </div>
        {onClose && !isInline && (
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 bg-white/10 hover:bg-red-500 rounded-xl transition-colors text-white"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {isSuccess && (
        <div className="p-4 sm:p-6 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3 animate-in fade-in duration-300">
          <CheckCircle size={28} className="text-emerald-600 shrink-0" />
          <div>
            <h3 className="text-sm font-black text-emerald-900 uppercase">¡Calibración Registrada con Éxito!</h3>
            <p className="text-xs text-emerald-700 font-medium">El registro y evidencia han sido guardados en el sistema.</p>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <form 
        onSubmit={handleSubmit} 
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
        className="p-4 sm:p-6 space-y-4 sm:space-y-5"
      >
        
        {/* 1. FECHA DE CALIBRACIÓN */}
        <div className="space-y-1.5">
          <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} className="text-indigo-600" /> Fecha de Calibración
          </label>
          <input 
            type="date"
            required
            value={formData.calibrationDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all"
          />
          <div className="flex items-center justify-between px-1 text-[9px] font-black uppercase text-slate-400">
            <span>Mes: <strong className="text-indigo-600">{formData.month}</strong></span>
            <span>Semana: <strong className="text-indigo-600">{formData.week}</strong></span>
          </div>
        </div>

        {/* 2. PLACA DEL VEHÍCULO */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Disc size={14} className="text-indigo-600" /> Placa Vehicular
            </label>
            {uniqueCds.length > 1 && (
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-slate-400">CD:</span>
                <select 
                  value={filterCd} 
                  onChange={(e) => {
                    setFilterCd(e.target.value);
                    setFormData(prev => ({ ...prev, plate: '' }));
                  }}
                  className="text-[9px] font-black uppercase bg-slate-100 rounded px-1.5 py-0.5 text-slate-700 outline-none"
                >
                  <option value="all">TODOS</option>
                  {uniqueCds.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Quick search input */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="BUSCAR O FILTRAR PLACA..."
              value={plateSearch}
              onChange={(e) => setPlateSearch(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-black uppercase text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 outline-none mb-1.5"
            />
          </div>

          <select
            required
            value={formData.plate}
            onChange={(e) => handlePlateSelect(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all uppercase"
          >
            <option value="">-- SELECCIONE LA PLACA --</option>
            {filteredVehicles.map(v => (
              <option key={v.id || v.plate} value={v.plate}>
                {v.plate} {v.cd ? `• ${v.cd}` : ''} {v.contractor ? `(${v.contractor})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 3. CD Y CONTRATISTA (Autocompletados o editables) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={13} className="text-indigo-600" /> Centro (C.D.)
            </label>
            <input 
              type="text"
              placeholder="Ej: BARRANQUILLA"
              value={formData.cd}
              onChange={(e) => setFormData(prev => ({ ...prev, cd: e.target.value.toUpperCase() }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold uppercase text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCircle size={13} className="text-indigo-600" /> Contratista / Operador
            </label>
            <input 
              type="text"
              placeholder="Ej: LOGÍSTICA"
              value={formData.contractor}
              onChange={(e) => setFormData(prev => ({ ...prev, contractor: e.target.value.toUpperCase() }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold uppercase text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
            />
          </div>
        </div>

        {/* 4. TALLER / EQUIPO */}
        <div className="space-y-1.5">
          <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Wrench size={14} className="text-indigo-600" /> Taller / Proveedor
          </label>
          <select 
            value={formData.taller}
            onChange={(e) => setFormData(prev => ({ ...prev, taller: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black uppercase text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
          >
            {COMMON_WORKSHOPS.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
            <option value="OTRO">OTRO TALLER (ESPECIFICAR)</option>
          </select>

          {formData.taller === 'OTRO' && (
            <input 
              type="text"
              required
              placeholder="NOMBRE DEL TALLER..."
              value={formData.customTaller}
              onChange={(e) => setFormData(prev => ({ ...prev, customTaller: e.target.value.toUpperCase() }))}
              className="w-full bg-white border-2 border-indigo-500 rounded-xl px-4 py-3 text-sm font-black uppercase text-slate-900 outline-none mt-2"
            />
          )}
        </div>

        {/* 5. PRESIÓN DE LLANTAS (P1 A P6) */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge size={14} className="text-indigo-600" /> Presión de Llantas (PSI)
            </label>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
              6 POSICIONES (P1 - P6)
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200 space-y-2">
            {TIRE_POSITIONS.map((pos) => (
              <div 
                key={pos.id}
                className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 sm:w-44 shrink-0">
                  <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {pos.code}
                  </span>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{pos.code}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">{pos.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 flex-1">
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Inicial (PSI)
                    </label>
                    <input 
                      type="number"
                      step="any"
                      inputMode="decimal"
                      placeholder="Ej: 32.5"
                      value={presiones[pos.initialKey]}
                      onChange={(e) => handlePressureChange(pos.initialKey, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Final (PSI)
                    </label>
                    <input 
                      type="number"
                      step="any"
                      inputMode="decimal"
                      placeholder="Ej: 35.0"
                      value={presiones[pos.finalKey]}
                      onChange={(e) => handlePressureChange(pos.finalKey, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. EVIDENCIA / FOTOS (ESTILO WHATSAPP) */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Camera size={14} className="text-emerald-600" /> Evidencia Fotográfica / Certificado
            </label>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
              {capturedPhotos.length} / 8 FOTOS
            </span>
          </div>

          {/* Action Banner for Photos */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-3 rounded-2xl border border-emerald-200 shadow-xs space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Live Camera Button */}
              <button
                type="button"
                onClick={openWhatsAppCamera}
                disabled={isProcessingPhoto || capturedPhotos.length >= 8}
                className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
                title="Cámara en vivo continua"
              >
                <Camera size={16} /> Cámara Rápida
              </button>

              {/* Native Device Camera Button (100% reliable fallback) */}
              <button
                type="button"
                disabled={isProcessingPhoto || capturedPhotos.length >= 8}
                onClick={() => {
                  if (!formData.plate) {
                    alert("Por favor seleccione primero la placa del vehículo antes de capturar fotos.");
                    return;
                  }
                  cameraInputRef.current?.click();
                }}
                className="py-3 px-3 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/25 transition-all disabled:opacity-50 cursor-pointer"
                title="Tomar con la app de cámara del teléfono"
              >
                <Camera size={16} /> Cámara Teléfono
              </button>

              {/* Gallery file selection button */}
              <button
                type="button"
                disabled={isProcessingPhoto || capturedPhotos.length >= 8}
                onClick={() => {
                  if (!formData.plate) {
                    alert("Por favor seleccione primero la placa del vehículo antes de adjuntar fotos.");
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className="py-3 px-3 bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                title="Seleccionar imágenes del dispositivo"
              >
                <ImageIcon size={16} className="text-indigo-600" /> Galería
              </button>
            </div>

            <p className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-wider">
              Toma fotos con la cámara en vivo, con la cámara de tu teléfono o selecciona de la galería
            </p>
          </div>

          {/* Hidden inputs */}
          <input 
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />
          <input 
            type="file"
            ref={fileInputRef}
            accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handlePhotoCapture}
          />

          {/* Empty State Area */}
          {capturedPhotos.length === 0 && (
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={handleDrop}
              className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all ${
                isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              {isProcessingPhoto ? (
                <div className="flex flex-col items-center gap-2 text-emerald-600">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-xs font-black uppercase">Procesando y optimizando imagen...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Camera size={22} />
                  </div>
                  <p className="text-xs font-black uppercase text-slate-700">Sin fotos adjuntas aún</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    Usa los botones superiores para capturar evidencia o arrastra imágenes aquí
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Photo Previews with Add More Button */}
          {capturedPhotos.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {capturedPhotos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs group">
                    <img src={photo} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 text-white rounded-lg shadow hover:bg-rose-700 transition-colors"
                      title="Eliminar foto"
                    >
                      <Trash2 size={12} />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                      Foto {idx + 1}
                    </span>
                  </div>
                ))}

                {capturedPhotos.length < 8 && (
                  <button
                    type="button"
                    onClick={openWhatsAppCamera}
                    className="aspect-video rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 flex flex-col items-center justify-center gap-1 text-emerald-700 transition-all cursor-pointer"
                  >
                    <Plus size={20} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Tomar Más</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 6. BOTÓN REGISTRAR CALIBRACIÓN A ANCHO COMPLETO */}
        <button 
          type="submit"
          disabled={isSubmitting || isProcessingPhoto || capturedPhotos.length === 0}
          className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Guardando Calibración...</span>
            </>
          ) : (
            <>
              <CheckCircle size={18} />
              <span>Registrar Calibración</span>
            </>
          )}
        </button>

      </form>

      {/* WhatsApp-style full camera modal */}
      {showWhatsAppCamera && (
        <WhatsAppCameraModal
          plate={formData.plate}
          calibrationDate={formData.calibrationDate}
          initialPhotos={capturedPhotos}
          maxPhotos={8}
          onConfirm={(newPhotos) => {
            setCapturedPhotos(newPhotos);
            setShowWhatsAppCamera(false);
          }}
          onClose={() => setShowWhatsAppCamera(false)}
        />
      )}
    </div>
  );

  if (isInline) {
    return formContent;
  }

  // Modal mode
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex justify-center items-start sm:items-center z-[70] p-2 sm:p-4 overflow-y-auto">
      {formContent}
    </div>
  );
};

export default CalibrationForm;
