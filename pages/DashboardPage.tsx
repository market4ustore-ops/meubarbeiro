import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  Scissors,
  Package,
  TrendingUp,
  AlertCircle,
  Clock,
  Plus,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { FeatureGate } from '../components/FeatureGate';
import { useSubscription } from '../context/SubscriptionContext';


const DashboardPage: React.FC = () => {
  const { profile: user } = useAuth();
  const { isTrialActive, isTrialExpired, getDaysRemaining, subscription } = useSubscription();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.tenant_id) {
      loadStats();
    }
  }, [user?.tenant_id]);

  const loadStats = async () => {
    try {
      setLoading(true);
      // Passar user.id e user.role para filtragem
      const data = await getDashboardStats(user!.tenant_id, user!.id, user!.role);
      setStats(data);
    } catch (err: any) {
      addToast('Erro ao carregar estatísticas do dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();
  // Se não tem assinatura paga, é Trial
  const isTrial = !subscription && user?.role === 'OWNER';
  const isSubscriptionActive = !!user?.tenant_id && !!subscription;
  const isExpiringSoon = isSubscriptionActive && daysRemaining !== null && daysRemaining <= 10;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Explicit Trial / Expiration / Warning Banner */}
      {(isTrial || isTrialExpired || (isSubscriptionActive && isExpiringSoon)) && (
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-6 ${isTrialExpired
          ? 'bg-red-600 text-white border-red-700'
          : (isTrial && (daysRemaining === null || daysRemaining > 3))
            ? 'bg-emerald-600 text-white border-emerald-700'
            : 'bg-amber-600 text-white border-amber-700'
          }`}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/20">
              <Clock size={24} />
            </div>
            <div>
              <p className="font-black text-lg">
                {isTrialExpired
                  ? 'Seu período de teste expirou!'
                  : isTrial
                    ? `Período de Teste Grátis: ${daysRemaining !== null ? `${daysRemaining} dias restantes` : 'Ativo'}`
                    : `Sua assinatura expira em ${daysRemaining} dias.`}
              </p>
              <p className="text-sm font-medium opacity-90">
                {isTrialExpired
                  ? 'Assine agora para continuar usando todos os recursos da sua barbearia.'
                  : isTrial
                    ? 'Você está aproveitando todos os recursos do Plano Profissional gratuitamente.'
                    : 'Renove sua assinatura para evitar interrupções no serviço.'}
              </p>
            </div>
          </div>
          <Button
            size="lg"
            variant="secondary"
            className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 font-black shadow-xl shrink-0"
            onClick={() => navigate('/admin/assinatura')}
          >
            {isTrialExpired ? 'Assinar Agora' : 'Ver Detalhes do Plano'}
          </Button>
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Olá, {user?.name.split(' ')[0]}! 👋</h1>
          <p className="text-slate-400">Aqui está um resumo da sua barbearia hoje.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/agenda')} className="flex-1 sm:flex-none"><Clock size={18} /> Ver Agenda</Button>
          <Button onClick={() => navigate('/admin/agenda')} className="flex-1 sm:flex-none"><Plus size={18} /> Novo Agendamento</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-6 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Scissors size={24} />
            </div>
            <Badge variant="success">Mensal</Badge>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">Faturamento Serviços</h3>
          <p className="text-2xl font-bold text-white mt-1">R$ {stats.serviceRevenue.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">Total de agendamentos</p>
        </Card>

        <Card className="p-6 border-l-4 border-l-sky-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
              <Package size={24} />
            </div>
            <Badge variant="info">Mensal</Badge>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">Faturamento Produtos</h3>
          <p className="text-2xl font-bold text-white mt-1">R$ {stats.productRevenue.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">Venda de produtos</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-emerald-600/10 to-sky-600/10 border-emerald-500/20 shadow-xl shadow-emerald-500/5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/10 rounded-lg text-white">
              <DollarSign size={24} />
            </div>
            <Badge variant="success" className="bg-emerald-500 text-white">Total Geral</Badge>
          </div>
          <h3 className="text-slate-300 text-sm font-medium">Faturamento Total</h3>
          <p className="text-3xl font-bold text-white mt-1">R$ {stats.totalRevenue.toFixed(2)}</p>
          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
            <TrendingUp size={12} />
            Previsto p/ o mês
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
              <Clock size={24} />
            </div>
            <Badge variant="info">{stats.servicesToday} Hoje</Badge>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">Serviços Hoje</h3>
          <p className="text-2xl font-bold text-white mt-1">{stats.servicesToday}</p>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <AlertCircle size={24} />
            </div>
            <Badge variant={stats.lowStock.length > 0 ? 'danger' : 'success'}>
              {stats.lowStock.length} Alertas
            </Badge>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">Estoque Crítico</h3>
          <p className="text-2xl font-bold text-white mt-1">{stats.lowStock.length} itens</p>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <Users size={24} />
            </div>
            <Badge variant="success">Total</Badge>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">Clientes Ativos</h3>
          <p className="text-2xl font-bold text-white mt-1">{stats.activeClientsCount}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section - Expanded to Full Width */}
        <div className="lg:col-span-3">
          <FeatureGate
            feature="reports"
            fallback={
              <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4 bg-slate-900/50 border-slate-800">
                <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500">
                  <BarChart3 size={48} />
                </div>
                <h2 className="text-xl font-bold text-white">Relatórios Avançados Bloqueados</h2>
                <p className="text-slate-400 max-w-sm">Tenha uma visão detalhada do seu faturamento semanal e mensal com gráficos interativos.</p>
                <Button variant="secondary" onClick={() => navigate('/admin/assinatura')}>
                  Conhecer Planos
                </Button>
              </Card>
            }
          >
            <Card className="p-6 flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="text-emerald-500" /> Desempenho Semanal
                </h2>
                <select className="bg-slate-800 border-none text-sm text-slate-300 rounded-lg px-2 py-1 focus:ring-0">
                  <option>Últimos 7 dias</option>
                </select>
              </div>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: '#1e293b' }}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f8fafc' }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {stats.chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.total > 0 ? '#10b981' : '#1e293b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </FeatureGate>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
