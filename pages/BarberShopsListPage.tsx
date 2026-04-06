
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink, 
  Ban, 
  CheckCircle2, 
  Calendar,
  Store,
  Mail,
  User as UserIcon,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Trash2,
  Globe
} from 'lucide-react';
import { Card, Button, Input, Badge, Toggle } from '../components/UI';
import { SaaSBarberShop } from '../types';
import { SaaSShopModal } from '../components/SaaSShopModal';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';


const BarberShopsListPage: React.FC = () => {
  const { addToast } = useToast();
  const [shops, setShops] = useState<SaaSBarberShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<SaaSBarberShop | null>(null);

  const filteredShops = useMemo(() => {
    return shops.filter(shop => 
      shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [shops, searchTerm]);

  const fetchShops = async () => {
    try {
      setLoading(true);
      // Busca tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Busca donos (users onde role=OWNER)
      const { data: ownersData, error: ownersError } = await supabase
        .from('users')
        .select('tenant_id, name')
        .eq('role', 'OWNER');

      if (ownersError) throw ownersError;

      // Busca planos
      const { data: plansData, error: plansError } = await supabase
        .from('saas_plans')
        .select('id, name, price');

      if (plansError) throw plansError;

      const ownersMap = ownersData.reduce((acc, owner) => {
        if (owner.tenant_id) acc[owner.tenant_id] = owner.name;
        return acc;
      }, {} as Record<string, string>);

      const plansMap = plansData.reduce((acc, plan) => {
        acc[plan.id] = { name: plan.name, price: plan.price };
        return acc;
      }, {} as Record<string, { name: string; price: number }>);

      const mappedShops: SaaSBarberShop[] = (tenantsData || []).map(t => {
        const planInfo = t.plan_id ? plansMap[t.plan_id] : null;
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          ownerName: ownersMap[t.id] || 'Sem Dono',
          email: t.email,
          phone: t.phone || '',
          plan: planInfo ? (planInfo.name as any) : 'Sem Plano',
          status: t.status,
          createdAt: new Date(t.created_at).toLocaleDateString('pt-BR'),
          monthlyRevenue: planInfo ? planInfo.price : 0,
          suspendedAt: t.suspended_at
        } as SaaSBarberShop & { suspendedAt?: string };
      });

      setShops(mappedShops);
    } catch (error) {
      console.error('Error fetching shops:', error);
      addToast('Erro ao carregar as barbearias.', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchShops();
  }, []);

  const handleOpenModal = (shop?: SaaSBarberShop) => {
    setEditingShop(shop || null);
    setIsModalOpen(true);
  };

  const handleSaveShop = async (shop: SaaSBarberShop) => {
    // Apenas relista as shops, pois o modal já salva/atualiza e retorna
    await fetchShops();
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (id: string) => {
    const shop = shops.find(s => s.id === id);
    if (!shop) return;

    const newStatus = shop.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    
    // Atualização otimista para feedback instantâneo
    setShops(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));

    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'SUSPENDED') {
        updateData.suspended_at = new Date().toISOString();
      } else {
        updateData.suspended_at = null;
      }

      const { error } = await supabase.from('tenants').update(updateData).eq('id', id);
      if (error) {
        // Rollback se falhar
        setShops(prev => prev.map(s => s.id === id ? { ...s, status: shop.status } : s));
        throw error;
      }
      
      addToast(`Status da shop alterado para ${newStatus}.`, 'info');
    } catch (error) {
      console.error('Erro ao alternar status do tenant:', error);
      addToast('Erro ao mudar status.', 'error');
    }
  };

  const handleDeleteShop = async (id: string) => {
    if (confirm('ATENÇÃO: Esta ação deleta a barbearia do sistema apenas se ela estiver suspensa há mais de 30 dias. Continuar?')) {
      try {
        const { data, error } = await supabase.rpc('delete_tenant_cascade', { p_tenant_id: id });
        
        if (error) throw error;
        
        if (data && data.success) {
          addToast('Shop e seus dados removidos permanentemente.', 'success');
          fetchShops();
        } else {
          addToast(data.error || 'Erro ao remover tenant.', 'warning');
        }
      } catch (error: any) {
        console.error('Erro na deleção em cascata:', error);
        addToast(error.message || 'Erro ao deletar shop.', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Barbearias (Tenants)</h1>
          <p className="text-slate-400">Gerenciamento completo das instâncias do SaaS.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Store size={18} /> Provisionar Shop
        </Button>
      </div>

      <Card className="p-4 bg-slate-900/40 border-slate-800">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <Input 
              icon={<Search size={18} />} 
              placeholder="Buscar por nome, slug, dono ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="px-4"><Filter size={18} /> Filtros</Button>
            <div className="px-4 py-2 bg-slate-800 rounded-lg flex items-center gap-2">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total:</span>
               <span className="text-sm font-black text-white">{filteredShops.length}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {filteredShops.length > 0 ? (
          filteredShops.map((shop) => (
            <Card key={shop.id} className="p-6 hover:border-emerald-500/30 transition-all group border-slate-800 relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                shop.plan === 'PREMIUM' ? 'bg-purple-500' : 
                shop.plan === 'PROFESSIONAL' ? 'bg-emerald-500' : 'bg-sky-500'
              }`} />

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-500 border border-slate-700 group-hover:scale-110 transition-transform">
                    <Store size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-500 transition-colors">
                        {shop.name}
                      </h3>
                      <Badge variant={shop.status === 'ACTIVE' ? 'success' : shop.status === 'TRIAL' ? 'warning' : 'danger'}>
                        {shop.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                        <UserIcon size={14} className="text-slate-600" /> {shop.ownerName}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                        <Globe size={14} className="text-slate-600" /> /{shop.slug}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Plano Atual</p>
                    <div className="flex items-center gap-1.5">
                      <CreditCard size={14} className="text-slate-600" />
                      <p className="text-sm font-bold text-white">{shop.plan}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Receita MRR</p>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-emerald-600" />
                      <p className="text-sm font-bold text-emerald-500">R$ {shop.monthlyRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Provisionada</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-600" />
                      <p className="text-sm font-bold text-slate-300">{shop.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 lg:justify-end">
                     <button 
                       onClick={() => handleOpenModal(shop)}
                       className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700" 
                       title="Configurar"
                     >
                       <ExternalLink size={18} />
                     </button>
                      <div className="flex flex-col items-end gap-1 px-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                          {shop.status === 'SUSPENDED' ? 'Suspensa' : 'Ativa'}
                        </span>
                        <Toggle 
                          enabled={shop.status !== 'SUSPENDED'} 
                          onChange={() => handleToggleStatus(shop.id)}
                        />
                      </div>
                     <button 
                       onClick={() => handleDeleteShop(shop.id)}
                       className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                       title="Deletar Shop"
                     >
                       <Trash2 size={18} />
                     </button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="py-20 text-center space-y-4 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
              <AlertCircle size={32} className="text-slate-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Nenhuma barbearia encontrada</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Não encontramos resultados para sua busca "{searchTerm}". Tente outros termos.</p>
            </div>
            <Button variant="ghost" onClick={() => setSearchTerm('')}>Limpar Busca</Button>
          </div>
        )}
      </div>

      <SaaSShopModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveShop}
        editingShop={editingShop}
      />
    </div>
  );
};

export default BarberShopsListPage;
