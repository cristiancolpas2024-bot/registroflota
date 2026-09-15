
import React from 'react';
import { Droplets, CheckCircle2, Clock, Search, Truck } from 'lucide-react';

interface WashStatsProps {
  totalFlota: number;
  lavados: number;
  pendientes: number;
  busqueda: number;
  month: string;
}

const WashStats: React.FC<WashStatsProps> = ({ totalFlota, lavados, pendientes, busqueda, month }) => {
  const percentage = totalFlota > 0 ? Math.round((lavados / totalFlota) * 100) : 0;

  return (
    <div className="bg-[#0f172a] rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 flex flex-col md:flex-row items-center gap-4 sm:gap-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Progress Circle */}
      <div className="flex items-center gap-4 sm:gap-6 pb-3 md:pb-0 md:pr-6 md:border-r border-b md:border-b-0 border-white/10 w-full md:w-auto justify-center md:justify-start">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="48" cy="48" r="38" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
            <circle cx="48" cy="48" r="38" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={238.76} strokeDashoffset={238.76 - (238.76 * percentage) / 100} className="text-cyan-500 transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-black text-white">{percentage}%</span>
          </div>
        </div>
        <div className="space-y-0.5 text-left">
          <p className="text-cyan-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">CUMPLIMIENTO</p>
          <p className="text-white text-xs sm:text-sm font-bold uppercase">{month}</p>
        </div>
      </div>

      {/* Stats Cards: 2 cols on mobile, 4 cols on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full flex-grow">
        <div className="bg-indigo-600/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 shadow-md">
          <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl text-white shrink-0">
            <Truck size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-white/70 text-[7px] sm:text-[8px] font-black uppercase tracking-wider truncate">TOTAL FLOTA</p>
            <p className="text-white text-xl sm:text-2xl font-black leading-tight">{totalFlota}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 border border-white/10">
          <div className="p-2 sm:p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <CheckCircle2 size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-white/50 text-[7px] sm:text-[8px] font-black uppercase tracking-wider truncate">LAVADOS</p>
            <p className="text-white text-xl sm:text-2xl font-black leading-tight">{lavados}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 border border-white/10">
          <div className="p-2 sm:p-2.5 bg-rose-500/20 rounded-xl text-rose-400 shrink-0">
            <Clock size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-white/50 text-[7px] sm:text-[8px] font-black uppercase tracking-wider truncate">PENDIENTES</p>
            <p className="text-white text-xl sm:text-2xl font-black leading-tight">{pendientes}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 border border-white/10">
          <div className="p-2 sm:p-2.5 bg-cyan-500/20 rounded-xl text-cyan-400 shrink-0">
            <Search size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-white/50 text-[7px] sm:text-[8px] font-black uppercase tracking-wider truncate">BÚSQUEDA</p>
            <p className="text-white text-xl sm:text-2xl font-black leading-tight">{busqueda}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WashStats;
