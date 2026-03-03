
import React from 'react';
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

const revenueData = [
  { name: 'Jan', mrr: 12000, newShops: 12 },
  { name: 'Fev', mrr: 15400, newShops: 18 },
  { name: 'Mar', mrr: 18900, newShops: 22 },
  { name: 'Abr', mrr: 24000, newShops: 31 },
  { name: 'Mai', mrr: 32000, newShops: 45 },
  { name: 'Jun', mrr: 45000, newShops: 58 },
];

const SaaSDashboardPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão MeuBarbeiro SaaS 🚀</h1>
          <p className="text-slate-400">Visão panorâmica de toda a rede e métricas financeiras.</p>
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
            <Badge variant="success">+24%</Badge>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">MRR Global</h3>
          <p className="text-2xl font-bold text-white mt-1">R$ 45.210,00</p>
        </Card>

        <Card className="p-6 bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
              <Store size={24} />
            </div>
            <Badge variant="info">88 Ativos</Badge>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">Barbearias (Tenants)</h3>
          <p className="text-2xl font-bold text-white mt-1">124</p>
        </Card>

        <Card className="p-6 bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Activity size={24} />
            </div>
            <Badge variant="warning">3.2% Churn</Badge>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">LTV Médio</h3>
          <p className="text-2xl font-bold text-white mt-1">R$ 840,00</p>
        </Card>

        <Card className="p-6 bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <Users size={24} />
            </div>
            <Badge variant="success">+12 Hoje</Badge>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">Usuários na Rede</h3>
          <p className="text-2xl font-bold text-white mt-1">1.842</p>
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
              <LineChart data={revenueData}>
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
              <UserPlus className="text-sky-500" /> Novas Barbearias / Mês
            </h2>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
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
                {[
                  { name: 'Cavalera Shop', owner: 'Mário Silva', plan: 'Premium', status: 'ACTIVE' },
                  { name: 'Retrô Barber', owner: 'Ana Costa', plan: 'Professional', status: 'ACTIVE' },
                  { name: 'The Blade Studio', owner: 'Felipe Melo', plan: 'Trial', status: 'TRIAL' },
                  { name: 'Urban Style', owner: 'Carlos Eduardo', plan: 'Essential', status: 'SUSPENDED' },
                ].map((shop, i) => (
                  <tr key={i} className="group hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 font-bold text-slate-200">{shop.name}</td>
                    <td className="py-4 text-sm text-slate-400">{shop.owner}</td>
                    <td className="py-4">
                      <Badge variant={shop.plan === 'Premium' ? 'info' : 'secondary'}>{shop.plan}</Badge>
                    </td>
                    <td className="py-4">
                      <Badge variant={shop.status === 'ACTIVE' ? 'success' : shop.status === 'TRIAL' ? 'warning' : 'danger'}>
                        {shop.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
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
