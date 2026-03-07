import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Tag, AlertCircle, Loader2 } from 'lucide-react';
import { Card, Button, Input, Badge } from '../components/UI';
import { CategoryModal } from '../components/CategoryModal';
import { Category } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CategoriesPage: React.FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('name');

      if (error) throw error;
      setCategories(data);
    } catch (err: any) {
      addToast('Erro ao carregar categorias.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [profile?.tenant_id]);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Atenção: Excluir uma categoria não remove os produtos associados, mas eles ficarão sem categoria. Deseja continuar?')) {
      try {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setCategories(categories.filter(c => c.id !== id));
        addToast('Categoria removida!', 'success');
      } catch (err: any) {
        addToast('Erro ao remover categoria.', 'error');
      }
    }
  };

  const handleSaveCategory = () => {
    fetchCategories();
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorias de Produtos</h1>
          <p className="text-slate-400">Organize seu estoque de forma eficiente.</p>
        </div>
        <Button onClick={handleAddCategory}><Plus size={18} /> Nova Categoria</Button>
      </div>

      <Card className="p-4 bg-slate-900/40">
        <div className="max-w-md">
          <Input
            icon={<Search size={18} />}
            placeholder="Buscar categoria..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="font-medium animate-pulse">Carregando categorias...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="group hover:border-slate-700 transition-colors">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: category.color }}
                  >
                    <Tag size={24} />
                  </div>
                  <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditCategory(category)}
                      className="p-2 bg-slate-800/50 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 bg-slate-800/50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{category.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 h-10 mb-6">
                  {category.description || 'Nenhuma descrição informada.'}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <Badge style={{ color: category.color, borderColor: `${category.color}40`, backgroundColor: `${category.color}10` }}>
                    ID: #{category.id.substring(0, 4)}
                  </Badge>
                  <span className="text-xs text-slate-500 font-medium">Ativo</span>
                </div>
              </div>
            </Card>
          ))}

          <Button
            variant="ghost"
            onClick={handleAddCategory}
            className="border-2 border-dashed border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-slate-600 hover:border-emerald-500/50 hover:text-emerald-500 transition-all group min-h-[220px] bg-transparent"
          >
            <div className="p-4 bg-slate-900 rounded-full mb-3 group-hover:bg-emerald-500/10">
              <Plus size={32} />
            </div>
            <span className="font-bold">Adicionar Categoria</span>
          </Button>
        </div>
      )}

      {filteredCategories.length === 0 && searchTerm && (
        <div className="py-20 text-center">
          <div className="inline-flex p-4 bg-slate-900 rounded-full text-slate-700 mb-4">
            <AlertCircle size={48} />
          </div>
          <h3 className="text-xl font-bold text-white">Nenhuma categoria encontrada</h3>
          <p className="text-slate-500">Tente buscar por um termo diferente.</p>
        </div>
      )}

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCategory}
        editingCategory={editingCategory}
      />
    </div>
  );
};

export default CategoriesPage;
