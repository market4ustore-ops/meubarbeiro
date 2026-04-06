
import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Zap,
  ShieldCheck,
  Users,
  BarChart3,
  Star,
  Copy,
  Search,
  Filter,
  Archive,
  ArrowUpRight,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { Card, Button, Badge, Input } from '../components/UI';
import { SaaSPlan } from '../types';
import { SaaSPlanModal } from '../components/SaaSPlanModal';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';

const INITIAL_PLANS: SaaSPlan[] = [
  {
    id: '22d33b5c-5626-41c9-810f-2969e568cb5a',
    name: 'Profissional',
    price: 59.90,
    billingCycle: 'MONTHLY',
    description: 'Plano único com todos os recursos liberados para sua barbearia decolar.',
    maxBarbers: 3,
    maxProducts: 50,
    features: { whatsapp: true, inventory: true, reports: true, digitalCard: true, multiBranch: true },
    status: 'ACTIVE',
    isPopular: true,
    activeSubscriptions: 184,
  },
];

const SaaSPlansPage: React.FC = () => {
  const { addToast } = useToast();
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');

  // Filtros dinâmicos
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [plans, searchTerm, statusFilter]);

  // Métricas Globais
  const metrics = useMemo(() => {
    const totalRevenue = plans.reduce((acc, p) => acc + (p.price * p.activeSubscriptions), 0);
    const totalSubs = plans.reduce((acc, p) => acc + p.activeSubscriptions, 0);
    return { totalRevenue, totalSubs };
  }, [plans]);

  // Busca os planos do banco de dados
  const fetchPlans = async () => {
    try {
      setLoading(true);
      // Busca planos
      const { data: plansData, error: plansError } = await supabase
        .from('saas_plans')
        .select('*')
        .order('price', { ascending: true });

      if (plansError) throw plansError;

      // Busca tenants para contar assinaturas ativas por plano
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('plan_id')
        .eq('status', 'ACTIVE');

      if (tenantsError) throw tenantsError;

      const subscriptionCounts = tenantsData.reduce((acc, tenant) => {
        if (tenant.plan_id) {
          acc[tenant.plan_id] = (acc[tenant.plan_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const mappedPlans: SaaSPlan[] = (plansData || []).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        billingCycle: p.billing_cycle,
        description: p.description || '',
        maxBarbers: p.max_barbers || 'UNLIMITED',
        maxProducts: p.max_products || 'UNLIMITED',
        features: p.features || { whatsapp: false, inventory: false, reports: false, digitalCard: false, multiBranch: false },
        status: p.status,
        isPopular: p.is_popular,
        activeSubscriptions: subscriptionCounts[p.id] || 0
      }));

      setPlans(mappedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      addToast('Erro ao carregar os planos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenModal = (plan?: SaaSPlan) => {
    setEditingPlan(plan || null);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (plan: SaaSPlan) => {
    try {
      const dbPayload = {
        name: plan.name,
        price: plan.price,
        billing_cycle: plan.billingCycle,
        description: plan.description,
        max_barbers: plan.maxBarbers === 'UNLIMITED' ? null : plan.maxBarbers,
        max_products: plan.maxProducts === 'UNLIMITED' ? null : plan.maxProducts,
        features: plan.features,
        status: plan.status,
        is_popular: plan.isPopular
      };

      if (editingPlan) {
        const { error } = await supabase.from('saas_plans').update(dbPayload).eq('id', plan.id);
        if (error) throw error;
        addToast(`Plano "${plan.name}" atualizado.`, 'success');
      } else {
        const { error } = await supabase.from('saas_plans').insert([dbPayload]);
        if (error) throw error;
        addToast(`Plano "${plan.name}" criado com sucesso!`, 'success');
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      addToast('Erro ao salvar o plano.', 'error');
    }
  };

  const handleDuplicatePlan = async (plan: SaaSPlan) => {
    try {
      const newPlan = {
        name: `${plan.name} (Cópia)`,
        price: plan.price,
        billing_cycle: plan.billingCycle,
        description: plan.description,
        max_barbers: plan.maxBarbers === 'UNLIMITED' ? null : plan.maxBarbers,
        max_products: plan.maxProducts === 'UNLIMITED' ? null : plan.maxProducts,
        features: plan.features,
        status: 'ARCHIVED', // Cria como arquivado por padrão
        is_popular: false
      };

      const { error } = await supabase.from('saas_plans').insert([newPlan]);
      if (error) throw error;
      addToast(`Plano duplicado com sucesso.`, 'success');
      fetchPlans();
    } catch (error) {
      console.error('Error duplicating plan:', error);
      addToast('Erro ao duplicar plano.', 'error');
    }
  };

  const handleDeletePlan = async (id: string) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;

    if (plan.activeSubscriptions > 0) {
      addToast('Não é possível excluir um plano com assinantes ativos. Arquive-o para desativar novas vendas.', 'warning');
      return;
    }

    if (confirm('Deseja remover este plano permanentemente?')) {
      try {
        const { error } = await supabase.from('saas_plans').delete().eq('id', id);
        if (error) throw error;
        addToast('Plano removido.', 'info');
        fetchPlans();
      } catch (error) {
        console.error('Error deleting plan:', error);
        addToast('Erro ao remover plano.', 'error');
      }
    }
  };

  const handleToggleArchive = async (id: string) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    try {
      const newStatus = plan.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
      const { error } = await supabase.from('saas_plans').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      
      addToast(newStatus === 'ARCHIVED' ? `Plano "${plan.name}" arquivado.` : `Plano "${plan.name}" restaurado.`, 'info');
      fetchPlans();
    } catch (error) {
      console.error('Error archiving plan:', error);
      addToast('Erro ao arquivar/restaurar plano.', 'error');
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Planos e Preços</h1>
          <p className="text-slate-400">Gerencie sua estratégia comercial e níveis de serviço.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus size={18} /> Criar Novo Plano
        </Button>
      </div>

      {/* Métricas do Módulo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MRR Estimado por Planos</p>
              <h3 className="text-xl font-bold text-white mt-1">R$ {metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500">
              <DollarSign size={20} />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-sky-500/5 border-sky-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total de Assinantes</p>
              <h3 className="text-xl font-bold text-white mt-1">{metrics.totalSubs} Clientes</h3>
            </div>
            <div className="p-2 bg-sky-500/20 rounded-lg text-sky-500">
              <Users size={20} />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">LTV Médio Estimado</p>
              <h3 className="text-xl font-bold text-white mt-1">R$ {(metrics.totalRevenue / (metrics.totalSubs || 1)).toFixed(2)}</h3>
            </div>
            <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
              <TrendingUp size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card className="p-4 bg-slate-900/40 border-slate-800">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <Input
              icon={<Search size={18} />}
              placeholder="Buscar plano por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'ACTIVE', label: 'Ativos' },
              { id: 'ARCHIVED', label: 'Arquivados' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === f.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPlans.map((plan) => (
          <Card
            key={plan.id}
            className={`flex flex-col p-6 transition-all relative border-slate-800 ${plan.isPopular ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20' : 'bg-slate-900/40'
              } ${plan.status === 'ARCHIVED' ? 'opacity-60 grayscale' : ''}`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg z-10">
                Mais Vendido
              </div>
            )}

            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-2xl border ${plan.status === 'ACTIVE' ? 'bg-slate-800 text-emerald-500 border-slate-700' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                <Zap size={24} />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleDuplicatePlan(plan)}
                  className="p-2 text-slate-500 hover:text-sky-500 transition-colors"
                  title="Duplicar"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => handleOpenModal(plan)}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleToggleArchive(plan.id)}
                  className={`p-2 transition-colors ${plan.status === 'ACTIVE' ? 'text-slate-500 hover:text-amber-500' : 'text-amber-500 hover:text-emerald-500'}`}
                  title={plan.status === 'ACTIVE' ? 'Arquivar' : 'Restaurar'}
                >
                  {plan.status === 'ACTIVE' ? <Archive size={16} /> : <CheckCircle2 size={16} />}
                </button>
                <button
                  onClick={() => handleDeletePlan(plan.id)}
                  className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                  title="Remover"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                {plan.status === 'ARCHIVED' && <Badge variant="secondary" className="text-[8px]">Arquivado</Badge>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-slate-500">R$</span>
                <span className="text-4xl font-black text-white">{plan.price.toFixed(2).replace('.', ',')}</span>
                <span className="text-xs font-bold text-slate-500">/{plan.billingCycle === 'MONTHLY' ? 'mês' : 'ano'}</span>
              </div>
              <p className="text-sm text-slate-400 mt-4 leading-relaxed">{plan.description}</p>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Até {plan.maxBarbers === 'UNLIMITED' ? '∞' : plan.maxBarbers} Barbeiros</span>
              </div>
              {Object.entries(plan.features).map(([key, enabled]) => (
                <div key={key} className={`flex items-center gap-2 text-sm font-medium ${enabled ? 'text-slate-300' : 'text-slate-600'}`}>
                  {enabled ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} />}
                  <span className="capitalize">
                    {key === 'whatsapp' ? 'WhatsApp Automático' :
                      key === 'inventory' ? 'Gestão de Estoque' :
                        key === 'reports' ? 'Relatórios Financeiros' :
                          key === 'digitalCard' ? 'Cartão Digital' : 'Multi-filiais'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-800 mt-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-500" />
                  <span className="text-xs font-bold text-white">{plan.activeSubscriptions} Assinantes</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Receita Bruta</p>
                  <p className="text-sm font-bold text-emerald-500">R$ {(plan.price * plan.activeSubscriptions).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min((plan.activeSubscriptions / 200) * 100, 100)}%` }}
                />
              </div>
            </div>
          </Card>
        ))}

        {filteredPlans.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
            <Archive size={48} className="text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">Nenhum plano encontrado</h3>
            <p className="text-slate-500 text-sm">Ajuste seus filtros para visualizar as ofertas.</p>
          </div>
        )}
      </div>

      <SaaSPlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlan}
        editingPlan={editingPlan}
      />
    </div>
  );
};

export default SaaSPlansPage;
