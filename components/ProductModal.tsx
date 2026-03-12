
import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, BarChart3, Package, Plus, Trash2, ChevronDown, ChevronUp, Image as ImageIcon, Layers, Info } from 'lucide-react';
import { Modal, Input, Button, Card, Badge } from './UI';
import { Product, Category } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MultiImageUpload, ProductImage } from './MultiImageUpload';

interface VariationOption {
  id?: string;
  name: string;
  price_modifier: number;
  stock: number;
  min_stock: number;
  isNew?: boolean;
  toDelete?: boolean;
}

interface VariationType {
  id?: string;
  name: string;
  options: VariationOption[];
  isNew?: boolean;
  toDelete?: boolean;
  collapsed?: boolean;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  editingProduct?: Product | null;
}

type ModalTab = 'info' | 'fotos' | 'variacoes';

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProduct
}) => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('info');
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    minStock: 5,
    featured: false,
    image: '',
    has_variations: false
  });

  // Multi-image state
  const [images, setImages] = useState<ProductImage[]>([]);

  // Variations state
  const [variations, setVariations] = useState<VariationType[]>([]);

  // ─── Fetch categories ────────────────────────────────────────────
  useEffect(() => {
    const fetchCategories = async () => {
      if (!profile?.tenant_id) return;
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      if (data) {
        setCategories(data);
        if (!editingProduct && data.length > 0) {
          setFormData(prev => ({ ...prev, category: data[0].id }));
        }
      }
    };
    if (isOpen) fetchCategories();
  }, [isOpen, profile?.tenant_id, editingProduct]);

  // ─── Populate form when editing ─────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('info');
    if (editingProduct) {
      const { id, category, category_id, ...rest } = editingProduct;
      setFormData({
        ...rest,
        category: category_id || '',
        has_variations: rest.has_variations || false
      });
      fetchProductExtras(id);
    } else {
      setFormData({
        name: '',
        category: categories.length > 0 ? categories[0].id : '',
        price: 0,
        stock: 0,
        minStock: 5,
        featured: false,
        image: '',
        has_variations: false
      });
      setImages([]);
      setVariations([]);
    }
  }, [editingProduct, isOpen]);

  const fetchProductExtras = async (productId: string) => {
    // Fetch images
    const db = supabase as any;
    const { data: imgData } = await db
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('position');
    if (imgData) setImages(imgData.map((i: any) => ({ id: i.id, url: i.url, position: i.position })));

    // Fetch variation types + options
    const { data: typeData } = await db
      .from('product_variation_types')
      .select('*, product_variation_options(*)')
      .eq('product_id', productId)
      .order('created_at');

    if (typeData) {
      setVariations(typeData.map((t: any) => ({
        id: t.id,
        name: t.name,
        collapsed: false,
        options: (t.product_variation_options || []).map((o: any) => ({
          id: o.id,
          name: o.name,
          price_modifier: o.price_modifier,
          stock: o.stock,
          min_stock: o.min_stock || 5
        }))
      })));
    }
  };

  // ─── Save handler ────────────────────────────────────────────────
  const isSubmitting = useRef(false);

  // Reseta a ref quando abrir o modal
  useEffect(() => {
    if (isOpen) {
      isSubmitting.current = false;
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    if (!profile?.tenant_id) return;

    // Validation
    if (formData.has_variations) {
      const activeVariations = variations.filter(v => !v.toDelete);
      if (activeVariations.length === 0) {
        addToast('Adicione pelo menos uma variação se o controle de variações estiver ativo.', 'error');
        return;
      }
      for (const v of activeVariations) {
        const activeOptions = v.options.filter(o => !o.toDelete);
        if (activeOptions.length === 0) {
          addToast(`A variação "${v.name}" precisa de pelo menos uma opção.`, 'error');
          return;
        }
      }
    }

    isSubmitting.current = true;
    setLoading(true);
    try {
      let productId = editingProduct?.id;

      // Calculate total stock if varying
      const calculatedStock = formData.has_variations 
        ? variations.reduce((acc, v) => 
            v.toDelete ? acc : acc + v.options.reduce((oAcc, opt) => opt.toDelete ? oAcc : oAcc + opt.stock, 0), 
          0)
        : formData.stock;

      const payload = {
        tenant_id: profile.tenant_id,
        name: formData.name,
        category_id: formData.category || null,
        price: formData.price,
        stock: calculatedStock,
        min_stock: formData.minStock,
        featured: formData.featured,
        has_variations: formData.has_variations,
        image_url: images.length > 0 ? images[0].url : (formData.image || null)
      };


      if (editingProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (error) throw error;
        productId = (data as any).id;
      }

      if (!productId) throw new Error('ID do produto inválido.');

      // ── Save images (Graceful fail if table doesn't exist) ──
      const db = supabase as any;
      try {
        if (editingProduct) {
          // Delete removed ones
          const existingIds = images.filter(i => i.id).map(i => i.id);
          await db.from('product_images').delete()
            .eq('product_id', productId)
            .not('id', 'in', `(${existingIds.length > 0 ? existingIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
        }
        // Insert new images
        const newImages = images.filter(i => !i.id);
        if (newImages.length > 0) {
          await db.from('product_images').insert(
            newImages.map((img: any) => ({
              product_id: productId,
              tenant_id: profile.tenant_id,
              url: img.url,
              position: images.findIndex(i => i.url === img.url)
            }))
          );
        }
        // Update positions for existing images
        for (const img of images.filter(i => i.id)) {
          await db.from('product_images').update({ position: img.position }).eq('id', img.id);
        }
      } catch (imgError) {
        console.warn('Could not save product images (migration may be missing):', imgError);
      }

      // ── Save variations (Graceful fail if table doesn't exist) ──
      try {
        for (const vtype of variations) {
          if (vtype.toDelete && vtype.id) {
            await db.from('product_variation_types').delete().eq('id', vtype.id);
            continue;
          }
          let typeId = vtype.id;
          if (vtype.isNew || !vtype.id) {
            const { data, error } = await db.from('product_variation_types').insert({
              product_id: productId,
              tenant_id: profile.tenant_id,
              name: vtype.name
            }).select().single();
            if (error) throw error;
            typeId = (data as any).id;
          } else {
            await db.from('product_variation_types').update({ name: vtype.name }).eq('id', typeId);
          }

          for (const opt of vtype.options) {
            if (opt.toDelete && opt.id) {
              await db.from('product_variation_options').delete().eq('id', opt.id);
              continue;
            }
            const optPayload = {
              variation_type_id: typeId,
              product_id: productId,
              tenant_id: profile.tenant_id,
              name: opt.name,
              price_modifier: opt.price_modifier,
              stock: opt.stock,
              min_stock: opt.min_stock
            };
            if (opt.isNew || !opt.id) {
              await db.from('product_variation_options').insert(optPayload);
            } else {
              await db.from('product_variation_options').update(optPayload).eq('id', opt.id);
            }
          }
        }
      } catch (varError) {
        console.warn('Could not save product variations (migration may be missing):', varError);
      }

      addToast(editingProduct ? 'Produto atualizado!' : 'Produto cadastrado!', 'success');
      onSave({ id: productId!, ...formData, image_url: images.length > 0 ? images[0].url : formData.image } as any);
      onClose();
    } catch (err: any) {
      console.error('Error saving product:', err);
      addToast('Erro ao salvar produto.', 'error');
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  // ─── Variation helpers ───────────────────────────────────────────

  const addVariationType = () => {
    setVariations(prev => [...prev, { name: '', options: [{ name: '', price_modifier: 0, stock: 0, min_stock: 5, isNew: true }], isNew: true, collapsed: false }]);
  };

  const updateVariationName = (vIdx: number, name: string) => {
    setVariations(prev => prev.map((v, i) => i === vIdx ? { ...v, name } : v));
  };

  const removeVariationType = (vIdx: number) => {
    setVariations(prev => prev.map((v, i) => i === vIdx ? { ...v, toDelete: true } : v));
  };

  const toggleCollapse = (vIdx: number) => {
    setVariations(prev => prev.map((v, i) => i === vIdx ? { ...v, collapsed: !v.collapsed } : v));
  };

  const addOption = (vIdx: number) => {
    setVariations(prev => prev.map((v, i) => i === vIdx
      ? { ...v, options: [...v.options, { name: '', price_modifier: 0, stock: 0, min_stock: 5, isNew: true }] }
      : v
    ));
  };

  const updateOption = (vIdx: number, oIdx: number, field: keyof VariationOption, value: any) => {
    setVariations(prev => prev.map((v, i) => i === vIdx
      ? { ...v, options: v.options.map((o, j) => j === oIdx ? { ...o, [field]: value } : o) }
      : v
    ));
  };

  const removeOption = (vIdx: number, oIdx: number) => {
    setVariations(prev => prev.map((v, i) => i === vIdx
      ? { ...v, options: v.options.map((o, j) => j === oIdx ? { ...o, toDelete: true } : o) }
      : v
    ));
  };

  const visibleVariations = variations.filter(v => !v.toDelete);
  const isLowStock = formData.stock <= formData.minStock;

  const tabs = [
    { id: 'info', label: 'Informações', icon: <Info size={15} /> },
    { id: 'fotos', label: `Fotos (${images.length})`, icon: <ImageIcon size={15} /> },
    { id: 'variacoes', label: `Variações (${visibleVariations.length})`, icon: <Layers size={15} /> },
  ].filter(tab => tab.id !== 'variacoes' || formData.has_variations) as { id: ModalTab; label: string; icon: React.ReactNode }[];

  // Auto-switch away from variations tab if toggle is disabled
  useEffect(() => {
    if (!formData.has_variations && activeTab === 'variacoes') {
      setActiveTab('info');
    }
  }, [formData.has_variations, activeTab]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
      maxWidth="max-w-3xl"
    >
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-900/50 rounded-xl border border-slate-800 w-fit mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Tab: Informações ── */}
        {activeTab === 'info' && (
          <div className="space-y-4 animate-in fade-in duration-200">
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
              >
                <option value="">Geral</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Preço Base (R$)"
                type="number"
                step="0.01"
                icon={<DollarSign size={16} />}
                value={formData.price || ''}
                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
               <Input
                label={formData.has_variations ? "Estoque (Variado)" : "Estoque"}
                type="number"
                icon={<Package size={16} />}
                value={(formData.has_variations ? variations.reduce((acc, v) => acc + (v.toDelete ? 0 : v.options.reduce((oAcc, opt) => oAcc + (opt.toDelete ? 0 : opt.stock), 0)), 0) : formData.stock) || ''}
                onChange={e => !formData.has_variations && setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                placeholder="0"
                disabled={formData.has_variations}
                required={!formData.has_variations}
                className={formData.has_variations ? "opacity-60" : ""}
              />
              <Input
                label="Mínimo"
                type="number"
                icon={<BarChart3 size={16} />}
                value={formData.has_variations ? '' : (formData.minStock || '')}
                onChange={e => !formData.has_variations && setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                placeholder={formData.has_variations ? "Nas variações" : "5"}
                disabled={formData.has_variations}
                required={!formData.has_variations}
                className={formData.has_variations ? "opacity-60" : ""}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div>
                <p className="text-sm font-bold text-amber-500">Produto em Destaque</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Aparece no topo da página pública.</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                className={`w-12 h-6 rounded-full relative transition-colors ${formData.featured ? 'bg-amber-500' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.featured ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
              <div>
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-500">Possui Variações?</p>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Ative para gerenciar estoque por tamanho, cor, etc.</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, has_variations: !formData.has_variations })}
                className={`w-12 h-6 rounded-full relative transition-colors ${formData.has_variations ? 'bg-emerald-500' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.has_variations ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Fotos ── */}
        {activeTab === 'fotos' && (
          <div className="animate-in fade-in duration-200">
            <MultiImageUpload
              images={images}
              onChange={setImages}
              folder="products"
            />
          </div>
        )}

        {/* ── Tab: Variações ── */}
        {activeTab === 'variacoes' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Variações do Produto</p>
                <p className="text-xs text-slate-500 mt-0.5">Ex: Tamanho, Cor, Sabor, Volume...</p>
              </div>
              <Button type="button" size="sm" onClick={addVariationType}>
                <Plus size={14} /> Novo tipo
              </Button>
            </div>

            {visibleVariations.length === 0 && (
              <div className="text-center py-10 text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                <Layers size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold">Nenhuma variação cadastrada</p>
                <p className="text-xs mt-1">Clique em "Novo tipo" para adicionar variações como Tamanho, Cor, etc.</p>
              </div>
            )}

            <div className="space-y-4">
              {variations.map((vtype, vIdx) => {
                if (vtype.toDelete) return null;
                const visibleOptions = vtype.options.filter(o => !o.toDelete);
                return (
                  <div key={vIdx} className="rounded-2xl border border-slate-700 overflow-hidden">
                    {/* ── Type Header ── */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/70 border-b border-slate-700">
                      <div className="w-1 h-5 rounded-full bg-emerald-500 shrink-0" />
                      <input
                        type="text"
                        value={vtype.name}
                        onChange={e => updateVariationName(vIdx, e.target.value)}
                        placeholder="Nome do tipo (ex: Tamanho, Cor...)"
                        className="flex-1 bg-transparent text-sm font-bold text-white placeholder-slate-500 focus:outline-none"
                      />
                      <button type="button" onClick={() => toggleCollapse(vIdx)} className="text-slate-400 hover:text-white transition-colors">
                        {vtype.collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                      <button type="button" onClick={() => removeVariationType(vIdx)} className="text-red-500/60 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* ── Options ── */}
                    {!vtype.collapsed && (
                      <div className="p-4 bg-slate-900/30 space-y-3">
                        {visibleOptions.length === 0 && (
                          <p className="text-center text-xs text-slate-600 py-2">Nenhuma opção. Clique em "Adicionar opção".</p>
                        )}
                        {vtype.options.map((opt, oIdx) => {
                          if (opt.toDelete) return null;
                          return (
                            <div key={oIdx} className="rounded-xl border border-slate-700/60 bg-slate-900/60 overflow-hidden">
                              {/* Option title bar */}
                              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/40 border-b border-slate-700/50">
                                <input
                                  type="text"
                                  value={opt.name}
                                  onChange={e => updateOption(vIdx, oIdx, 'name', e.target.value)}
                                  placeholder="Nome da opção (ex: P, M, G)"
                                  className="flex-1 bg-transparent text-sm font-semibold text-white placeholder-slate-600 focus:outline-none"
                                />
                                <button type="button" onClick={() => removeOption(vIdx, oIdx)} className="text-red-500/60 hover:text-red-400 transition-colors ml-3 shrink-0">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              {/* Option fields — one per row */}
                              <div className="px-4 py-3 space-y-3">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">+/- Preço (R$)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={opt.price_modifier || ''}
                                    onChange={e => updateOption(vIdx, oIdx, 'price_modifier', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00 (sem acréscimo/desconto)"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Estoque atual</label>
                                    <input
                                      type="number"
                                      value={opt.stock || ''}
                                      onChange={e => updateOption(vIdx, oIdx, 'stock', parseInt(e.target.value) || 0)}
                                      placeholder="0"
                                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Estoque mínimo</label>
                                    <input
                                      type="number"
                                      value={opt.min_stock || ''}
                                      onChange={e => updateOption(vIdx, oIdx, 'min_stock', parseInt(e.target.value) || 0)}
                                      placeholder="5"
                                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => addOption(vIdx)}
                          className="w-full mt-1 flex items-center justify-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 font-bold border border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-xl py-2.5 transition-all"
                        >
                          <Plus size={13} /> Adicionar opção
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-800">
          <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" type="submit" isLoading={loading}>
            {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
