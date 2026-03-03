
import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ShieldCheck,
  Zap,
  TrendingUp,
  Users,
  Scissors,
  Package,
  AlertCircle,
  Info
} from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Tables } from '../lib/database.types';

type SaaSPlan = Tables<'saas_plans'>;
type SubscriptionPayment = Tables<'subscription_payments'>;

const SubscriptionPage: React.FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const { subscription, loading: subLoading, canAddBarbers, canUse, getCurrentBarberCount, getCurrentProductCount, getDaysRemaining, isTrialActive, isAccessBlocked, isReadOnly, isTrialExpired, isSubscriptionExpired } = useSubscription();
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ barbers: 0, products: 0 });

  useEffect(() => {
    fetchData();
  }, [profile?.tenant_id, subscription?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from('saas_plans')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('price', { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Fetch payments if subscription exists
      if (subscription?.id) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('subscription_payments')
          .select('*')
          .eq('subscription_id', subscription.id)
          .order('created_at', { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);
      }

      // Fetch usage counts
      const [barberCount, productCount] = await Promise.all([
        getCurrentBarberCount(),
        getCurrentProductCount()
      ]);
      setUsage({ barbers: barberCount, products: productCount });
    } catch (error: any) {
      console.error('Error fetching subscription data:', error);
      addToast('Erro ao carregar dados da assinatura.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = (plan: SaaSPlan) => {
    if (!plan.cakto_checkout_url) {
      addToast('Checkout indisponível para este plano no momento.', 'warning');
      return;
    }

    // Adicionar parâmetros UTM ou identificadores se necessário
    const url = new URL(plan.cakto_checkout_url);
    if (profile?.tenant_id) {
      url.searchParams.append('tenant_id', profile.tenant_id);
    }
    if (profile?.email) {
      url.searchParams.append('email', profile.email);
    }

    addToast('Redirecionando para o checkout...', 'info');

    // Pequeno delay para o toast ser lido
    setTimeout(() => {
      window.location.href = url.toString();
    }, 1000);
  };

  const currentPlan = plans.find(p => p.id === subscription?.plan_id);

  if (loading || subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Minha Assinatura</h1>
          <p className="text-slate-400">Gerencie seu plano e histórico de pagamentos.</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${subscription?.status === 'active'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
          }`}>
          {subscription?.status === 'active' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold">
            Status: {
              subscription?.status === 'active' ? 'Ativo' :
                subscription?.status === 'pending' ? 'Pendente' :
                  subscription?.status === 'cancelled' ? 'Cancelado' : 'Sem Assinatura'
            }
          </span>
        </div>
      </div>

      {/* Access Blocked / Read Only Alerts */}
      {(isAccessBlocked || isReadOnly) && (
        <div className={`border rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 animate-in zoom-in-95 duration-500 ${isAccessBlocked ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <div className={`p-4 rounded-2xl ${isAccessBlocked ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
            <AlertCircle size={40} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-bold text-white mb-2">
              {isAccessBlocked ? 'Acesso Suspenso' : isTrialExpired ? 'Seu período de teste acabou' : 'Sua assinatura expirou'}
            </h3>
            <p className="text-slate-400 mb-4">
              {isAccessBlocked
                ? 'Sua conta foi suspensa. Por favor, regularize sua assinatura para reestabelecer o acesso.'
                : isReadOnly
                  ? 'O sistema está em modo de leitura. Você pode visualizar seus dados, mas não pode realizar novos agendamentos ou edições.'
                  : 'Sua assinatura não está ativa.'}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-bold">
              <div className={`flex items-center gap-2 ${isAccessBlocked ? 'text-red-500' : 'text-amber-500'}`}>
                <CheckCircle2 size={16} /> {isAccessBlocked ? 'Acesso Bloqueado' : 'Modo Leitura'}
              </div>
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 size={16} /> Seus dados estão protegidos
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div className="space-y-4">
              <div>
                <Badge variant={subscription?.status === 'active' ? 'success' : 'warning'} className="mb-2">
                  {subscription?.status === 'active' ? 'Plano Atual' : 'Aguardando Pagamento'}
                </Badge>
                <h2 className="text-3xl font-black text-white">{currentPlan?.name || 'Profissional'}</h2>
                <div className="flex flex-wrap gap-4 mt-2">
                  {subscription?.current_period_end && (
                    <p className="text-slate-400 flex items-center gap-1">
                      <Clock size={14} className="text-emerald-500" />
                      Próxima renovação em {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                  {getDaysRemaining() !== null && (
                    <p className={`text-sm font-bold flex items-center gap-1 ${getDaysRemaining()! <= 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      <Info size={14} />
                      {isTrialActive ? 'Trial: ' : 'Expira em: '}
                      {getDaysRemaining()} {getDaysRemaining() === 1 ? 'dia' : 'dias'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <CreditCard size={18} className="text-slate-500" />
                  <span className="text-sm font-medium">Faturamento via Cakto</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Zap size={18} className="text-amber-500" />
                  <span className="text-sm font-medium">R$ {currentPlan?.price || '0,00'}/mês</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" className="text-sm" onClick={() => {
                  const firstPlan = plans.find(p => p.id !== subscription?.plan_id);
                  if (firstPlan) handleCheckout(firstPlan);
                }}>
                  Alterar Plano
                </Button>
                {subscription?.status === 'active' && (
                  <Button variant="ghost" className="text-sm text-red-400 hover:text-red-300" onClick={() => addToast('Para cancelar, entre em contato com o suporte.', 'info')}>
                    Cancelar Assinatura
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4 w-full sm:w-64">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Uso dos Recursos</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400 flex items-center gap-1"><Users size={12} /> Barbeiros Equipe</span>
                    <span className="text-white">{usage.barbers} / {currentPlan?.max_barbers || 3}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${usage.barbers >= (currentPlan?.max_barbers || 3) ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((usage.barbers / (currentPlan?.max_barbers || 3)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400 flex items-center gap-1"><Package size={12} /> Produtos no Catálogo</span>
                    <span className="text-white">{usage.products} / {(currentPlan as any)?.max_products || 50}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${usage.products >= ((currentPlan as any)?.max_products || 50) ? 'bg-amber-500' : 'bg-sky-500'}`}
                      style={{ width: `${Math.min((usage.products / ((currentPlan as any)?.max_products || 50)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-slate-900/50 border-slate-800 flex flex-col justify-center items-center text-center">
          <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500 mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Plano Completo</h3>
          <p className="text-sm text-slate-400 mb-6 font-medium">Você já possui acesso a todos os módulos e recursos do sistema.</p>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold"
            disabled
          >
            Todos os Recursos Liberados
          </Button>
        </Card>
      </div>

      {/* Plan Selection */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">
            {plans.length > 1 ? 'Escolha o plano ideal para você' : 'Conheça seu Plano Profissional'}
          </h2>
          <p className="text-slate-500 text-sm">
            {plans.length > 1 ? 'Preços transparentes, sem taxas escondidas.' : 'Todos os recursos liberados para o seu sucesso.'}
          </p>
        </div>

        <div className={`grid grid-cols-1 ${plans.length > 1 ? 'md:grid-cols-3' : 'max-w-md mx-auto'} gap-6 pt-10`}>
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col relative transition-all duration-300 overflow-visible ${plan.id === subscription?.plan_id ? 'border-emerald-500 bg-emerald-500/5 scale-105 z-10' : 'border-slate-800 hover:border-slate-700'}`}
            >
              {plan.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Recomendado
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-slate-500">R$</span>
                  <span className="text-4xl font-black text-white">{plan.price.toFixed(2).replace('.', ',')}</span>
                  <span className="text-sm font-bold text-slate-500">/mês</span>
                </div>
                <p className="text-xs text-slate-400 mt-3">{plan.description}</p>
              </div>

              <div className="space-y-3 flex-1 mb-8">
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Cartão Digital</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Agendamento de serviços online</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Mini loja online</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Controle de estoque</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Dashboard financeiro</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Agendamentos e vendas com confirmação no WhatsApp</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Cartão virtual online 24/7</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Até {plan.max_barbers} Barbeiros</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Até {(plan as any).max_products || 50} Produtos</span>
                </div>
              </div>

              <Button
                variant={plan.id === subscription?.plan_id ? 'ghost' : 'primary'}
                className={`w-full font-bold ${plan.id === subscription?.plan_id ? '' : 'shadow-lg shadow-emerald-500/20'}`}
                disabled={plan.id === subscription?.plan_id}
                onClick={() => handleCheckout(plan)}
              >
                {plan.id === subscription?.plan_id ? 'Plano Atual' : 'Migrar Plano'}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="text-slate-500" size={20} /> Histórico de Faturamento
          </h3>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/30 border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Fatura ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic text-sm">
                    Nenhuma fatura encontrada.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-4 text-sm font-mono text-slate-400 group-hover:text-white transition-colors">
                      {payment.cakto_transaction_id ? payment.cakto_transaction_id.substring(0, 10).toUpperCase() : payment.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : new Date(payment.created_at || '').toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-200">
                      R$ {payment.amount.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={payment.status === 'approved' ? 'success' : 'warning'}>
                        {payment.status === 'approved' ? 'Pago' : payment.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payment.status === 'approved' && (
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                          <Download size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div >
  );
};

export default SubscriptionPage;
