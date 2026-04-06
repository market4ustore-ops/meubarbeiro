
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  Store, 
  ShieldAlert,
  ArrowUpRight,
  UserPlus
} from 'lucide-react';
import { Card, Badge, Button } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '../lib/supabase';

interface DashboardMetrics {
  mrr: number;
  totalShops: number;
  activeShops: number;
  churnRate: number;
  ltv: number;
  totalUsers: number;
  recentShops: any[];
  chartData: any[];
}

const SaaSDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    mrr: 0,
    totalShops: 0,
    activeShops: 0,
    churnRate: 0,
    ltv: 0,
    totalUsers: 0,
    recentShops: [],
    chartData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch tenants
        const { data: tenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false });

        if (tenantsError) throw tenantsError;

        // Fetch saas plans
        const { data: plans, error: plansError } = await supabase
          .from('saas_plans')
          .select('*');

        if (plansError) throw plansError;

        // Fetch users count
        const { count: usersCount, error: usersError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // Fetch owners for the recent shops table
        const { data: owners } = await supabase
          .from('users')
          .select('tenant_id, name')
          .eq('role', 'OWNER');

        const ownersMap = (owners || []).reduce((acc, o) => {
          if (o.tenant_id) acc[o.tenant_id] = o.name;
          return acc;
        }, {} as any);

        const plansMap = (plans || []).reduce((acc, p) => {
          acc[p.id] = { name: p.name, price: p.price };
          return acc;
        }, {} as any);

        const totalShops = (tenants || []).length;
        const activeShops = (tenants || []).filter(t => t.status === 'ACTIVE').length;
        const suspendedShops = (tenants || []).filter(t => t.status === 'SUSPENDED').length;
        const churnRate = totalShops > 0 ? (suspendedShops / totalShops) * 100 : 0;

        let totalMrr = 0;
        (tenants || []).forEach(t => {
          if (t.status === 'ACTIVE' && t.plan_id && plansMap[t.plan_id]) {
            totalMrr += plansMap[t.plan_id].price;
          }
        });

        const ltv = activeShops > 0 ? totalMrr / activeShops : 0;

        // Calculate chart data (Group tenants by month of creation)
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const currentYear = new Date().getFullYear();
        const chartDataMap: Record<number, { name: string; mrr: number; newShops: number }> = {};
        
        for (let i = 0; i < 6; i++) {
          let date = new Date(currentYear, new Date().getMonth() - 5 + i, 1);
          chartDataMap[date.getMonth()] = { name: months[date.getMonth()], mrr: 0, newShops: 0 };
        }

        (tenants || []).forEach(t => {
          const createdAt = new Date(t.created_at);
          if (chartDataMap[createdAt.getMonth()]) {
            chartDataMap[createdAt.getMonth()].newShops += 1;
            if (t.plan_id && plansMap[t.plan_id]) {
              chartDataMap[createdAt.getMonth()].mrr += plansMap[t.plan_id].price;
            }
          }
        });

        const chartData = Object.values(chartDataMap);

        const recentShops = (tenants || []).slice(0, 5).map(t => ({
          name: t.name,
          owner: ownersMap[t.id] || 'N/A',
          plan: t.plan_id && plansMap[t.plan_id] ? plansMap[t.plan_id].name : 'Trial',
          status: t.status
        }));

        setMetrics({
          mrr: totalMrr,
          totalShops,
          activeShops,
          churnRate,
          ltv,
          totalUsers: usersCount || 0,
          recentShops,
          chartData: chartData.length > 0 ? chartData : [
            { name: 'Atual', mrr: totalMrr, newShops: totalShops }
          ]
        });

      } catch (error) {
        console.error("Erro ao puxar dados globais de SaaS:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão MeuBarbeiro SaaS 🚀</h1>
          <p className="text-slate-400">Visão panorâmica de toda a rede e métricas financeiras reais.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Relatórios PDF</Button>
          <Button><UserPlus size={18} /> Provisionar Shop</Button>
        </div>
      </div>

      {/* SaaS KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <DollarSign size={24} />
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">MRR Global</h3>
          <p className="text-2xl font-bold text-white mt-1">R$ {metrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </Card>

        <Card className="p-6 bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
              <Store size={24} />
            </div>
            <Badge variant="info">{metrics.activeShops} Ativos</Badge>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">Barbearias (Tenants)</h3>
          <p className="text-2xl font-bold text-white mt-1">{metrics.totalShops}</p>
        </Card>

        <Card className="p-6 bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Activity size={24} />
            </div>
            <Badge variant="warning">{metrics.churnRate.toFixed(1)}% Churn</Badge>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">LTV Médio (Est. Mensal)</h3>
          <p className="text-2xl font-bold text-white mt-1">R$ {metrics.ltv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </Card>

        <Card className="p-6 bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <Users size={24} />
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">Usuários na Rede</h3>
          <p className="text-2xl font-bold text-white mt-1">{metrics.totalUsers}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* MRR Growth Chart */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-emerald-500" /> Crescimento de Receita (MRR)
            </h2>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Line type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* New Shops Chart */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="text-sky-500" /> Novas Barbearias (Últimos Meses)
            </h2>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                />
                <Bar dataKey="newShops" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Latest Shops */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-lg font-bold text-white mb-6">Últimas Barbearias Cadastradas</h2>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="pb-4 text-xs font-bold text-slate-500 uppercase">Shop</th>
                  <th className="pb-4 text-xs font-bold text-slate-500 uppercase">Dono</th>
                  <th className="pb-4 text-xs font-bold text-slate-500 uppercase">Plano</th>
                  <th className="pb-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {metrics.recentShops.length > 0 ? (
                  metrics.recentShops.map((shop, i) => (
                    <tr key={i} className="group hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 font-bold text-slate-200">{shop.name}</td>
                      <td className="py-4 text-sm text-slate-400">{shop.owner}</td>
                      <td className="py-4">
                        <Badge variant={shop.plan.includes('Premium') ? 'info' : 'secondary'}>{shop.plan}</Badge>
                      </td>
                      <td className="py-4">
                        <Badge variant={shop.status === 'ACTIVE' ? 'success' : shop.status === 'TRIAL' ? 'warning' : 'danger'}>
                          {shop.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500">Nenhuma barbearia cadastrada recentemente.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Platform Status */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-white mb-6">Status da Plataforma</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-200">API Gateway</span>
              </div>
              <span className="text-xs text-emerald-500 font-bold">99.9% Up</span>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-200">Database Cluster</span>
              </div>
              <span className="text-xs text-emerald-500 font-bold">Healthy</span>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-200">WhatsApp Service</span>
              </div>
              <span className="text-xs text-emerald-500 font-bold">Online</span>
            </div>
            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3 text-red-500">
                <ShieldAlert size={18} />
                <span className="text-sm font-bold">Incidentes Ativos</span>
              </div>
              <span className="text-xs font-black">0</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SaaSDashboardPage;
