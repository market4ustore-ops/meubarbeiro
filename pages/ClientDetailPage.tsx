
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Calendar, 
  Clock, 
  ShoppingBag, 
  TrendingUp, 
  ChevronLeft, 
  MoreVertical,
  Scissors,
  Package,
  FileText,
  DollarSign,
  History
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, Button, Badge, Input } from '../components/UI';
import { Client, Appointment, FinancialTransaction } from '../types';

interface HistoryItem {
  id: string;
  type: 'APPOINTMENT' | 'TRANSACTION';
  date: string;
  time: string;
  title: string;
  status: string;
  amount: number;
  icon: React.ReactNode;
  items?: any[];
  appointment_id?: string | null;
}

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSpent: 0,
    visitsCount: 0,
    lastVisit: '',
    avgTicket: 0,
  });

  const fetchClientData = async () => {
    if (!profile?.tenant_id || !id) return;
    
    try {
      setLoading(true);
      
      // 1. Fetch Client Info & Barbers
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select(`
          *,
          client_barbers(barber_id, users(name))
        `)
        .eq('id', id)
        .single();

      if (clientError) throw clientError;

      // 2. Fetch Appointments
      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', id)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      // 3. Fetch Financial Transactions (Product Sales)
      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('client_id', id)
        .eq('type', 'INCOME')
        .order('date', { ascending: false });

      // Transform and combine history
      const combinedHistory = [
        ...(appts || []).map(a => ({
          id: a.id,
          type: 'APPOINTMENT',
          date: a.date,
          time: a.time,
          title: 'Serviço de Barbearia',
          status: a.status,
          amount: 0, // Will be enriched from transactions if possible
          icon: <Scissors size={16} />
        })),
        ...(transactions || []).map(t => ({
          id: t.id,
          type: 'TRANSACTION',
          date: t.date,
          time: '', 
          title: t.category === 'Serviço' ? 'Pagamento de Serviço' : 'Compra de Produto',
          status: t.status,
          amount: t.amount,
          items: t.items,
          appointment_id: t.appointment_id,
          icon: t.category === 'Serviço' ? <FileText size={16} /> : <Package size={16} />
        }))
      ].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
        return dateB.getTime() - dateA.getTime();
      });

      // Enrich appointments with amounts from transactions
      const enrichedHistory = (combinedHistory as HistoryItem[]).filter(item => {
        if (item.type === 'TRANSACTION' && item.appointment_id) {
          const apt = combinedHistory.find(h => h.type === 'APPOINTMENT' && h.id === item.appointment_id) as HistoryItem | undefined;
          if (apt) {
            apt.amount = item.amount;
            return false; // Remove the redundant transaction entry
          }
        }
        return true;
      });

      // Calculate Stats
      const totalSpent = (transactions || []).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      const visitsCount = (appts || []).filter(a => a.status === 'COMPLETED').length;
      const lastVisit = appts?.find(a => a.status === 'COMPLETED')?.date || '';
      // Ticket Médio = Faturamento Total / Número de Vendas (transações de receita)
      const avgTicket = (transactions || []).length > 0 ? totalSpent / (transactions || []).length : 0;

      setClient(clientData);
      setHistory(enrichedHistory);
      setStats({
        totalSpent,
        visitsCount,
        lastVisit,
        avgTicket,
      });

    } catch (err) {
      console.error('Error fetching client details:', err);
      addToast('Erro ao carregar perfil do cliente.', 'error');
      navigate('/admin/clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id, profile?.tenant_id]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-500 animate-pulse font-medium">Carregando perfil...</p>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header / Back */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/clientes')}
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">{client.name}</h1>
          <p className="text-slate-500 text-sm font-medium">Perfil do Cliente • Unidade Antigravity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Info & Stats */}
        <div className="space-y-6">
          <Card className="p-6 bg-slate-900 border-slate-800/50">
             <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center text-white mb-4 shadow-2xl shadow-emerald-500/20">
                  <User size={48} />
                </div>
                <h2 className="text-xl font-black text-white">{client.name}</h2>
                <p className="text-slate-400 flex items-center gap-2 mt-1 font-bold">
                  <Phone size={14} className="text-emerald-500" /> {client.phone}
                </p>
                <div className="flex gap-2 mt-4">
                  <Badge variant="success">CLIENTE ATIVO</Badge>
                  {stats.visitsCount > 5 && <Badge variant="info">VIP</Badge>}
                </div>
             </div>

             <div className="mt-8 pt-8 border-t border-slate-800 space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Informações Adicionais</h3>
                <div className="space-y-3">
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Barbeiros Preferidos</span>
                      <span className="text-slate-200 font-bold">
                        {client.barbers && client.barbers.length > 0 
                          ? (client as any).client_barbers.map((cb: any) => cb.users.name).join(', ') 
                          : 'Nenhum'}
                      </span>
                   </div>
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Cadastrado em</span>
                      <span className="text-slate-200 font-bold">{new Date(client.created_at!).toLocaleDateString('pt-BR')}</span>
                   </div>
                </div>
             </div>

             {client.notes && (
               <div className="mt-6 p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Observações Internas</h4>
                  <p className="text-xs text-slate-400 italic leading-relaxed">"{client.notes}"</p>
               </div>
             )}
          </Card>

          {/* Core Stats */}
          <div className="grid grid-cols-1 gap-4">
             <div className="grid grid-cols-2 gap-4">
             <Card className="p-5 bg-slate-900 border-slate-800/50">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 w-fit mb-3">
                  <TrendingUp size={16} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gasto Total</p>
                <p className="text-lg font-black text-white mt-1">R$ {stats.totalSpent.toFixed(2)}</p>
             </Card>
             <Card className="p-5 bg-slate-900 border-slate-800/50">
                <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500 w-fit mb-3">
                  <Calendar size={16} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visitas</p>
                <p className="text-lg font-black text-white mt-1">{stats.visitsCount}</p>
             </Card>
             </div>
             <div className="grid grid-cols-2 gap-4">
             <Card className="p-5 bg-slate-900 border-slate-800/50">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 w-fit mb-3">
                  <DollarSign size={16} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ticket Médio</p>
                <p className="text-lg font-black text-white mt-1">R$ {stats.avgTicket.toFixed(2)}</p>
             </Card>
             <Card className="p-5 bg-slate-900 border-slate-800/50">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 w-fit mb-3">
                  <Clock size={16} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Última Visita</p>
                <p className="text-sm font-black text-white mt-1">{stats.lastVisit ? new Date(`${stats.lastVisit}T12:00:00`).toLocaleDateString('pt-BR') : '-'}</p>
             </Card>
             </div>
          </div>
        </div>

        {/* Right Column: Unified History */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-slate-900 border-slate-800">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="text-emerald-500" /> Histórico de Atividades
                </h3>
             </div>

             <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
                {history.length === 0 ? (
                  <div className="py-20 text-center bg-slate-950/30 rounded-3xl border border-dashed border-slate-800">
                     <p className="text-slate-500 italic">Nenhum registro encontrado para este cliente.</p>
                  </div>
                ) : (
                  history.map((item, idx) => (
                    <div key={`${item.type}-${item.id}`} className="relative pl-12">
                       {/* Timeline Dot */}
                       <div className={`absolute left-0 top-1 w-10 h-10 rounded-xl flex items-center justify-center z-10 shadow-lg ${
                         item.type === 'APPOINTMENT' ? 'bg-slate-800 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-sky-500 border border-sky-500/20'
                       }`}>
                         {item.icon}
                       </div>

                       <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-2xl hover:bg-slate-950 transition-all group">
                         <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div className="space-y-1">
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')} {item.time && `• ${item.time}`}
                                  </span>
                               </div>
                               <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{item.title}</h4>
                               {item.items && (
                                 <div className="flex flex-wrap gap-1 mt-2">
                                   {item.items.map((i: any, subIdx: number) => (
                                     <span key={subIdx} className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 border border-slate-700">
                                       {i.quantity}x {i.name}
                                     </span>
                                   ))}
                                 </div>
                               )}
                            </div>
                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                               <Badge variant={
                                 item.status === 'COMPLETED' || item.status === 'PAID' ? 'success' : 
                                 item.status === 'CANCELLED' ? 'danger' : 'warning'
                               }>
                                 {item.status}
                               </Badge>
                               <span className="text-lg font-black text-white">R$ {Number(item.amount).toFixed(2)}</span>
                            </div>
                         </div>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default ClientDetailPage;
