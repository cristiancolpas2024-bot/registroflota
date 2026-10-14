import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';

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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado: "Gestión Flota BQA" y la fecha de hoy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Gestión Flota BQA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            Módulos operativos de la flota
          </p>
        </div>

        {/* Fecha de hoy */}
        <div className="flex items-center gap-2.5 text-slate-300 self-start sm:self-auto py-1.5 px-3 rounded-xl bg-[#131d36] border border-slate-800 text-xs sm:text-sm font-semibold">
          <Calendar size={16} className="text-[#0F9D6E] shrink-0" />
          <span>{todayFormatted}</span>
        </div>
      </div>

      {/* Cuadrícula: 4 columnas en escritorio, 2 en tablet, 1 en celular */}
      {filteredModules.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-[#131d36] border border-slate-800 text-slate-400">
          <p className="text-sm font-bold text-slate-300">No se encontraron módulos coincidentes</p>
          <p className="text-xs mt-1">Verifica el término en la barra de búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredModules.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectModule(item.id)}
                className="group flex flex-col justify-start p-5 rounded-2xl bg-[#131d36] border border-slate-800 hover:border-[#0F9D6E] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30 transition-all duration-200 text-left cursor-pointer"
              >
                {/* Ícono del módulo */}
                <div className="w-11 h-11 rounded-xl bg-slate-800/80 text-[#0F9D6E] group-hover:bg-[#0F9D6E]/15 flex items-center justify-center transition-colors mb-4 shrink-0">
                  <IconComponent size={22} />
                </div>

                {/* Nombre del módulo */}
                <h2 className="text-base font-black text-white uppercase tracking-wide group-hover:text-[#0F9D6E] transition-colors">
                  {item.label}
                </h2>

                {/* Descripción corta de una línea */}
                <p className="text-xs text-slate-400 font-normal leading-relaxed mt-1.5 line-clamp-2">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GestionHomeCards;
