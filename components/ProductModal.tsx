
import React, { useState, useEffect } from 'react';
import { DollarSign, BarChart3, Loader2, Package } from 'lucide-react';
import { Modal, Input, Button, Card, Badge } from './UI';
import { Product, Category } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ImageUpload } from './ImageUpload';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  editingProduct?: Product | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProduct
}) => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    minStock: 5,
    featured: false,
    image: ''
  });

  useEffect(() => {
    const fetchCategories = async () => {
      if (!profile?.tenant_id) return;
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      if (data) {
        setCategories(data);
        if (!editingProduct) {
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, category: data[0].id }));
          } else {
            setFormData(prev => ({ ...prev, category: '' }));
          }
        }
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, profile?.tenant_id, editingProduct]);

  useEffect(() => {
    if (editingProduct) {
      const { id, ...rest } = editingProduct;
      setFormData(rest);
    } else {
      setFormData({
        name: '',
        category: categories.length > 0 ? categories[0].id : '',
        price: 0,
        stock: 0,
        minStock: 5,
        featured: false,
        image: ''
      });
    }
  }, [editingProduct, isOpen, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    setLoading(true);
    try {
      const payload = {
        tenant_id: profile.tenant_id,
        name: formData.name,
        category_id: formData.category || null,
        price: formData.price,
        stock: formData.stock,
        min_stock: formData.minStock,
        featured: formData.featured,
        image_url: formData.image
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
        addToast('Produto atualizado!', 'success');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(payload);
        if (error) throw error;
        addToast('Produto cadastrado!', 'success');
      }

      onSave({ id: editingProduct?.id || '', ...formData } as any);
      onClose();
    } catch (err: any) {
      console.error('Error saving product:', err);
      addToast('Erro ao salvar produto.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isLowStock = formData.stock <= formData.minStock;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? "Editar Produto" : "Novo Produto"}
      maxWidth="max-w-4xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome do Produto"
            placeholder="Ex: Pomada Efeito Matte"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400">Categoria</label>
            <select
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              required
            >
              <option value="">Geral</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Preço (R$)"
              type="number"
              step="0.01"
              icon={<DollarSign size={16} />}
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Estoque Atual"
              type="number"
              icon={<Package size={16} />}
              value={formData.stock}
              onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
              required
            />
            <Input
              label="Mínimo"
              type="number"
              icon={<BarChart3 size={16} />}
              value={formData.minStock}
              onChange={e => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="flex items-center gap-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-400 font-bold text-amber-500">Produto em Destaque</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                className={`w-12 h-6 rounded-full relative transition-colors ${formData.featured ? 'bg-amber-500' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.featured ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-medium leading-tight max-w-[200px]">
              Produtos em destaque aparecem no topo da página pública para os clientes.
            </p>
          </div>

          <ImageUpload
            label="Imagem do Produto"
            description="Você pode carregar um arquivo do seu dispositivo."
            value={formData.image}
            onChange={(url) => setFormData({ ...formData, image: url })}
            bucket="catalog"
            folder="products"
          />

          <div className="flex gap-3 pt-6 border-t border-slate-800">
            <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" type="submit" isLoading={loading}>
              {editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}
            </Button>
          </div>
        </form>

        <div className="hidden lg:block space-y-4">
          <label className="text-sm font-medium text-slate-400">Prévia do Produto</label>
          <Card className="overflow-hidden border-slate-800 bg-slate-900/40 group relative">
            <div className="aspect-square w-full bg-slate-800 relative flex items-center justify-center overflow-hidden">
              {formData.image ? (
                <img src={formData.image} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-600">
                  <div className="p-4 bg-slate-900 rounded-full border border-slate-800">
                    <Loader2 size={32} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">Sem Imagem</span>
                </div>
              )}
              <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                {isLowStock && formData.name && (
                  <Badge variant="danger">Estoque Crítico</Badge>
                )}
                {formData.featured && (
                  <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/50">
                    Destaque
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-white truncate">{formData.name || 'Nome do Produto'}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                {formData.category || 'Sem Categoria'}
              </p>
              <div className="flex justify-between items-end mt-4">
                <div>
                  <p className="text-2xl font-bold text-emerald-500">R$ {formData.price.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${isLowStock ? 'text-red-500' : 'text-slate-400'}`}>
                    {formData.stock} unidades
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Modal>
  );
};
