import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Search as SearchIcon,
  Calendar as CalendarIcon,
  Clock,
  Edit,
  User as UserIcon,
  LayoutGrid,
  List as ListIcon,
  Eye,
  LayoutGrid as LayoutGridIcon,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  Phone,
  Scissors,
  UserCheck,
  AlertCircle,
  Settings
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal, EmptyState } from '../components/UI';
import { ClientSelect } from '../components/ClientSelect';
import { ClientModal } from '../components/ClientModal';
import { CheckoutModal } from '../components/CheckoutModal';
import { EditAppointmentModal } from '../components/EditAppointmentModal';
import { AppointmentStatus, AppointmentStatusLabels, Client } from '../types';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { supabase, processSale } from '../lib/supabase'; // Added processSale
import { useAuth } from '../context/AuthContext';

const AgendaPage: React.FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBarber, setFilterBarber] = useState('all');

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  
  // Checkout POS State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutAppointment, setCheckoutAppointment] = useState<any | null>(null);

  const fetchAgendaData = async () => {
    if (!profile?.tenant_id) return;

    try {
      setLoading(true);

      // Fetch Appointments
      let aptsQuery = supabase
        .from('appointments')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      // If barber, only see own appointments
      if (profile.role === 'BARBER') {
        aptsQuery = aptsQuery.eq('barber_id', profile.id);
      }

      const { data: apts, error: aptsError } = await aptsQuery;

      if (aptsError) throw aptsError;

      const { data: svcs, error: svcsError } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      if (svcsError) throw svcsError;

      // Fetch Professionals
      let brbsQuery = supabase
        .from('users')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .in('role', ['BARBER', 'OWNER']);

      // If barber, only see self
      if (profile.role === 'BARBER') {
        brbsQuery = brbsQuery.eq('id', profile.id);
      }

      const { data: brbs, error: brbsError } = await brbsQuery;

      if (brbsError) throw brbsError;

      setAppointments(apts || []);
      setServices(svcs || []);
      setBarbers(brbs || []);

    } catch (err: any) {
      console.error('Error fetching agenda data:', err);
      addToast('Erro ao carregar agenda.', 'error');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchAgendaData();

    if (profile?.tenant_id) {
      const channel = supabase
        .channel('agenda-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: profile.role === 'BARBER' ? `barber_id=eq.${profile.id}` : `tenant_id=eq.${profile.tenant_id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setAppointments(prev => [...prev, payload.new]);
              addNotification({
                title: 'Novo Agendamento',
                message: `${payload.new.client_name} agendou para às ${payload.new.time}.`,
                type: 'success'
              });
            } else if (payload.eventType === 'UPDATE') {
              setAppointments(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
            } else if (payload.eventType === 'DELETE') {
              setAppointments(prev => prev.filter(a => a.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.tenant_id, profile?.id, profile?.role]);

  useEffect(() => {
    if (profile?.role === 'BARBER') {
      setFilterBarber(profile.id);
    }
  }, [profile]);

  const handleOpenModal = (apt?: any) => {
    setEditingAppointment(apt || null);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: status as any })
        .eq('id', id);

      if (error) throw error;
      addToast('Status atualizado.', 'info');
    } catch (err: any) {
      addToast('Erro ao atualizar status.', 'error');
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      const matchesBarber = filterBarber === 'all' || a.barber_id === filterBarber;
      const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
      const matchesSearch = a.client_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = viewMode === 'list' ? a.date === selectedDate : true;
      return matchesBarber && matchesStatus && matchesSearch && matchesDate;
    });
  }, [appointments, filterBarber, filterStatus, searchTerm, selectedDate, viewMode]);

  const timeSlots = Array.from({ length: 26 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  const [isOnline, setIsOnline] = useState(profile?.status === 'ONLINE');
  const [statusLoading, setStatusLoading] = useState(false);

  // Sync profile status with local isOnline state
  useEffect(() => {
    setIsOnline(profile?.status === 'ONLINE');
  }, [profile?.status]);

  const handleToggleMyStatus = async () => {
    if (!profile || statusLoading) return;
    const newStatus = isOnline ? 'OFFLINE' : 'ONLINE';

    // Optimistic Update
    setIsOnline(!isOnline);
    setStatusLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', profile.id);

      if (error) {
        setIsOnline(isOnline); // Rollback
        throw error;
      }

      addToast(`Você está agora ${newStatus === 'ONLINE' ? 'Online' : 'Offline'}!`, 'success');
      fetchAgendaData();
    } catch (err) {
      addToast('Erro ao atualizar status.', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleQuickSaveClient = async (clientData: Partial<Client>, barberIds: string[]) => {
    if (!profile?.tenant_id) return;
    setSavingClient(true);
    try {
      const { data, error } = await (supabase
        .from('clients' as any)
        .insert({
          ...clientData,
          tenant_id: profile.tenant_id
        })
        .select() as any)
        .single();

      if (error) throw error;

      // Handle barber links if any
      if (barberIds.length > 0) {
        const links = barberIds.map(bid => ({
          client_id: (data as any).id,
          barber_id: bid,
          tenant_id: profile.tenant_id
        }));
        await (supabase.from('client_barbers' as any).insert(links) as any);
      }

      setSelectedClientId((data as any).id);
      setIsClientModalOpen(false);
      addToast('Cliente cadastrado!', 'success');
    } catch (err) {
      console.error('Error saving quick client:', err);
      addToast('Erro ao cadastrar cliente.', 'error');
    } finally {
      setSavingClient(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="text-emerald-500 shrink-0" /> Agenda
          </h1>
          <p className="text-slate-400">Organize seus atendimentos de forma profissional.</p>
        </div>

          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-2xl border border-slate-800 transition-all">
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Meu Status</span>
              <span className={`text-xs font-bold transition-colors ${isOnline ? 'text-emerald-500' : 'text-slate-500'}`}>
                {isOnline ? 'Online e Visível' : 'Offline (Oculto)'}
              </span>
            </div>
            <Button
              variant={isOnline ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleToggleMyStatus}
              disabled={statusLoading}
              className={`w-10 h-5 rounded-full relative transition-all duration-300 shadow-inner p-0 min-w-0 ${isOnline ? 'bg-emerald-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-md ${isOnline ? 'left-6' : 'left-1'}`}></div>
            </Button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
          {/* Mobile Status Toggle */}
          <Button
            onClick={handleToggleMyStatus}
            disabled={statusLoading}
            variant={isOnline ? 'primary' : 'secondary'}
            className={`md:hidden flex items-center justify-center gap-2 px-3 py-2 rounded-xl border font-bold text-xs transition-all w-full sm:w-auto h-auto ${isOnline ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
          >
            <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </Button>

          <div className="flex-1 flex items-center justify-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-none p-1.5 md:p-2 rounded-lg transition-all flex items-center justify-center gap-2 text-[10px] md:text-xs font-bold ${viewMode === 'grid' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <LayoutGrid size={14} className="md:w-4 md:h-4 shrink-0" /> <span>Grade</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none p-1.5 md:p-2 rounded-lg transition-all flex items-center justify-center gap-2 text-[10px] md:text-xs font-bold ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <ListIcon size={14} className="md:w-4 md:h-4 shrink-0" /> <span>Lista</span>
            </Button>
          </div>

          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex justify-center py-2 h-10 md:h-11 shadow-lg shadow-emerald-500/20">
            <Plus size={18} /> <span className="sm:hidden ml-2 font-bold text-xs">Novo</span>
          </Button>
      </div>
    
      {/* Primary Toolbar */}
      <Card className="p-3 md:p-4 bg-slate-900/40 border-slate-800/50 backdrop-blur-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-3 md:gap-4">
          <div className="w-full lg:w-48 order-1">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 md:h-11 font-bold text-white text-sm"
            />
          </div>

          <div className="w-full sm:col-span-2 lg:flex-1 order-3 lg:order-2">
            <Input
              icon={<SearchIcon size={18} />}
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 md:h-11 text-sm"
            />
          </div>

          <div className="w-full lg:w-48 order-2 lg:order-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-10 md:h-11 bg-slate-900 border border-slate-800 rounded-xl px-4 text-slate-100 text-xs md:text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none cursor-pointer"
            >
              <option value="all">Todos Status</option>
              <option value="PENDING">Pendentes</option>
              <option value="CONFIRMED">Confirmados</option>
              <option value="COMPLETED">Concluídos</option>
            </select>
          </div>
        </div>
      </Card>

      {/* View Content */}
      <div className="relative">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-500 animate-pulse font-medium">Sincronizando agenda...</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-px border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-slate-800 font-sans">
            {[0, 1, 2, 3, 4, 5, 6].map(i => {
              const now = new Date();
              const diff = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1) + i;
              const d = new Date(now.setDate(diff));
              const dateStr = d.toISOString().split('T')[0];
              const dayLabel = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i];

              const dayApts = filteredAppointments.filter(a => a.date === dateStr).sort((a, b) => b.time.localeCompare(a.time));

              return (
                <div key={dateStr} className="bg-slate-900/90 min-h-[600px] p-3 space-y-4">
                  <div className="text-center pb-4 border-b border-slate-800/50">
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{dayLabel}</span>
                    <span className={`text-xl font-black ${dateStr === new Date().toISOString().split('T')[0] ? 'text-emerald-500' : 'text-slate-300'}`}>
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayApts.map(apt => (
                      <div
                        key={apt.id}
                        onClick={() => handleOpenModal(apt)}
                        className={`p-2.5 rounded-lg border-l-4 cursor-pointer hover:bg-slate-800 transition-all ${apt.status === 'CONFIRMED' ? 'border-emerald-500 bg-emerald-500/5' :
                          apt.status === 'COMPLETED' ? 'border-slate-700 bg-slate-800/20 opacity-40' :
                            'border-amber-500 bg-amber-500/5'
                          }`}
                      >
                        <p className="text-[9px] font-bold text-slate-500">{apt.time}</p>
                        <div className="flex items-center justify-between mt-1">
                          <h6 
                            className="text-xs font-bold text-slate-100 truncate hover:text-emerald-400 transition-colors flex-1"
                            onClick={(e) => {
                              if (apt.client_id) { // Changed apt.clientId to apt.client_id
                                e.stopPropagation();
                                navigate(`/admin/clientes/${apt.client_id}`); // Changed apt.clientId to apt.client_id
                              }
                            }}
                          >
                            {apt.client_name}
                          </h6>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      onClick={() => { setSelectedDate(dateStr); handleOpenModal(); }}
                      className="w-full py-2 border border-dashed border-slate-800 rounded-lg text-slate-700 hover:text-emerald-500 hover:border-emerald-500/30 transition-all flex items-center justify-center bg-transparent h-auto"
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <EmptyState 
                icon={<CalendarIcon size={32} />}
                title="Sua agenda está livre"
                description="Não encontramos agendamentos para os filtros selecionados. Que tal cadastrar um novo?"
                action={
                  <Button variant="secondary" onClick={() => handleOpenModal()}>
                     <Plus size={16} /> Novo Agendamento
                  </Button>
                }
              />
            ) : (
              filteredAppointments.map(apt => (
                <Card key={apt.id} className="p-4 bg-slate-900 border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-center gap-4 w-full">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${apt.status === 'COMPLETED' ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      <Clock size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white group-hover:text-emerald-500 transition-colors uppercase tracking-tight flex items-center gap-2">
                        {apt.client_name}
                        {apt.client_id && (
                          <Link 
                            to={`/admin/clientes/${apt.client_id}`} 
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-emerald-500 transition-all"
                          >
                            <Eye size={14} />
                          </Link>
                        )}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-bold"><CalendarIcon size={12} /> {new Date(`${apt.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                        <span className="flex items-center gap-1 font-bold"><Clock size={12} /> {apt.time} ({apt.total_duration}m)</span>
                        <span className="flex items-center gap-1"><UserIcon size={12} /> {barbers.find(b => b.id === apt.barber_id)?.name.split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                    <Badge variant={apt.status === 'CONFIRMED' ? 'success' : apt.status === 'COMPLETED' ? 'info' : 'warning'}>
                      {apt.status ? AppointmentStatusLabels[apt.status as AppointmentStatus] : ''}
                    </Badge>
                    <div className="flex gap-2">
                       {apt.status !== 'COMPLETED' && (
                          <div className="flex gap-1">
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black h-8 px-2"
                              onClick={() => {
                                setCheckoutAppointment(apt);
                                setIsCheckoutModalOpen(true);
                              }}
                            >
                              FINALIZAR
                            </Button>
                          </div>
                        )}
                        <Button variant="ghost" className="p-2 bg-slate-800/50 hover:bg-emerald-500/10" onClick={() => handleOpenModal(apt)}><Edit size={16} /></Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <EditAppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        appointment={editingAppointment}
        services={services}
        barbers={barbers}
        onSave={fetchAgendaData}
      />

      <ClientModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleQuickSaveClient}
        editingClient={null}
        loading={savingClient}
        barbers={barbers}
      />

      <CheckoutModal 
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        appointment={checkoutAppointment}
        services={services}
        onComplete={fetchAgendaData}
      />
    </div>
  );
};

export default AgendaPage;
