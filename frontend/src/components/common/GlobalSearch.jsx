import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Folder, User, Users, FileText, Command, ArrowRight, Loader2 } from 'lucide-react';
import { DashboardAPI } from '../../api/dashboard';

const TYPE_ICONS = {
  proyecto:     <Folder   size={18} className="text-blue-500" />,
  investigador: <User     size={18} className="text-emerald-600" />,
  grupo:        <Users    size={18} className="text-indigo-500" />,
  producto:     <FileText size={18} className="text-amber-500" />,
};

const HINT_ITEMS = [
  { type: 'proyecto',     label: 'Proyectos',     iconCls: 'bg-blue-50 text-blue-500',    Icon: Folder },
  { type: 'investigador', label: 'Investigadores', iconCls: 'bg-emerald-50 text-emerald-600', Icon: User },
  { type: 'grupo',        label: 'Grupos',         iconCls: 'bg-indigo-50 text-indigo-500', Icon: Users },
];

const GlobalSearch = ({ isOpen, onClose, onNavigate }) => {
  const [query,         setQuery]         = useState('');
  const [results,       setResults]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);

  // Open/close side-effects
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKeydown = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % Math.max(results.length, 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [isOpen, results, selectedIndex]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const id = setTimeout(performSearch, 300);
    return () => clearTimeout(id);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const data = await DashboardAPI.globalSearch(query);
      setResults(data.results || []);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Error searching:', err);
    }
    setLoading(false);
  };

  const handleSelect = (result) => {
    onClose();
    onNavigate?.(result);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-0 sm:pt-[15vh] px-0 sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Búsqueda global"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 sm:backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="w-full h-full sm:h-auto sm:max-w-2xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden animate-scaleIn border-0 sm:border sm:border-slate-200 relative z-10 flex flex-col">

        {/* Search input */}
        <div className="relative flex items-center border-b border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="sm:hidden ml-4 p-2 text-slate-400 hover:text-slate-600 focus-visible:outline-none"
            aria-label="Cerrar búsqueda"
          >
            <X size={20} />
          </button>
          
          <Search
            className="absolute left-14 sm:left-5 text-slate-400 pointer-events-none"
            size={20}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            placeholder="Buscar proyectos, investigadores..."
            className="w-full pl-24 sm:pl-12 pr-14 py-5 sm:py-4 text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline-none bg-transparent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute right-4 flex items-center gap-2">
            {loading ? (
              <Loader2 size={18} className="animate-spin text-emerald-600" aria-label="Buscando..." />
            ) : query ? (
              <button
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              >
                <X size={16} />
              </button>
            ) : (
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-semibold border border-slate-200" aria-hidden="true">
                ESC
              </kbd>
            )}
          </div>
        </div>

        {/* Results / empty states */}
        <div
          id="search-results"
          role="listbox"
          aria-label="Resultados de búsqueda"
          className="flex-grow sm:max-h-[55vh] overflow-y-auto scrollbar-thin pb-safe"
        >
          {results.length > 0 ? (
            <div className="p-2" ref={listRef}>
              <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </p>
              {results.map((result, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(result)}
                    className={[
                      'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left',
                      isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${isSelected ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                      {TYPE_ICONS[result.type] ?? <Search size={18} className="text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                        {result.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                    </div>
                    <ArrowRight
                      size={15}
                      className={`flex-shrink-0 transition-transform ${isSelected ? 'text-emerald-500 translate-x-0.5' : 'text-slate-300'}`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="py-14 text-center text-slate-500">
              <Search size={40} className="mx-auto text-slate-200 mb-3" aria-hidden="true" />
              <p className="font-semibold text-sm">Sin resultados para "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Prueba con términos diferentes</p>
            </div>
          ) : (
            <div className="py-12 px-6 text-center text-slate-400">
              <div className="flex justify-center gap-8 mb-6">
                {HINT_ITEMS.map(({ type, label, iconCls, Icon }) => (
                  <div key={type} className="flex flex-col items-center gap-2">
                    <div className={`p-3 rounded-full ${iconCls}`}>
                      <Icon size={22} aria-hidden="true" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-400">Escribe al menos 2 caracteres para buscar</p>
            </div>
          )}
        </div>

        {/* Footer hint bar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Command size={11} aria-hidden="true" /> K — buscar
            </span>
            <span>↑↓ — navegar</span>
            <span>↵ — abrir</span>
          </div>
          <span className="text-xs text-emerald-700 font-semibold">SENNOVA CGAO</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
