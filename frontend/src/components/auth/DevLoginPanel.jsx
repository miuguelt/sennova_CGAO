import React from 'react';

const DevLoginPanel = ({ onSelect }) => {
  const users = [
    { label: 'Administrador', email: 'admin@sena.edu.co', pass: '123456' },
    { label: 'Investigador (M. Rodríguez)', email: 'm.rodriguez@sena.edu.co', pass: '123456' },
    { label: 'Aprendiz (J. Pérez)', email: 'jperez@soy.sena.edu.co', pass: '123456' }
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 text-center">
        ⚡ Panel de Desarrollo (Autofill)
      </h4>
      <div className="grid grid-cols-1 gap-2">
        {users.map(u => (
          <button
            key={u.email}
            type="button"
            onClick={() => onSelect(u.email, u.pass)}
            className="w-full py-2 px-3 text-left text-xs bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all font-medium text-slate-700 flex justify-between items-center"
          >
            <span>{u.label}</span>
            <span className="text-[10px] text-slate-400 font-mono">{u.email}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DevLoginPanel;
