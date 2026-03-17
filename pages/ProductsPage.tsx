
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Package, AlertCircle, TrendingDown, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Button, Input, Badge } from '../components/UI';
import { ProductModal } from '../components/ProductModal';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useToast } from '../context/ToastContext';

import { useNavigate } from 'react-router-dom';
import { FeatureGate } from '../components/FeatureGate';

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { addToast } = useToast();
  const { canAddProducts, getCurrentProductCount, showUpgradeModal } = useSubscription();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
   const [loading, setLoading] = useState(true);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);

  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const fetchProducts = async () => {
    if (!profile?.tenant_id) return;

    try {
      setLoading(true);

      // Fetch categories count independently — never blocked by products query
      const categoriesResult = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id);
      setCategoriesCount(categoriesResult.count || 0);

      // Try fetching with product_images and variations
      let productsResult = await supabase
        .from('products')
        .select(`
          *, 
          categories(name), 
          product_images(url, position),
          product_variation_types(
            id, 
            name, 
            product_variation_options(id, name, stock, min_stock, price_modifier)
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('name');

      if (productsResult.error) {
        // Fallback: fetch without product_images/variations (migration not yet applied)
        productsResult = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('tenant_id', profile.tenant_id)
          .order('name') as any;
      }

      if (productsResult.error) throw productsResult.error;

      setProducts((productsResult.data || []).map((p: any) => {
        const sortedImages = (p.product_images || []).sort((a: any, b: any) => a.position - b.position);
        const coverImage = sortedImages[0]?.url || p.image_url || '';
        return {
          id: p.id,
          name: p.name,
          category: p.categories?.name || 'Geral',
          category_id: p.category_id,
          price: p.price,
          stock: p.stock,
          minStock: p.min_stock,
          image: coverImage,
          featured: p.featured || false,
          has_variations: p.has_variations || false,
          variations: p.product_variation_types || []
        };
      }));

    } catch (err: any) {
      console.error('Error fetching products:', err);
      addToast('Erro ao carregar produtos.', 'error');
    } finally {
      setLoading(false);
    }
  };




  useEffect(() => {
    fetchProducts();
  }, [profile?.tenant_id]);

  // KPIs dinâmicos
  const stats = useMemo(() => {
    const total = products.reduce((acc, p) => acc + p.stock, 0);
    const critical = products.filter(p => p.stock <= p.minStock).length;
    const value = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
    return { total, critical, value };
  }, [products]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProduct = async () => {
    // Check categories first
    if (categoriesCount === 0) {
      addToast('Você precisa criar uma categoria antes de cadastrar produtos.', 'warning');
      if (confirm('É necessário criar uma categoria primeiro. Deseja ir para a tela de Categorias agora?')) {
        navigate('/admin/categorias');
      }
      return;
    }

    const count = await getCurrentProductCount();
    if (!canAddProducts(count)) {
      addToast('Limite de produtos atingido (máx. 50).', 'warning');
      return;
    }
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este produto do estoque?')) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setProducts(products.filter(p => p.id !== id));
        addToast('Produto removido.', 'success');
      } catch (err: any) {
        addToast('Erro ao remover produto.', 'error');
      }
    }
  };

  const handleSaveProduct = async (product: any) => {
    // A persistência real será feita dentro do modal ou aqui
    // Para simplificar, vamos recarregar a lista após o save no modal (que agora lidará com o DB)
    fetchProducts();
  };

  return (
    <FeatureGate
      feature="inventory"
      fallback={
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="p-4 bg-amber-500/10 rounded-full text-amber-500">
            <Package size={48} />
          </div>
          <h2 className="text-xl font-bold text-white">Gestão de Estoque Bloqueada</h2>
          <p className="text-slate-400 max-w-md">O controle de estoque avançado está disponível apenas nos planos Profissional e Premium. Faça o upgrade agora para desbloquear.</p>
          <Button onClick={() => navigate('/admin/assinatura')} className="mt-4">
            Ver Planos de Upgrade
          </Button>
        </div>
      }
    >
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="text-emerald-500 shrink-0" /> Produtos e Estoque
            </h1>
            <p className="text-slate-400">Controle suas vendas e reposições de produtos.</p>
          </div>
          <Button onClick={handleAddProduct}><Plus size={18} /> Novo Produto</Button>
        </div>

        <Card className="p-4 bg-slate-900/40">
          <div className="max-w-md">
            <Input
              icon={<Search size={18} />}
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total em Estoque</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{stats.total}</span>
              <Package className="text-emerald-500 opacity-20" size={32} />
            </div>
          </Card>
          <Card className="p-4 bg-red-500/5 border-red-500/20">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Itens Críticos</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-red-500">{stats.critical}</span>
              <AlertCircle className="text-red-500 opacity-20" size={32} />
            </div>
          </Card>
          <Card className="p-4 bg-sky-500/5 border-sky-500/20">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Valor do Estoque</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">R$ {stats.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <TrendingDown className="text-sky-500 opacity-20" size={32} />
            </div>
          </Card>
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="font-medium animate-pulse">Carregando estoque...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <Card className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Produto</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Categoria</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Preço</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Estoque</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <React.Fragment key={product.id}>
                          <tr className="hover:bg-slate-800/30 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => product.has_variations && toggleExpand(product.id)}
                                  className={`p-1 rounded hover:bg-slate-700 transition-colors ${!product.has_variations ? 'opacity-0 cursor-default' : 'text-slate-400'}`}
                                >
                                  {expandedProducts.includes(product.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                <img
                                  src={product.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200'}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-700"
                                  alt={product.name}
                                />
                                <span className="font-semibold text-slate-200">{product.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="info">{product.category}</Badge>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-300">
                              R$ {product.price.toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${product.stock <= product.minStock ? 'bg-red-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min((product.stock / (product.minStock * 2)) * 100, 100)}%` }}
                                  ></div>
                                </div>
                                <span className={`text-sm font-bold min-w-[60px] ${product.stock <= product.minStock ? 'text-red-500' : 'text-slate-400'}`}>
                                  {product.stock} unid.
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleEditProduct(product)}
                                  className="p-2"
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="p-2"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {/* Expanded Variations View */}
                          {product.has_variations && expandedProducts.includes(product.id) && (
                            <tr className="bg-slate-900/40 border-l-2 border-emerald-500">
                              <td colSpan={5} className="px-16 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {(product as any).variations?.map((v: any) => (
                                    <div key={v.id} className="space-y-2">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{v.name}</p>
                                      <div className="space-y-1">
                                        {v.product_variation_options?.map((opt: any) => (
                                          <div key={opt.id} className="flex items-center justify-between text-xs bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                                            <span className="text-slate-200 font-medium">{opt.name}</span>
                                            <div className="flex gap-3">
                                              <span className={`text-xs ${opt.stock <= (opt.min_stock || 0) ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                                {opt.stock} unid.
                                              </span>
                                              {opt.price_modifier !== 0 && (
                                                <span className={opt.price_modifier > 0 ? 'text-emerald-500' : 'text-red-500'}>
                                                  {opt.price_modifier > 0 ? '+' : ''} R$ {opt.price_modifier.toFixed(2)}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          Nenhum produto encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <Card key={product.id} className="p-4 bg-slate-900 border-slate-800/50 space-y-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200'}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-700"
                        alt={product.name}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-white truncate">{product.name}</h3>
                          <Badge variant="info">{product.category}</Badge>
                        </div>
                        <p className="text-emerald-500 font-bold mt-1">R$ {product.price.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                        <span>Estoque</span>
                        <span className={product.stock <= product.minStock ? 'text-red-500' : 'text-slate-400'}>
                          {product.stock} unidades
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${product.stock <= product.minStock ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min((product.stock / (product.minStock * 2)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit2 size={16} className="mr-2" /> Editar
                      </Button>
                      <Button
                        variant="danger"
                        className="flex-1"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 size={16} className="mr-2" /> Excluir
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-12 text-center text-slate-500">
                  Nenhum produto encontrado.
                </Card>
              )}
            </div>
          </div>
        )}

        <ProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProduct}
          editingProduct={editingProduct}
        />
      </div>
    </FeatureGate>
  );
};

export default ProductsPage;
