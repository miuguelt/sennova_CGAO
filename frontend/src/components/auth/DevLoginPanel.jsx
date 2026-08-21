import React from 'react';
import { Shield, Briefcase, GraduationCap, BookOpen } from 'lucide-react';

const DevLoginPanel = ({ onSelect }) => {
  const users = [
    { 
      role: 'Administrador', 
      name: 'Admin Sistema', 
      email: 'admin@sena.edu.co', 
      pass: '123456', 
      icon: Shield,
      badgeColor: 'bg-rose-50 text-rose-900 border-rose-300' 
    },
    { 
      role: 'Investigador', 
      name: 'Dra. Marta Rodríguez', 
      email: 'm.rodriguez@sena.edu.co', 
      pass: '123456', 
      icon: Briefcase,
      badgeColor: 'bg-indigo-50 text-indigo-900 border-indigo-300' 
    },
    { 
      role: 'Instructor', 
      name: 'Mag. Clara López', 
      email: 'c.lopez@sena.edu.co', 
      pass: '123456', 
      icon: BookOpen,
      badgeColor: 'bg-amber-50 text-amber-950 border-amber-300' 
    },
    { 
      role: 'Aprendiz', 
      name: 'Juan David Pérez', 
      email: 'jperez@soy.sena.edu.co', 
      pass: '123456', 
      icon: GraduationCap,
      badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-300' 
    }
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">
          ⚡ Accesos Rápidos de Desarrollo
        </h4>
        <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-black px-2 py-0.5 rounded-full">
          DEV MODE
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {users.map(u => {
          const Icon = u.icon;
          return (
            <button
              key={u.email}
              type="button"
              onClick={() => onSelect(u.email, u.pass)}
              className="w-full py-2.5 px-3 text-left text-xs bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all font-medium text-slate-800 flex items-center justify-between group hover:border-slate-400 shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg border ${u.badgeColor}`}>
                  <Icon size={14} />
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-[11px] truncate leading-tight">
                    {u.name}
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono font-semibold truncate">
                    {u.email}
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${u.badgeColor}`}>
                {u.role}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DevLoginPanel;
