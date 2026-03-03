
import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Scissors, MessageCircle, BarChart3, Package, Globe, Layers, Zap } from 'lucide-react';
import { Modal, Input, Button } from './UI';
import { SaaSPlan } from '../types';

interface SaaSPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: SaaSPlan) => void;
  editingPlan?: SaaSPlan | null;
}

export const SaaSPlanModal: React.FC<SaaSPlanModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingPlan 
}) => {
  const [formData, setFormData] = useState<Omit<SaaSPlan, 'id' | 'activeSubscriptions'>>({
    name: '',
    price: 0,
    billingCycle: 'MONTHLY',
    description: '',
    maxBarbers: 2,
    features: {
      whatsapp: false,
      inventory: false,
      reports: false,
      digitalCard: true,
      multiBranch: false,
    },
    status: 'ACTIVE',
    isPopular: false
  });

  useEffect(() => {
    if (editingPlan) {
      const { id, activeSubscriptions, ...rest } = editingPlan;
      setFormData(rest);
    } else {
      setFormData({
        name: '',
        price: 0,
        billingCycle: 'MONTHLY',
        description: '',
        maxBarbers: 2,
        features: {
          whatsapp: false,
          inventory: false,
          reports: false,
          digitalCard: true,
          multiBranch: false,
        },
        status: 'ACTIVE',
        isPopular: false
      });
    }
  }, [editingPlan, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: editingPlan?.id || Math.random().toString(36).substr(2, 9),
      activeSubscriptions: editingPlan?.activeSubscriptions || 0,
      ...formData
    });
    onClose();
  };

  const toggleFeature = (feature: keyof SaaSPlan['features']) => {
    setFormData(prev => ({
      ...prev,
      features: { ...prev.features, [feature]: !prev.features[feature] }
    }));
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingPlan ? "Editar Plano de Assinatura" : "Novo Plano de Assinatura"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Nome do Plano" 
            placeholder="Ex: Profissional"
            icon={<Zap size={18} />}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <Input 
              label="Preço (R$)" 
              type="number" 
              step="0.01"
              icon={<CreditCard size={18} />}
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-400">Ciclo</label>
              <select 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
                value={formData.billingCycle}
                onChange={e => setFormData({ ...formData, billingCycle: e.target.value as any })}
              >
                <option value="MONTHLY">Mensal</option>
                <option value="YEARLY">Anual</option>
              </select>
            </div>
          </div>
        </div>

        <Input 
          label="Breve Descrição" 
          placeholder="Ex: Ideal para barbearias em crescimento..."
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Scissors size={16} /> Limite de Barbeiros
            </label>
            <div className="flex items-center gap-2">
               <Input 
                 type="text"
                 placeholder="Número ou 'UNLIMITED'"
                 value={formData.maxBarbers.toString()}
                 onChange={e => {
                   const val = e.target.value;
                   setFormData({ ...formData, maxBarbers: val.toUpperCase() === 'UNLIMITED' ? 'UNLIMITED' : (parseInt(val) || 0) });
                 }}
               />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-6">
             <button 
               type="button"
               onClick={() => setFormData({ ...formData, isPopular: !formData.isPopular })}
               className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all font-bold text-xs ${
                 formData.isPopular ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500'
               }`}
             >
               {formData.isPopular ? <CheckCircle2 size={14} /> : null}
               Plano Popular (Destaque)
             </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-400">Funcionalidades Inclusas</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'whatsapp', label: 'Notificações WhatsApp', icon: <MessageCircle size={16} /> },
              { id: 'inventory', label: 'Gestão de Estoque', icon: <Package size={16} /> },
              { id: 'reports', label: 'Relatórios Avançados', icon: <BarChart3 size={16} /> },
              { id: 'digitalCard', label: 'Cartão Digital', icon: <Globe size={16} /> },
              { id: 'multiBranch', label: 'Multi-filiais', icon: <Layers size={16} /> },
            ].map((feat) => (
              <button
                key={feat.id}
                type="button"
                onClick={() => toggleFeature(feat.id as any)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  formData.features[feat.id as keyof SaaSPlan['features']] 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 grayscale opacity-60'
                }`}
              >
                {feat.icon}
                <span className="text-xs font-bold">{feat.label}</span>
                {formData.features[feat.id as keyof SaaSPlan['features']] && <CheckCircle2 size={14} className="ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-slate-800">
          <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" type="submit">
            {editingPlan ? "Atualizar Plano" : "Criar Plano"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
