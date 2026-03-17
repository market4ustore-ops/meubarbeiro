
import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Search, 
  Clock, 
  ChevronRight, 
  Scissors, 
  CheckCircle2, 
  Plus,
  ShoppingBag,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge, EmptyState } from '../components/UI';
import { CheckoutModal } from '../components/CheckoutModal';
import { QuickServiceButton } from '../components/QuickServiceButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Service } from '../types';
import OrdersPage from './OrdersPage';

const POSPage: React.FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pos' | 'orders'>('pos');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      
      // Fetch active services for shortcuts
      const { data: svcs } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('active', true)
        .order('featured', { ascending: false });

      // Fetch today's appointments waiting for completion
      const today = new Date().toISOString().split('T')[0];
      const { data: apts } = await supabase
        .from('appointments')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('date', today)
        .in('status', ['PENDING', 'CONFIRMED'])
        .order('time');

      setServices(svcs || []);
      setAppointments(apts || []);
    } catch (err) {
      addToast('Erro ao carregar dados do PDV.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.tenant_id]);

  const handleCheckout = (apt?: any) => {
    setSelectedAppointment(apt || null);
    setIsCheckoutOpen(true);
  };

  const topServices = services.slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="text-emerald-500" /> Atendimento
          </h1>
          <p className="text-slate-400 text-sm">Gerencie atendimentos presenciais e pedidos online.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'pos' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Presencial
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'orders' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Pedidos Online
          </button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex mb-6 w-full">
             <QuickServiceButton onComplete={fetchData} size="lg" className="w-full" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Shortcuts & Quick Actions */}
            <div className="lg:col-span-2 space-y-8">
              
              <section className="space-y-4">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Scissors size={14} /> Serviços Frequentes
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {topServices.map(service => (
                    <button
                      key={service.id}
                      onClick={() => handleCheckout({ service_id: service.id })}
                      className="group p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left space-y-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{service.name}</p>
                        <p className="text-xs font-black text-emerald-500 mt-1">R$ {service.price.toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                  <button 
                    onClick={() => handleCheckout()}
                    className="p-4 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-white hover:border-slate-600 transition-all"
                  >
                    <Plus size={24} />
                    <span className="text-xs font-bold uppercase tracking-widest">Outro</span>
                  </button>
                </div>
              </section>

              <section className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={14} /> Próximos Atendimentos Hoje
                    </h2>
                    <Badge variant="info">{appointments.length} aguardando</Badge>
                 </div>
                 
                 <div className="space-y-3">
                   {appointments.length === 0 ? (
                     <EmptyState 
                       icon={<Clock size={32} />}
                       title="Tudo em dia!"
                       description="Nenhum agendamento pendente para finalizar hoje."
                       className="p-8"
                     />
                   ) : (
                     appointments.map(apt => (
                       <Card key={apt.id} className="p-4 bg-slate-900/60 border-slate-800/50 hover:bg-slate-900 transition-all flex flex-col gap-3">
                         <div className="self-start">
                           <Badge variant={apt.status === 'CONFIRMED' ? 'success' : 'warning'}>
                             {apt.status === 'CONFIRMED' ? 'Confirmado' : 'Pendente'}
                           </Badge>
                         </div>
                         <div className="flex items-center justify-between gap-4">
                           <div className="flex items-center gap-4 min-w-0">
                             <div className="w-12 h-12 shrink-0 rounded-2xl bg-slate-800 flex flex-col items-center justify-center border border-slate-700">
                               <span className="text-xs font-black text-white">{apt.time}</span>
                             </div>
                             <div className="min-w-0">
                                <Link 
                                  to={`/admin/clientes/${apt.client_id}`}
                                  className="font-bold text-white text-lg hover:text-emerald-400 transition-colors flex items-center gap-2 group/link"
                                >
                                  <span className="truncate">{apt.client_name}</span>
                                  <Eye size={14} className="shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity text-emerald-500" />
                                </Link>
                               <p className="text-slate-500 text-sm flex items-center gap-1 mt-0.5">
                                 <Scissors size={12} className="shrink-0" /> <span className="truncate">{services.find(s => s.id === apt.service_id)?.name || 'Serviço'}</span>
                               </p>
                             </div>
                           </div>
                           
                           <Button 
                             onClick={() => handleCheckout(apt)}
                             className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-widest"
                           >
                             FINALIZAR <ChevronRight size={16} className="ml-1" />
                           </Button>
                         </div>
                       </Card>
                     ))
                   )}
                 </div>
              </section>
            </div>

            {/* Right Column: Quick Stats or Tips */}
            <div className="space-y-6">
              <Card className="p-6 bg-gradient-to-br from-indigo-600/10 to-emerald-600/10 border-indigo-500/20">
                 <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-500">
                     <Zap size={20} />
                   </div>
                   <h3 className="font-bold text-white">Modo PDV Rápido</h3>
                 </div>
                 <p className="text-sm text-slate-400 leading-relaxed mb-6">
                   Use este menu para fluxos de balcão. Finalize agendamentos do dia ou inicie novas vendas clicando no botão de atendimento rápido.
                 </p>
                 <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                       Estoque Integrado
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                       Baixa Automática
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                       Comissões em Tempo Real
                    </div>
                 </div>
              </Card>

              <Card className="p-6 border-slate-800 bg-slate-900/20">
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Dica do Especialista</h3>
                 <p className="text-xs text-slate-500 leading-relaxed italic">
                   "Adicionar produtos como pomadas e óleos ao finalizar o serviço pode aumentar seu faturamento médio em até 30%."
                 </p>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <OrdersPage />
        </div>
      )}

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        appointment={selectedAppointment}
        services={services}
        onComplete={fetchData}
      />
    </div>
  );
};

export default POSPage;
