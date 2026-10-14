import React, { useMemo } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

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
  // Fecha actual en español (ej. "Miércoles, 14 de octubre de 2026")
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

  // Filtrado reactivo según búsqueda en cabecera
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
    <div className="w-full max-w-[480px] mx-auto space-y-4">
      {/* Encabezado: "GESTIÓN FLOTA BQA", descripción y fecha abajo en texto pequeño */}
      <div className="pb-3 border-b border-slate-800">
        <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
          GESTIÓN FLOTA BQA
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Módulos operativos de la flota
        </p>
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 font-medium mt-2">
          <Calendar size={13} className="text-[#0F9D6E] shrink-0" />
          <span className="capitalize">{todayFormatted}</span>
        </div>
      </div>

      {/* Lista vertical de módulos: una columna en todas las pantallas, max 480px, centrada */}
      {filteredModules.length === 0 ? (
        <div className="p-6 text-center rounded-[14px] bg-[#131d36] border border-slate-800 text-slate-400">
          <p className="text-xs font-bold text-slate-300">No se encontraron módulos coincidentes</p>
          <p className="text-[11px] mt-0.5">Verifica el término en la barra de búsqueda</p>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {filteredModules.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectModule(item.id)}
                className="group w-full h-[72px] min-h-[72px] px-3.5 flex items-center justify-between rounded-[14px] bg-[#131d36] border border-slate-800 hover:border-[#0F9D6E] hover:bg-[#18233f] active:border-[#0F9D6E] active:bg-[#1a2644] active:scale-[0.99] transition-all duration-150 text-left cursor-pointer touch-manipulation select-none"
              >
                {/* Ícono en cuadro 44x44 */}
                <div className="w-[44px] h-[44px] min-w-[44px] rounded-[10px] bg-slate-800/80 text-[#0F9D6E] group-hover:bg-[#0F9D6E]/15 group-active:bg-[#0F9D6E]/20 flex items-center justify-center shrink-0 transition-colors">
                  <IconComponent size={22} />
                </div>

                {/* Nombre del módulo en negrita + descripción corta debajo (1 línea con '...') */}
                <div className="flex-1 min-w-0 px-3">
                  <p className="text-sm font-bold text-white uppercase tracking-wide truncate group-hover:text-[#0F9D6E] transition-colors leading-tight">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-400 font-normal truncate mt-0.5 leading-normal">
                    {item.description}
                  </p>
                </div>

                {/* Flecha › a la derecha */}
                <ChevronRight
                  size={18}
                  className="text-slate-500 group-hover:text-[#0F9D6E] group-active:text-[#0F9D6E] shrink-0 transition-colors"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GestionHomeCards;
