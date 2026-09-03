import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
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
  Filter
} from 'lucide-react';
import { SparePartRecord } from '../types';
import { fetchSparePartsFromSheet, submitSparePartInspection } from '../services/sheetService';

export const SPARE_PARTS_PROVIDERS = ['Renting Colombia', 'Navitrans', 'ALD'];
export const SPARE_PARTS_WORKSHOPS = ['ELECTRONIC', 'COUNTRY TRUCKS', 'VEHIPESA', 'TODOFIBRA'];

const ELECTRONIC_ITEMS = [
  { repuesto: "Cinturones de seguridad", minimo: 4, und: "UND" },
  { repuesto: "Motor de arranque", minimo: 3, und: "UND" },
  { repuesto: "Kit de embrague", minimo: 2, und: "UND" },
  { repuesto: "Alternador", minimo: 2, und: "UND" },
  { repuesto: "Caja de dirección", minimo: 1, und: "UND" },
  { repuesto: "Selector de cambios", minimo: 3, und: "UND" },
  { repuesto: "Espejo auxiliar", minimo: 4, und: "UND" },
  { repuesto: "Espejo principal (Juego izquierdo y derecho)", minimo: 4, und: "JUEGO" },
  { repuesto: "Cocuyos de direccionales", minimo: 6, und: "UND" },
  { repuesto: "Guayas de puerta externa", minimo: 3, und: "UND" },
  { repuesto: "Juego bandas de freno con suncho", minimo: 3, und: "JUEGO" },
  { repuesto: "Tapa combustible", minimo: 4, und: "UND" },
  { repuesto: "Manija elevavidrios", minimo: 6, und: "UND" },
  { repuesto: "Racor de aire", minimo: 6, und: "UND" },
  { repuesto: "Cámara de aire (juego delantera y trasera)", minimo: 3, und: "JUEGO" },
  { repuesto: "Pito principal", minimo: 4, und: "UND" },
  { repuesto: "Alarma de reversa", minimo: 4, und: "UND" },
  { repuesto: "Bombillo farola", minimo: 24, und: "UND" },
  { repuesto: "Bombillo 1 filamento", minimo: 24, und: "UND" },
  { repuesto: "Bombillo 2 filamentos", minimo: 24, und: "UND" },
  { repuesto: "Fusibles (varios amperajes)", minimo: 24, und: "UND" },
  { repuesto: "Stop (juego izquierdo y derecho)", minimo: 3, und: "PAR" },
  { repuesto: "Farolas (juego izquierdo y derecho)", minimo: 3, und: "PAR" },
  { repuesto: "Switch de encendido", minimo: 3, und: "UND" },
  { repuesto: "Buje de muelle (juego delantero y trasero)", minimo: 3, und: "JUEGO" },
  { repuesto: "Juego Plumillas", minimo: 6, und: "PAR" }
];

