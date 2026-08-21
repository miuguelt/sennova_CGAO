import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { AuthAPI } from '../../api/auth';

const ChangePasswordModal = ({ isOpen, onClose, onNotify }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oldPassword) return setError('Ingresa tu contraseña actual');
    if (newPassword.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres');
    if (newPassword !== confirmPassword) return setError('La confirmación no coincide con la nueva contraseña');
    setLoading(true);
    setError('');
    try {
      await AuthAPI.changePassword(oldPassword, newPassword);
      onNotify?.('Contraseña actualizada correctamente', 'success');
      onClose();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const detail = err?.detail || err?.message;
      setError(typeof detail === 'string' ? detail : 'No se pudo cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      variant="indigo"
      icon={Lock}
      title="Cambiar Contraseña"
      subtitle="Actualiza tu credencial de acceso"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button variant="sena" onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Guardando...</span>
            ) : (
              'Actualizar Contraseña'
            )}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div role="alert" className="px-4 py-3 rounded-2xl text-xs font-bold bg-rose-50 text-rose-900 border border-rose-300 animate-fadeIn">
            {error}
          </div>
        )}
        <Input
          label="Contraseña actual"
          type={showPassword ? 'text' : 'password'}
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Input
          label="Nueva contraseña"
          type={showPassword ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <Input
          label="Confirmar nueva contraseña"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(p => !p)}
          className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1.5"
        >
          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          {showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
        </button>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
