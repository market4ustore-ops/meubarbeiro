
import React, { useState, useEffect } from 'react';
import { User, Shield, Activity, AtSign, Key } from 'lucide-react';
import { Modal, Input, Button } from './UI';
import { Barber } from '../types';

interface BarberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (barber: Barber) => void;
  editingBarber?: Barber | null;
  loading?: boolean;
}

export const BarberModal: React.FC<BarberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingBarber,
  loading = false
}) => {
  const [formData, setFormData] = useState<Omit<Barber, 'id'>>({
    name: '',
    username: '',
    password: '',
    role: 'BARBER',
    status: 'OFFLINE',
  });

  useEffect(() => {
    if (editingBarber) {
      const { id, ...rest } = editingBarber;
      setFormData({
        ...rest,
        username: rest.username || '',
        password: rest.password || '',
      });
    } else {
      setFormData({
        name: '',
        username: '',
        password: '',
        role: 'BARBER',
        status: 'OFFLINE',
      });
    }
  }, [editingBarber, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: editingBarber?.id || Math.random().toString(36).substr(2, 9),
      ...formData
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBarber ? "Editar Membro" : "Novo Membro da Equipe"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nome Completo"
          placeholder="Ex: João da Silva"
          icon={<User size={18} />}
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div className={`grid grid-cols-1 ${editingBarber ? 'sm:grid-cols-2' : ''} gap-4`}>
          <Input
            label="Email de Acesso"
            placeholder="joao@gmail.com"
            type="email"
            icon={<AtSign size={18} />}
            value={formData.username}
            onChange={e => setFormData({ ...formData, username: e.target.value })}
            required
          />
          {editingBarber && (
            <Input
              label="Senha de Acesso"
              type="password"
              placeholder="••••••••"
              icon={<Key size={18} />}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Shield size={16} /> Cargo
            </label>
            <select
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as any })}
            >
              <option value="BARBER">Barbeiro</option>
              <option value="OWNER">Dono / Administrador</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Activity size={16} /> Status Inicial
            </label>
            <select
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="OFFLINE">Offline</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <p className="text-xs text-emerald-500 flex items-center gap-2 font-medium">
            <Shield size={14} /> {editingBarber ? 'As alterações serão aplicadas imediatamente.' : 'Um convite será enviado para o email acima para que o profissional crie sua senha.'}
          </p>
        </div>

        <div className="flex gap-3 pt-6 border-t border-slate-800">
          <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" type="submit" loading={loading}>
            {editingBarber ? "Salvar Alterações" : "Enviar Convite"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
