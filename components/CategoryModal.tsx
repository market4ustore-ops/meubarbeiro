import React, { useState, useEffect } from 'react';
import { Tag, Palette, AlignLeft, Loader2 } from 'lucide-react';
import { Modal, Input, Button } from './UI';
import { Category } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingCategory?: Category | null;
}

const PRESET_COLORS = [
  '#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#94a3b8'
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCategory
}) => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<Category, 'id'>>({
    name: '',
    description: '',
    color: '#10b981'
  });

  useEffect(() => {
    if (editingCategory) {
      const { id, ...rest } = editingCategory;
      setFormData(rest);
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#10b981'
      });
    }
  }, [editingCategory, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    setLoading(true);
    try {
      const payload = {
        tenant_id: profile.tenant_id,
        name: formData.name,
        description: formData.description,
        color: formData.color
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id);
        if (error) throw error;
        addToast('Categoria atualizada!', 'success');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(payload);
        if (error) throw error;
        addToast('Categoria criada!', 'success');
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error saving category:', err);
      addToast('Erro ao salvar categoria.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCategory ? "Editar Categoria" : "Nova Categoria"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nome da Categoria"
          placeholder="Ex: Pós-Barba, Maquinas..."
          icon={<Tag size={18} />}
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-400">Descrição (Opcional)</label>
          <div className="relative">
            <AlignLeft className="absolute left-3 top-3 text-slate-500" size={18} />
            <textarea
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all min-h-[100px] resize-none"
              placeholder="Para que serve esta categoria?"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <Palette size={16} /> Identificação Visual
          </label>
          <div className="flex flex-wrap gap-3">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-10 h-10 rounded-full border-2 transition-all ${formData.color === color ? 'border-white scale-110 shadow-lg shadow-white/10' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-slate-800">
          <Button variant="secondary" className="flex-1" type="button" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button className="flex-1" type="submit" isLoading={loading}>
            {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
