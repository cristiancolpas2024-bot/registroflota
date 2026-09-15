
import React from 'react';
import { WashReport } from '../types';
import { formatDate, getDriveDirectLink } from '../utils';
import { Droplets, Calendar, Hash, MapPin, Eye } from 'lucide-react';

interface WashCardProps {
  report: WashReport;
  onViewDoc: (url: string | string[] | {url: string, label?: string}[], title: string) => void;
}

const WashCard: React.FC<WashCardProps> = ({ report, onViewDoc }) => {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md sm:shadow-lg border border-slate-200 overflow-hidden group hover:shadow-xl transition-all duration-300">
      {/* Header with Plate */}
      <div className="bg-[#0f172a] p-3.5 sm:p-5 flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2 sm:p-2.5 bg-cyan-500/20 rounded-xl text-cyan-400">
            <Droplets size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">{report.plate}</h3>
            <div className="flex items-center gap-1.5 text-cyan-400/70 text-[8px] font-bold uppercase tracking-wider">
              <Hash size={10} />
              <span>WASH-{report.id}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 relative z-10">
          <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${report.status === 'CERRADO' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
            {report.status === 'CERRADO' ? 'LAVADO EXITOSO' : 'PENDIENTE'}
          </span>
          <span className="text-white/50 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">SEM. {report.week}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        {/* Date and Month */}
        <div className="flex items-center justify-between bg-slate-50 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar size={15} className="text-cyan-600 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold uppercase">{formatDate(report.date)}</span>
          </div>
          <span className="px-2.5 py-0.5 bg-white text-slate-500 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider border border-slate-200 shadow-xs">
            {report.month}
          </span>
        </div>

        {/* Visual Support Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Soporte Visual</h4>
            <div className="flex gap-1.5">
              {report.evidenceUrl && (
                <button 
                  onClick={() => onViewDoc(report.evidenceUrl, `Evidencia ${report.plate}`)}
                  className="px-2 py-1 bg-slate-100 hover:bg-cyan-600 hover:text-white text-slate-600 rounded-lg transition-all flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase"
                >
                  <Eye size={12} /> <span>Foto</span>
                </button>
              )}
              {report.mapUrl && (
                <button 
                  onClick={() => onViewDoc(report.mapUrl, `Ubicación ${report.plate}`)}
                  className="px-2 py-1 bg-cyan-50 hover:bg-cyan-600 hover:text-white text-cyan-700 rounded-lg transition-all flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase"
                >
                  <MapPin size={12} /> <span>Mapa</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Sub Grid: Map and Evidence Preview */}
          <div className="grid grid-cols-2 gap-2">
            {/* Map Column */}
            <div 
              onClick={() => report.mapUrl && onViewDoc(report.mapUrl, `Ubicación GPS - ${report.plate}`)}
              className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer relative group/mini shadow-xs"
            >
              {report.mapUrl ? (
                <>
                  <img src={getDriveDirectLink(report.mapUrl)} alt={`Mapa ${report.plate}`} className="w-full h-full object-cover transition-transform duration-300 group-hover/mini:scale-105" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/mini:opacity-100 transition-opacity flex items-center justify-center">
                    <MapPin size={16} className="text-white" />
                  </div>
                  <div className="absolute bottom-1.5 left-1.5">
                    <span className="px-1.5 py-0.5 bg-cyan-600/90 text-white text-[7px] font-black rounded uppercase tracking-wider">MAPA</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                  <MapPin size={16} />
                  <span className="text-[8px] font-bold">Sin mapa</span>
                </div>
              )}
            </div>
            
            {/* Evidence Preview */}
            <div 
              onClick={() => report.evidenceUrl && onViewDoc(report.evidenceUrl, `Evidencia - ${report.plate}`)}
              className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer relative group/mini shadow-xs"
            >
              {report.evidenceUrl ? (
                <>
                  <img src={getDriveDirectLink(report.evidenceUrl)} alt={`Evidencia ${report.plate}`} className="w-full h-full object-cover transition-transform duration-300 group-hover/mini:scale-105" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/mini:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye size={16} className="text-white" />
                  </div>
                  <div className="absolute bottom-1.5 left-1.5">
                    <span className="px-1.5 py-0.5 bg-[#0f172a]/90 text-white text-[7px] font-black rounded uppercase tracking-wider">FOTO</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                  <Droplets size={16} />
                  <span className="text-[8px] font-bold">Sin foto</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workshop Info */}
        {report.workshop && (
          <div className="flex items-center gap-2 text-slate-500 pt-2 border-t border-slate-100 text-[10px]">
            <MapPin size={12} className="text-cyan-600 shrink-0" />
            <span className="font-bold uppercase tracking-wider truncate">{report.workshop}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WashCard;
