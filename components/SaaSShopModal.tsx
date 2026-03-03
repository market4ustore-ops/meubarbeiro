
import React, { useState, useEffect } from 'react';
import { Store, User, Mail, Globe, CreditCard, Activity, ShieldCheck, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { Modal, Input, Button } from './UI';
import { SaaSBarberShop } from '../types';

interface SaaSShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shop: SaaSBarberShop) => void;
  editingShop?: SaaSBarberShop | null;
}

export const SaaSShopModal: React.FC<SaaSShopModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingShop 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<Omit<SaaSBarberShop, 'id' | 'createdAt' | 'monthlyRevenue'>>({
    name: '',
    slug: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    plan: 'ESSENTIAL',
    status: 'TRIAL'
  });

  useEffect(() => {
    if (editingShop) {
      setFormData({
        name: editingShop.name,
        slug: editingShop.slug,
        ownerName: editingShop.ownerName,
        email: editingShop.email,
        phone: editingShop.phone,
        password: '', // Senha não é retornada por segurança
        plan: editingShop.plan,
        status: editingShop.status
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        ownerName: '',
        email: '',
        phone: '',
        password: '',
        plan: 'ESSENTIAL',
        status: 'TRIAL'
      });
    }
  }, [editingShop, isOpen]);

  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = createSlug(name);
    setFormData(prev => ({ ...prev, name, slug }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 11) value = value.slice(0, 11);

    let formattedValue = '';
    if (value.length > 0) {
      formattedValue = `(${value.slice(0, 2)}`;
      if (value.length > 2) {
        formattedValue += `) ${value.slice(2, 7)}`;
        if (value.length > 7) {
          formattedValue += `-${value.slice(7, 11)}`;
        }
      }
    }
    setFormData(prev => ({ ...prev, phone: formattedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: editingShop?.id || Math.random().toString(36).substr(2, 9),
      createdAt: editingShop?.createdAt || new Date().toISOString().split('T')[0],
      monthlyRevenue: editingShop?.monthlyRevenue || (formData.plan === 'ESSENTIAL' ? 49.9 : formData.plan === 'PROFESSIONAL' ? 99.9 : 199.9),
      ...formData
    });
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingShop ? "Configurar Instância" : "Provisionar Novo Cliente"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção Loja */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest border-b border-slate-800 pb-2">
            <Store size={14} /> Dados do Estabelecimento
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Nome da Barbearia" 
              placeholder="Ex: Barber Shop Vintage"
              icon={<Store size={18} />}
              value={formData.name}
              onChange={handleNameChange}
              required
            />
            <Input 
              label="URL da Página (Slug)" 
              placeholder="ex: barber-vintage"
              icon={<Globe size={18} />}
              value={formData.slug}
              onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              required
            />
          </div>
          <Input 
            label="WhatsApp de Contato" 
            placeholder="(00) 00000-0000"
            icon={<Phone size={18} />}
            value={formData.phone}
            onChange={handlePhoneChange}
            required
          />
        </div>

        {/* Seção Proprietário */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 text-sky-500 font-bold text-xs uppercase tracking-widest border-b border-slate-800 pb-2">
            <User size={14} /> Dados do Proprietário
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Nome do Dono" 
              placeholder="Ex: Carlos Silva"
              icon={<User size={18} />}
              value={formData.ownerName}
              onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
              required
            />
            <Input 
              label="E-mail Administrativo" 
              type="email"
              placeholder="admin@shop.com"
              icon={<Mail size={18} />}
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="relative">
            <Input 
              label={editingShop ? "Nova Senha (deixe em branco para manter)" : "Senha Inicial de Acesso"}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              icon={<Lock size={18} />}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required={!editingShop}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Seção Administrativa */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-widest border-b border-slate-800 pb-2">
            <ShieldCheck size={14} /> Configuração SaaS
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <CreditCard size={16} /> Plano de Assinatura
              </label>
              <select 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
                value={formData.plan}
                onChange={e => setFormData({ ...formData, plan: e.target.value as any })}
              >
                <option value="ESSENTIAL">Essencial (R$ 49,90)</option>
                <option value="PROFESSIONAL">Profissional (R$ 99,90)</option>
                <option value="PREMIUM">Premium (R$ 199,90)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Activity size={16} /> Status Inicial
              </label>
              <select 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="TRIAL">Trial (7 dias grátis)</option>
                <option value="ACTIVE">Ativo / Em dia</option>
                <option value="SUSPENDED">Suspenso / Inadimplente</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-slate-800">
          <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" type="submit">
            {editingShop ? "Salvar Alterações" : "Ativar Barbearia"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