export const STOCK_POR_TALLER: Record<string, { repuesto: string; minimo: number; und: string }[]> = {
  "ELECTRONIC": ELECTRONIC_ITEMS,
  "COUNTRY TRUCKS": ELECTRONIC_ITEMS,
  "VEHIPESA": [
    { repuesto: "Manija de puerta externa (juego izquierda y derecha)", minimo: 3, und: "JUEGO" },
    { repuesto: "Guayas de puerta externa", minimo: 3, und: "UND" },
    { repuesto: "Manija elevavidrios", minimo: 6, und: "UND" },
    { repuesto: "Chapa cortina", minimo: 6, und: "UND" },
    { repuesto: "Estribos (juego acceso cabina - Izquierdo y Derecho)", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego Plumillas", minimo: 6, und: "PAR" },
    { repuesto: "Juego de rieles (Izquierdo y Derecho)", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego de rodamientos para carrocería", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego de deslizadores para carrocería", minimo: 2, und: "JUEGO" }
  ],
  "TODOFIBRA": [
    { repuesto: "Manija de puerta externa (juego izquierda y derecha)", minimo: 3, und: "JUEGO" },
    { repuesto: "Guayas de puerta externa", minimo: 3, und: "UND" },
    { repuesto: "Manija elevavidrios", minimo: 6, und: "UND" },
    { repuesto: "Chapa cortina", minimo: 6, und: "UND" },
    { repuesto: "Estribos (juego acceso cabina - Izquierdo y Derecho)", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego Plumillas", minimo: 6, und: "PAR" },
    { repuesto: "Juego de rieles (Izquierdo y Derecho)", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego de rodamientos para carrocería", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego de deslizadores para carrocería", minimo: 2, und: "JUEGO" }
  ]
};

interface ItemInputState {
  repuesto: string;
  minimo: number;
  und: string;
  cantidad: string;
}

export const SparePartsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'formulario' | 'historial'>('formulario');

  // Datos Generales Formulario
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [inspector, setInspector] = useState<string>('');
  const [proveedor, setProveedor] = useState<string>('Renting Colombia');
  const [taller, setTaller] = useState<string>('ELECTRONIC');

  // Lista de repuestos a auditar
  const [itemsState, setItemsState] = useState<ItemInputState[]>([]);

  // Evidencia Foto
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de envío y carga
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Historial de repuestos
  const [historyRecords, setHistoryRecords] = useState<SparePartRecord[]>(() => {
    try {
      const cached = localStorage.getItem('cache_spareParts');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorkshop, setFilterWorkshop] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Cargar ítems según taller
  useEffect(() => {
    if (taller && STOCK_POR_TALLER[taller]) {
      const defaultItems = STOCK_POR_TALLER[taller].map(item => ({
        repuesto: item.repuesto,
        minimo: item.minimo,
        und: item.und,
        cantidad: ''
      }));
      setItemsState(defaultItems);
    } else {
      setItemsState([]);
    }
  }, [taller]);

  // Cargar historial al cambiar a la pestaña de historial
  useEffect(() => {
    if (activeTab === 'historial') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    if (historyRecords.length === 0) {
      setIsLoadingHistory(true);
    }
    try {
      const data = await fetchSparePartsFromSheet();
      if (data && data.length > 0) {
        setHistoryRecords(data);
        localStorage.setItem('cache_spareParts', JSON.stringify(data));
      }
    } catch (e) {
      console.error("Error loading spare parts history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleQuantityChange = (index: number, val: string) => {
    setItemsState(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], cantidad: val };
      return updated;
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setEvidencePhoto(compressedBase64);
        }
        setIsProcessingPhoto(false);
      };
      img.onerror = () => setIsProcessingPhoto(false);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => setIsProcessingPhoto(false);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inspector.trim()) {
      alert("Por favor ingrese el nombre del inspector.");
      return;
    }

    if (!taller) {
      alert("Por favor seleccione el taller.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      fecha,
      inspector: inspector.trim().toUpperCase(),
      proveedor,
      taller,
      evidencia: evidencePhoto || "",
      items: itemsState.map(item => ({
        repuesto: item.repuesto,
        cantidad: parseFloat(item.cantidad) || 0,
        minimo: item.minimo,
        und: item.und,
        observacion: ""
      }))
    };

    try {
      await submitSparePartInspection(payload);

      setSuccessMessage(`¡Inspección de ${taller} guardada exitosamente!`);
      setEvidencePhoto(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (STOCK_POR_TALLER[taller]) {
        setItemsState(STOCK_POR_TALLER[taller].map(item => ({
          repuesto: item.repuesto,
          minimo: item.minimo,
          und: item.und,
          cantidad: ''
        })));
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err) {
      console.error("Error al guardar:", err);
      alert("Error al enviar la inspección. Verifique su conexión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToExcel = () => {
    if (historyRecords.length === 0) return;

    const headers = ['Fecha', 'Inspector', 'Proveedor', 'Taller', 'Repuesto', 'Cantidad Encontrada', 'Mínimo Requerido', 'Unidad', 'Estado', 'Observación', 'Evidencia'];
    const rows = historyRecords.map(r => [
      `"${r.fecha || ''}"`,
      `"${r.inspector || ''}"`,
      `"${r.proveedor || ''}"`,
      `"${r.taller || ''}"`,
      `"${r.repuesto || ''}"`,
      r.cantidad,
      r.minimo,
      `"${r.und || ''}"`,
      `"${r.estado || ''}"`,
      `"${(r.observacion || '').replace(/"/g, '""')}"`,
      `"${(r.evidencia || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inspeccion_Repuestos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = historyRecords.filter(r => {
    const matchesSearch = !searchTerm || 
      r.repuesto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.inspector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.taller.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWorkshop = filterWorkshop === 'ALL' || r.taller === filterWorkshop;
    const matchesStatus = filterStatus === 'ALL' || r.estado === filterStatus;

    return matchesSearch && matchesWorkshop && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#0D2B4E] text-[#F2B705] rounded-2xl shadow-md">
            <Package size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Inspección y Control de Repuestos
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              Auditoría de Stock de Seguridad en Talleres Aliados
            </p>
          </div>
        </div>

        {/* PESTAÑAS */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('formulario')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'formulario'
                ? 'bg-[#0D2B4E] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles size={14} />
            <span>Nueva Inspección</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'historial'
                ? 'bg-[#0D2B4E] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History size={14} />
            <span>Historial de Registros</span>
          </button>
        </div>
      </div>

      {/* VISTA 1: FORMULARIO */}
      {activeTab === 'formulario' && (
        <div className="max-w-2xl mx-auto space-y-5">
          {successMessage && (
            <div className="bg-[#16A34A] text-white p-4 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-lg animate-in fade-in duration-300">
              <CheckCircle2 size={22} className="shrink-0" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. DATOS GENERALES */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
              <h2 className="text-xs font-black text-[#0D2B4E] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Sparkles size={15} className="text-[#F2B705]" />
                Datos Generales
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* FECHA */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#0D2B4E]" />
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#0D2B4E] focus:bg-white rounded-xl px-4 py-3 text-base font-semibold text-slate-900 outline-none transition-all min-h-[48px]"
                  />
                </div>

                {/* INSPECTOR */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <User size={14} className="text-[#0D2B4E]" />
                    Inspector *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del inspector"
                    value={inspector}
                    onChange={e => setInspector(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#0D2B4E] focus:bg-white rounded-xl px-4 py-3 text-base font-semibold text-slate-900 placeholder-slate-400 outline-none uppercase transition-all min-h-[48px]"
                  />
                </div>

                {/* PROVEEDOR */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Building2 size={14} className="text-[#0D2B4E]" />
                    Proveedor *
                  </label>
                  <select
                    value={proveedor}
                    onChange={e => setProveedor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#0D2B4E] focus:bg-white rounded-xl px-4 py-3 text-base font-semibold text-slate-900 outline-none transition-all min-h-[48px]"
                  >
                    {SPARE_PARTS_PROVIDERS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* TALLER */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Wrench size={14} className="text-[#0D2B4E]" />
                    Taller *
                  </label>
                  <select
                    value={taller}
                    onChange={e => setTaller(e.target.value)}
                    className="w-full bg-blue-50/60 border-2 border-[#0D2B4E] focus:bg-white rounded-xl px-4 py-3 text-base font-black text-[#0D2B4E] outline-none transition-all min-h-[48px]"
                  >
                    {SPARE_PARTS_WORKSHOPS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. LISTA DE REPUESTOS DEL TALLER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-black text-[#0D2B4E] uppercase tracking-wider">
                  Catálogo de {taller} ({itemsState.length} ítems)
                </h2>
              </div>

              {itemsState.map((item, index) => {
                const qtyNum = parseFloat(item.cantidad);
                const hasValue = item.cantidad !== '' && !isNaN(qtyNum);
                const isAlert = hasValue && qtyNum < item.minimo;
                const isOk = hasValue && qtyNum >= item.minimo;

                return (
                  <div
                    key={index}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3"
                  >
                    <div>
                      <h3 className="text-base font-black text-slate-900 leading-snug">
                        {index + 1}. {item.repuesto}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Mínimo requerido: <strong className="text-slate-800 font-bold">{item.minimo} {item.und}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Cantidad encontrada
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          inputMode="numeric"
                          placeholder="0"
                          value={item.cantidad}
                          onChange={e => handleQuantityChange(index, e.target.value)}
                          className={`w-full bg-slate-50 border-2 rounded-xl px-4 py-3 text-lg font-black outline-none transition-all min-h-[48px] ${
                            isAlert
                              ? 'border-[#DC2626] bg-red-50/50 text-[#DC2626] focus:ring-2 focus:ring-red-200'
                              : isOk
                              ? 'border-[#16A34A] bg-green-50/50 text-[#16A34A] focus:ring-2 focus:ring-green-200'
                              : 'border-slate-300 focus:border-[#0D2B4E] text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="w-28 pt-5">
                        {isAlert && (
                          <div className="bg-[#DC2626] text-white py-3 px-2 rounded-xl text-xs font-black uppercase text-center flex items-center justify-center gap-1 shadow-sm min-h-[48px]">
                            <AlertTriangle size={14} />
                            <span>ALERTA</span>
                          </div>
                        )}
                        {isOk && (
                          <div className="bg-[#16A34A] text-white py-3 px-2 rounded-xl text-xs font-black uppercase text-center flex items-center justify-center gap-1 shadow-sm min-h-[48px]">
                            <Check size={14} />
                            <span>OK</span>
                          </div>
                        )}
                        {!hasValue && (
                          <div className="bg-slate-100 text-slate-400 py-3 px-2 rounded-xl text-[11px] font-bold uppercase text-center flex items-center justify-center min-h-[48px]">
                            Pendiente
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. EVIDENCIA FOTOGRÁFICA */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-3">
              <h2 className="text-xs font-black text-[#0D2B4E] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Camera size={15} className="text-[#0D2B4E]" />
                Evidencia Fotográfica (Opcional)
              </h2>

              {evidencePhoto ? (
                <div className="space-y-3">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-[#0D2B4E] shadow-md">
                    <img src={evidencePhoto} alt="Evidencia" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEvidencePhoto(null)}
                      className="absolute top-2 right-2 p-2 bg-[#DC2626] text-white rounded-xl shadow-lg hover:bg-red-700 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all min-h-[44px]"
                  >
                    Cambiar Foto
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPhoto}
                  className="w-full py-6 bg-slate-50 hover:bg-blue-50/50 border-2 border-dashed border-slate-300 hover:border-[#0D2B4E] text-slate-700 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-2 transition-all min-h-[80px]"
                >
                  <div className="p-3 bg-[#0D2B4E] text-[#F2B705] rounded-2xl shadow-sm">
                    <Camera size={26} />
                  </div>
                  <span>{isProcessingPhoto ? 'Procesando imagen...' : 'Tomar Foto o Cargar Evidencia'}</span>
                  <span className="text-xs text-slate-400 font-normal">Abre la cámara o la galería de tu teléfono</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>

            {/* 4. BOTÓN GUARDAR INSPECCIÓN */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isProcessingPhoto}
                className="w-full bg-[#0D2B4E] hover:bg-[#081b31] active:scale-[0.99] text-white font-black py-4 px-6 rounded-2xl text-base uppercase tracking-wider shadow-xl shadow-[#0D2B4E]/20 flex items-center justify-center gap-2.5 min-h-[56px] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={20} className="animate-spin text-[#F2B705]" />
                    <span>Guardando Inspección...</span>
                  </>
                ) : (
                  <>
                    <Check size={22} className="text-[#F2B705]" />
                    <span>Guardar Inspección</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VISTA 2: HISTORIAL */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-[#0D2B4E]" />
                Registros de Auditorías de Repuestos
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Datos históricos sincronizados desde la hoja REPUESTO
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                title="Recargar"
              >
                <RefreshCw size={14} className={isLoadingHistory ? 'animate-spin' : ''} />
                <span>Actualizar</span>
              </button>
              <button
                type="button"
                onClick={exportToExcel}
                disabled={historyRecords.length === 0}
                className="px-3.5 py-2 bg-[#16A34A] hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download size={14} />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* FILTROS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar repuesto, inspector..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0D2B4E]"
              />
            </div>

            <select
              value={filterWorkshop}
              onChange={e => setFilterWorkshop(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0D2B4E]"
            >
              <option value="ALL">Todos los Talleres</option>
              {SPARE_PARTS_WORKSHOPS.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0D2B4E]"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="OK">Solo OK</option>
              <option value="ALERTA">Solo ALERTA</option>
            </select>
          </div>

          {/* TABLA DE HISTORIAL */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-[#0D2B4E] text-white text-[11px] font-black uppercase tracking-wider shadow-sm z-10">
                  <tr>
                    <th className="py-3 px-3 text-center">Fecha</th>
                    <th className="py-3 px-3">Inspector</th>
                    <th className="py-3 px-3">Proveedor</th>
                    <th className="py-3 px-3">Taller</th>
                    <th className="py-3 px-4">Repuesto</th>
                    <th className="py-3 px-3 text-center">Cantidad</th>
                    <th className="py-3 px-3 text-center">Mínimo</th>
                    <th className="py-3 px-3 text-center">Und</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-center">Evidencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-bold">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#0D2B4E]" />
                        Cargando historial de repuestos...
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-bold">
                        No se encontraron registros de repuestos con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-600 whitespace-nowrap">
                          {row.fecha}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {row.inspector}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-600">
                          {row.proveedor}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-[#0D2B4E] font-black rounded-md text-[10px]">
                            {row.taller}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.repuesto}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-slate-900">
                          {row.cantidad}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-500">
                          {row.minimo}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-500">
                          {row.und}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.estado === 'ALERTA' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-[#DC2626] font-black rounded-lg text-[10px]">
                              <AlertTriangle size={11} /> ALERTA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-[#16A34A] font-black rounded-lg text-[10px]">
                              <Check size={11} /> OK
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.evidencia ? (
                            <a
                              href={row.evidencia}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline font-bold"
                            >
                              Ver Foto
                            </a>
                          ) : (
                            <span className="text-slate-300 font-bold">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SparePartsModule;
