
import React, { useState, useRef, useMemo } from 'react';
import { Vehicle } from '../types';
import { processImageWithWatermark, compressImage, normalizeStr, normalizePlate, getWeekNumber, createMosaic } from '../utils';
import { X, Droplets, Camera, Save, Plus, Trash2, Loader2, Sparkles, MapPin, Building2, Image as ImageIcon, Calendar } from 'lucide-react';

interface WashFormProps {
  vehicles: Vehicle[];
  onClose?: () => void;
  onSubmit: (data: any) => Promise<void>;
  isInline?: boolean;
}

const WashForm: React.FC<WashFormProps> = ({ vehicles, onClose, onSubmit, isInline = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);

  const [filterCd, setFilterCd] = useState<string>('all');
  const [plateSearch, setPlateSearch] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    plate: '',
    date: new Date().toISOString().split('T')[0],
    workshop: 'VEHIPESA',
    mapUrl: '',
  });

  const availableCds = useMemo(() => {
    const unique = Array.from(new Set(vehicles.map(v => (v.cd || "GENERAL").toUpperCase().trim()).filter(Boolean)));
    return (unique as string[]).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const filteredVehiclesList = useMemo(() => {
    let list = [...vehicles].filter(v => {
      const vCd = (v.cd || "GENERAL").toUpperCase().trim();
      const matchCd = filterCd === 'all' || normalizeStr(vCd) === normalizeStr(filterCd);
      return matchCd;
    });

    if (plateSearch) {
      const search = plateSearch.toUpperCase().trim();
      list = list.filter(v => v.plate.includes(search));
    }

    const sorted = list.sort((a, b) => a.plate.localeCompare(b.plate));
    
    // Auto-select if only one result and not already selected
    if (sorted.length === 1 && formData.plate !== sorted[0].plate && plateSearch.length >= 3) {
      setFormData(prev => ({ ...prev, plate: sorted[0].plate }));
    }

    return sorted;
  }, [vehicles, filterCd, plateSearch, formData.plate]);

  const handleCdChange = (val: string) => {
    setFilterCd(val);
    setFormData(prev => ({ ...prev, plate: '' }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!formData.plate) {
      alert("Seleccione la placa antes de añadir evidencia.");
      return;
    }

    const imageExtensions = ['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif'];
    const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => {
      const typeStr = f.type ? f.type.toLowerCase() : '';
      const nameStr = f.name ? f.name.toLowerCase() : '';
      return typeStr.startsWith('image/') || imageExtensions.some(ext => nameStr.endsWith(ext));
    });
    if (files.length === 0) return;

    const remainingSlots = 4 - photos.length;
    if (remainingSlots <= 0) {
      alert("Ya ha alcanzado el límite máximo de 4 fotos.");
      return;
    }

    setIsProcessingPhoto(true);
    const getCoords = (): Promise<{lat: number, lng: number} | undefined> => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(undefined),
          { timeout: 5000 }
        );
      });
    };

    const coords = await getCoords();
    const newPhotos: string[] = [];
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      try {
        const watermarked = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const res = await processImageWithWatermark(reader.result as string, `${formData.plate}`, coords, formData.date);
              resolve(res);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('Error al leer el archivo'));
          reader.readAsDataURL(file);
        });
        newPhotos.push(watermarked);
      } catch (err) {
        console.error("Error processing dropped file:", err);
      }
    }

    if (newPhotos.length > 0) {
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 4));
    }
    setIsProcessingPhoto(false);
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !formData.plate) return;

    const remainingSlots = 4 - photos.length;
    if (remainingSlots <= 0) {
      alert("Ya ha alcanzado el límite máximo de 4 fotos.");
      return;
    }

    setIsProcessingPhoto(true);
    const getCoords = (): Promise<{lat: number, lng: number} | undefined> => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(undefined),
          { timeout: 5000 }
        );
      });
    };

    const coords = await getCoords();
    const newPhotos: string[] = [];
    const filesToProcess = (Array.from(files) as File[]).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      try {
        const watermarked = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const res = await processImageWithWatermark(reader.result as string, `${formData.plate}`, coords, formData.date);
              resolve(res);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('Error al leer el archivo'));
          reader.readAsDataURL(file);
        });
        newPhotos.push(watermarked);
      } catch (err) {
        console.error("Error adding photo:", err);
      }
    }

    if (newPhotos.length > 0) {
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 4));
    }
    
    setIsProcessingPhoto(false);
    if (evidenceInputRef.current) evidenceInputRef.current.value = "";
  };

  const handleMapCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1920);
        setFormData(prev => ({ ...prev, mapUrl: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMapDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMap(true);
  };

  const handleMapDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMap(false);
  };

  const handleMapDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMap(false);

    const files = Array.from(e.dataTransfer.files) as File[];
    const imageExtensions = ['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif'];
    const file = files.find(f => {
      const typeStr = f.type ? f.type.toLowerCase() : '';
      const nameStr = f.name ? f.name.toLowerCase() : '';
      return typeStr.startsWith('image/') || imageExtensions.some(ext => nameStr.endsWith(ext));
    });

    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1920);
        setFormData(prev => ({ ...prev, mapUrl: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || photos.length === 0 || !formData.workshop) {
      alert("Por favor complete todos los campos: Placa, Taller y Evidencia.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const dateObj = new Date(formData.date + "T12:00:00");
      const month = dateObj.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      const week = getWeekNumber(dateObj).toString();

      // Include map in the mosaic if it exists
      const mosaicPhotos = [...photos];
      // if (formData.mapUrl) {
      //   mosaicPhotos.push(formData.mapUrl);
      // }

      const mergedEvidence = await createMosaic(mosaicPhotos, `LAVADO: ${formData.plate} - ${formData.date}`);

      const selectedVehicle = vehicles.find(v => v.plate === formData.plate);

      const payload = {
        ...formData,
        id: `LAV-${Date.now()}`,
        month,
        week,
        evidenceUrl: mergedEvidence,
        cd: selectedVehicle?.cd || 'GENERAL',
        contractor: selectedVehicle?.contractor || 'GENERAL',
      };
      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({
          plate: '',
          date: new Date().toISOString().split('T')[0],
          workshop: 'VEHIPESA',
          mapUrl: '',
        });
        setPhotos([]);
        setPlateSearch('');
        if (onClose && !isInline) onClose();
      }, 1800);
    } catch (error) {
      alert("Error al registrar el lavado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    if (isInline) {
      return (
        <div className="w-full max-w-xl mx-auto bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 flex flex-col items-center text-center border-2 border-cyan-500 shadow-xl animate-in zoom-in duration-300">
          <Sparkles size={48} className="text-cyan-500 mb-3 animate-bounce" />
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">¡LAVADO REGISTRADO!</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Guardado con éxito en el sistema</p>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[95] p-4">
        <div className="bg-white rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center max-w-sm border-2 border-cyan-500 shadow-2xl animate-in zoom-in duration-300">
          <Sparkles size={48} className="text-cyan-500 mb-3 animate-bounce" />
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">¡LAVADO REGISTRADO!</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Guardado con éxito</p>
        </div>
      </div>
    );
  }

  const formElement = (
    <div className={isInline ? "w-full max-w-xl mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 overflow-hidden" : "bg-white rounded-t-[1.75rem] sm:rounded-3xl w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border-t-2 sm:border-2 border-slate-900 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in duration-300"}>
      {/* Sticky Header */}
      <div className="shrink-0 bg-[#0f172a] px-4 py-3.5 sm:px-6 sm:py-4 text-white flex justify-between items-center z-10 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-cyan-500 rounded-xl shadow-md text-white">
            <Droplets size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">Registro de Lavado</h2>
            <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">Control de Higiene</p>
          </div>
        </div>
        {!isInline && onClose && (
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 sm:p-2 bg-white/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-slate-300 active:scale-95"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Form Body */}
      <form 
        onSubmit={handleSubmit} 
        className={`${isInline ? '' : 'overflow-y-auto flex-1'} p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 bg-slate-50/50 pb-8 sm:pb-6`}
        style={!isInline ? { WebkitOverflowScrolling: 'touch' } : undefined}
      >
          {/* Filtro por Centro (C.D.) */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
            <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={13} className="text-cyan-600" /> Filtrar por Centro (C.D.)
            </label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs font-black uppercase text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all" 
              value={filterCd} 
              onChange={(e) => handleCdChange(e.target.value)}
            >
              <option value="all">-- TODOS LOS CENTROS --</option>
              {availableCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
            </select>
          </div>

          {/* Unidad Vehicular (Placa) */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center gap-2">
              <label className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-wider">
                Unidad Vehicular (Placa) *
              </label>
              <input 
                type="text" 
                placeholder="BUSCAR PLACA..." 
                className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase outline-none focus:ring-2 ring-cyan-500/30 w-28 sm:w-36 transition-all"
                value={plateSearch}
                onChange={(e) => setPlateSearch(e.target.value)}
              />
            </div>
            <select 
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all"
              value={formData.plate} 
              onChange={e => setFormData({ ...formData, plate: e.target.value })}
            >
              <option value="">-- {filteredVehiclesList.length === 0 ? 'SIN RESULTADOS' : 'SELECCIONE PLACA'} --</option>
              {filteredVehiclesList.map(v => <option key={v.id} value={v.plate}>{v.plate} - {v.cd || 'GENERAL'}</option>)}
            </select>
          </div>

          {/* Taller / Lugar y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
              <label className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-wider">
                Taller / Lugar *
              </label>
              <input 
                required 
                type="text" 
                placeholder="VEHIPESA" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-black text-slate-800 uppercase outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" 
                value={formData.workshop} 
                onChange={e => setFormData({ ...formData, workshop: e.target.value.toUpperCase() })} 
              />
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
              <label className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} className="text-cyan-600" /> Fecha *
              </label>
              <input 
                required 
                type="date" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" 
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
              />
            </div>
          </div>

          {/* Ubicación (Mapa) */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <label className="text-[9px] sm:text-[10px] font-black text-cyan-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={14} className="text-cyan-600" /> Ubicación (Mapa Opcional)
            </label>
            <div className="flex gap-2 items-center">
              <button 
                type="button" 
                onClick={() => mapInputRef.current?.click()} 
                onDragOver={handleMapDragOver}
                onDragLeave={handleMapDragLeave}
                onDrop={handleMapDrop}
                className={`flex-1 py-2.5 px-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-black uppercase tracking-wider ${isDraggingMap ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : formData.mapUrl ? 'bg-cyan-50 border-cyan-400 text-cyan-700' : 'bg-slate-50 border-slate-300 text-slate-600 hover:border-cyan-400'}`}
              >
                {formData.mapUrl ? (
                  <>
                    <ImageIcon size={18} className="text-cyan-600" />
                    <span>Mapa Capturado ✓</span>
                  </>
                ) : (
                  <>
                    <Camera size={18} className="text-slate-400" />
                    <span>Subir / Tomar Mapa</span>
                  </>
                )}
              </button>
              {formData.mapUrl && (
                <button 
                  type="button" 
                  onClick={() => setFormData(prev => ({ ...prev, mapUrl: '' }))}
                  className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl border border-rose-200 transition-all"
                  title="Quitar mapa"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" ref={mapInputRef} className="hidden" onChange={handleMapCapture} />
          </div>

          {/* Evidencias (Max 4 fotos) */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-black text-cyan-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={14} className="text-cyan-600" /> Evidencia Fotográfica (Max 4) *
              </span>
              <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{photos.length} / 4</span>
            </div>
            
            <div 
              className={`grid grid-cols-2 gap-2.5 transition-all duration-300 relative ${isDragging ? 'bg-cyan-50/80 border-2 border-dashed border-cyan-500 rounded-xl p-2' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {photos.map((p, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
                  <img src={p} className="w-full h-full object-cover" alt={`Evidencia ${idx + 1}`} />
                  <button 
                    type="button" 
                    onClick={() => removePhoto(idx)} 
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-500 text-white rounded-md shadow-md hover:scale-105 active:scale-95 transition-all"
                    title="Eliminar foto"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <button 
                  type="button" 
                  disabled={!formData.plate || isProcessingPhoto} 
                  onClick={() => evidenceInputRef.current?.click()} 
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-cyan-500 hover:text-cyan-600 transition-all disabled:opacity-40"
                >
                  <Plus size={22} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Añadir Foto</span>
                </button>
              )}
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          {/* Botón de Enviar */}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting || isProcessingPhoto || photos.length === 0} 
              className="w-full py-3.5 sm:py-4 bg-[#0f172a] hover:bg-cyan-700 text-white font-black rounded-xl sm:rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2.5 active:scale-98"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR LAVADO'}
            </button>
          </div>
        </form>
    </div>
  );

  if (isInline) {
    return formElement;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[95] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {formElement}
    </div>
  );
};

export default WashForm;
