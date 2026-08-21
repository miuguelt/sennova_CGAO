import React, { useState, useEffect } from 'react';
import { 
  DollarSign, PieChart, Plus, Trash2, Edit2, 
  ChevronRight, Save, X, Briefcase, Package, 
  Cpu, Globe, Truck, Wrench, Zap, Loader2,
  TrendingUp, BarChart3, AlertCircle, CheckCircle2
} from 'lucide-react';
import { ProyectosAPI } from '../../api/proyectos';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';

const CATEGORIAS = [
  { value: 'Talento Humano', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'Materiales',      icon: Package,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { value: 'Equipos',         icon: Cpu,       color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { value: 'Software',        icon: Zap,       color: 'text-amber-600', bg: 'bg-amber-50' },
  { value: 'Servicios',       icon: Globe,     color: 'text-rose-600', bg: 'bg-rose-50' },
  { value: 'Viajes',          icon: Truck,     color: 'text-slate-600', bg: 'bg-slate-50' },
  { value: 'Otros',           icon: Wrench,    color: 'text-slate-600', bg: 'bg-slate-50' },
];

const getCatInfo = (cat) => CATEGORIAS.find(c => c.value === cat) || CATEGORIAS[6];

const PresupuestoModule = ({ currentUser, onNotify, initialAction, onActionHandled }) => {
  const [proyectos, setProyectos] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [proyecto, setProyecto] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemIdx, setEditingItemIdx] = useState(null);
  const [itemData, setItemData] = useState({ categoria: 'Talento Humano', item: '', valor: 0, descripcion: '' });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, idx: null });

  useEffect(() => {
    loadProyectos();
  }, []);

  useEffect(() => {
    if (selectedProjectId) loadProyectoDetail();
  }, [selectedProjectId]);

  const loadProyectos = async () => {
    try {
      const data = await ProyectosAPI.list();
      setProyectos(data || []);
      if (data?.length > 0) {
        // If there's an initial project from action
        const initialProjId = initialAction?.data?.proyectoId || data[0].id;
        setSelectedProjectId(initialProjId);
      }
    } catch (err) {
      onNotify?.('Error al cargar proyectos', 'error');
    }
  };

  const loadProyectoDetail = async () => {
    setLoading(true);
    try {
      const data = await ProyectosAPI.get(selectedProjectId);
      setProyecto(data);
      setItems(data.presupuesto_detallado?.items || []);
    } catch (err) {
      onNotify?.('Error al cargar detalle del presupuesto', 'error');
    }
    setLoading(false);
  };

  const handleGenerateTemplate = async () => {
    if (!window.confirm('¿Deseas generar la plantilla base de presupuesto? Esto sobrescribirá cualquier dato actual.')) return;
    
    setLoading(true);
    try {
      await ProyectosAPI.generarPresupuesto(selectedProjectId);
      onNotify?.('Plantilla generada exitosamente', 'success');
      loadProyectoDetail();
    } catch (err) {
      onNotify?.('Error al generar plantilla: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const saveBudget = async (newItems) => {
    setIsSaving(true);
    try {
      const total = newItems.reduce((acc, curr) => acc + Number(curr.valor), 0);
      await ProyectosAPI.update(selectedProjectId, {
        presupuesto_detallado: { items: newItems, total_estimado: total },
        presupuesto_total: total
      });
      onNotify?.('Presupuesto sincronizado correctamente', 'success');
      setItems(newItems);
      // Reload to ensure consistency
      loadProyectoDetail();
    } catch (err) {
      onNotify?.('Error al guardar presupuesto', 'error');
    }
    setIsSaving(false);
  };

  const handleAddItem = () => {
    const newItems = [...items, { ...itemData, valor: Number(itemData.valor) }];
    saveBudget(newItems);
    setShowItemForm(false);
    setItemData({ categoria: 'Talento Humano', item: '', valor: 0, descripcion: '' });
  };

  const handleEditItem = () => {
    const newItems = [...items];
    newItems[editingItemIdx] = { ...itemData, valor: Number(itemData.valor) };
    saveBudget(newItems);
    setShowItemForm(false);
    setEditingItemIdx(null);
    setItemData({ categoria: 'Talento Humano', item: '', valor: 0, descripcion: '' });
  };

  const removeItem = (idx) => {
    setDeleteConfirm({ isOpen: true, idx });
  };

  const confirmRemoveAction = () => {
    const idx = deleteConfirm.idx;
    if (idx === null || idx === undefined) return;
    const newItems = items.filter((_, i) => i !== idx);
    saveBudget(newItems);
    setDeleteConfirm({ isOpen: false, idx: null });
  };

  const openEdit = (idx) => {
    setItemData(items[idx]);
    setEditingItemIdx(idx);
    setShowItemForm(true);
  };

  const totalPresupuesto = items.reduce((acc, curr) => acc + Number(curr.valor), 0);
  
  const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
            <DollarSign size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Presupuesto y Finanzas</h1>
            <p className="text-sm text-slate-500 font-medium">Gestión de recursos y rubros institucionales</p>
          </div>
        </div>
        <div className="flex gap-2">
          {items.length === 0 && !loading && selectedProjectId && (
            <Button onClick={handleGenerateTemplate} variant="outline">
              <Zap size={18} className="mr-2" /> Auto-Generar Rubros
            </Button>
          )}
          <Button 
            onClick={() => { setEditingItemIdx(null); setItemData({ categoria: 'Talento Humano', item: '', valor: 0, descripcion: '' }); setShowItemForm(true); }} 
            variant="sena"
            disabled={!selectedProjectId}
          >
            <Plus size={18} className="mr-2" /> Agregar Rubro
          </Button>
        </div>
      </div>

      {/* ── Project Selector ── */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-4">
        <label className="text-xs font-black text-slate-700 uppercase tracking-widest whitespace-nowrap">Proyecto:</label>
        <select 
          className="flex-1 w-full px-4 py-2.5 bg-white border-0 ring-1 ring-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre_corto || p.nombre}</option>)}
        </select>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Total Estimado</p>
            <p className="text-lg font-black text-emerald-800 tabular-nums">{formatMoney(totalPresupuesto)}</p>
          </div>
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Breakdown Sidebar */}
        <div className="space-y-6">
          <Card className="p-6 border border-slate-200 shadow-sm bg-white">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
              <PieChart size={14} className="text-emerald-600" /> Distribución por Rubro
            </h3>
            <div className="space-y-4">
              {CATEGORIAS.map(cat => {
                const catItems = items.filter(i => i.categoria === cat.value);
                const catTotal = catItems.reduce((acc, curr) => acc + Number(curr.valor), 0);
                const percentage = totalPresupuesto > 0 ? (catTotal / totalPresupuesto) * 100 : 0;
                
                if (catTotal === 0 && items.length > 0) return null;

                return (
                  <div key={cat.value} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${cat.bg} ${cat.color}`}>
                          <cat.icon size={12} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">{cat.value}</span>
                      </div>
                      <span className="text-[11px] font-black text-slate-700 tabular-nums">{formatMoney(catTotal)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${cat.color.replace('text', 'bg')} transition-all duration-1000`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="text-xs text-slate-600 italic text-center py-4 font-medium">Sin datos de distribución</p>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-slate-900 text-white border-0 shadow-xl shadow-slate-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl" />
            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Estado de Ejecución</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-black tabular-nums">0%</span>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 font-black">PLANEACIÓN</Badge>
            </div>
            <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
              El presupuesto se encuentra en fase de formulación técnica. No se registran gastos ejecutados.
            </p>
          </Card>
        </div>

        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 size={40} className="animate-spin text-emerald-600 mx-auto mb-4" />
              <p className="text-slate-500 font-bold italic">Cargando estados financieros...</p>
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item, idx) => {
                const info = getCatInfo(item.categoria);
                return (
                  <Card key={idx} className="p-5 border-0 ring-1 ring-slate-100 hover:ring-emerald-300 transition-all group bg-white flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${info.bg} ${info.color} shadow-sm group-hover:scale-110 transition-transform`}>
                      <info.icon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${info.color}`}>{item.categoria}</span>
                      </div>
                      <h4 className="font-black text-slate-900 truncate">{item.item}</h4>
                      <p className="text-xs text-slate-500 font-medium truncate">{item.descripcion || 'Sin descripción técnica'}</p>
                    </div>
                    <div className="text-right px-4 border-l border-slate-50">
                      <p className="text-lg font-black text-slate-900 tabular-nums">{formatMoney(item.valor)}</p>
                      <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(idx)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => removeItem(idx)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <BarChart3 size={32} />
              </div>
              <h3 className="text-slate-900 font-bold text-lg">Sin Rubros Definidos</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                No se ha registrado el presupuesto detallado para este proyecto. Puedes usar la plantilla automática para empezar.
              </p>
              <Button onClick={handleGenerateTemplate} variant="outline" className="mt-6">
                <Zap size={18} className="mr-2" /> Generar Plantilla SENNOVA
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Item Form Modal (Estandarizado en Pila) ── */}
      <Modal
        isOpen={showItemForm}
        onClose={() => setShowItemForm(false)}
        size="lg"
        variant="emerald"
        icon={DollarSign}
        title={editingItemIdx !== null ? 'Editar Rubro' : 'Nuevo Rubro'}
        subtitle="Configuración y justificación presupuestal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowItemForm(false)} className="w-full sm:w-auto justify-center">Cancelar</Button>
            <Button variant="sena" onClick={editingItemIdx !== null ? handleEditItem : handleAddItem} disabled={isSaving || !itemData.item || !itemData.valor} className="w-full sm:w-auto justify-center">
              {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
              {editingItemIdx !== null ? 'Actualizar Rubro' : 'Agregar al Presupuesto'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Select 
            label="Categoría de Gasto" 
            options={CATEGORIAS.map(c => ({ value: c.value, label: c.value }))}
            value={itemData.categoria}
            onChange={(val) => setItemData({...itemData, categoria: val?.target ? val.target.value : val})}
          />
          <Input 
            label="Nombre del Rubro / Ítem" 
            placeholder="Ej: Reactivos químicos, PC Workstation..." 
            value={itemData.item} 
            onChange={(e) => setItemData({...itemData, item: e.target.value})} 
            required 
          />
          <Input 
            label="Valor Estimado (COP)" 
            type="number"
            placeholder="0" 
            value={itemData.valor} 
            onChange={(e) => setItemData({...itemData, valor: e.target.value})} 
            required 
          />
          <TextArea 
            label="Justificación Técnica" 
            placeholder="Describa la necesidad de este rubro para el proyecto..." 
            value={itemData.descripcion} 
            onChange={(e) => setItemData({...itemData, descripcion: e.target.value})} 
            rows={3} 
          />
        </div>
      </Modal>

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, idx: null })}
        onConfirm={confirmRemoveAction}
        title="¿Eliminar Rubro?"
        description="¿Estás seguro de eliminar este rubro del presupuesto del proyecto? Esta acción no se puede deshacer."
        confirmText="Eliminar Rubro"
        variant="danger"
      />
    </div>
  );
};

export default PresupuestoModule;
