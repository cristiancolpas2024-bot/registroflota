import React, { useMemo } from 'react';
import { Calendar, ArrowRight, Sparkles } from 'lucide-react';

export interface GestionModuleItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

interface GestionHomeCardsProps {
  modules: GestionModuleItem[];
  onSelectModule: (id: string) => void;
  searchTerm?: string;
}

export const GestionHomeCards: React.FC<GestionHomeCardsProps> = ({
  modules,
  onSelectModule,
  searchTerm = '',
}) => {
  // Today's date formatted nicely in Spanish (e.g., "Miércoles, 14 de octubre de 2026")
  const todayFormatted = useMemo(() => {
    try {
      const now = new Date();
      const str = new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);
      return str.charAt(0).toUpperCase() + str.slice(1);
    } catch {
      return new Date().toLocaleDateString('es-ES');
    }
  }, []);

  // Filter modules if user types in search bar
  const filteredModules = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return modules;
    const term = searchTerm.toLowerCase().trim();
    return modules.filter(
      (m) =>
        m.label.toLowerCase().includes(term) ||
        m.description.toLowerCase().includes(term)
    );
  }, [modules, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#0F9D6E] text-xs font-black uppercase tracking-wider">
            <Sparkles size={14} className="text-[#0F9D6E]" />
            <span>Panel de Gestión</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
            Gestión Flota BQA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Selecciona un módulo operativo para acceder y registrar información
          </p>
        </div>

        {/* Date Display */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#131d36] border border-slate-800 text-slate-300 shadow-sm shrink-0 self-start md:self-auto">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#0F9D6E]">
            <Calendar size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fecha de Hoy</span>
            <span className="text-xs sm:text-sm font-bold text-slate-100">
              {todayFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      {filteredModules.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#131d36] border border-slate-800 text-slate-400 space-y-2">
          <p className="text-base font-bold text-slate-300">No se encontraron módulos coincidentes</p>
          <p className="text-xs">Prueba con otro término de búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {filteredModules.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectModule(item.id)}
                className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl md:rounded-3xl bg-[#131d36]/90 hover:bg-[#182442] border border-slate-800/80 hover:border-[#0F9D6E] shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-[#0F9D6E]/15 hover:-translate-y-1.5 transition-all duration-300 text-left overflow-hidden cursor-pointer active:scale-98"
              >
                {/* Glow corner effect on hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#0F9D6E]/10 rounded-full blur-2xl group-hover:bg-[#0F9D6E]/20 transition-all pointer-events-none -mr-12 -mt-12" />

                <div className="space-y-4 relative z-10 w-full">
                  {/* Top: Icon + Arrow action */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#0F9D6E] flex items-center justify-center group-hover:bg-[#0F9D6E] group-hover:text-white group-hover:border-[#0F9D6E] group-hover:scale-105 transition-all duration-300 shadow-sm">
                      <IconComponent size={24} />
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-[#0F9D6E] group-hover:border-[#0F9D6E] transition-all duration-300">
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                      {item.label}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed group-hover:text-slate-300 transition-colors line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Bottom enter cue */}
                <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 group-hover:text-[#0F9D6E] transition-colors relative z-10 w-full">
                  <span>Abrir módulo</span>
                  <span className="text-sm font-bold group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GestionHomeCards;
