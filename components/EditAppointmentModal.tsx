
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Package, Trash2, Search, Calendar, Clock, User, CheckCircle2, ChevronRight, Tag, Plus, X, AlertCircle } from 'lucide-react';
import { Modal, Button, Card, Input, Badge } from './UI';
import { Product, Appointment, CheckoutItem, Service, Barber, AppointmentStatus } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ClientSelect } from './ClientSelect';
import { ClientModal } from './ClientModal';

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | any | null;
  services: Service[];
  barbers: Barber[];
  onSave: () => void;
}

export const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({ 
  isOpen, 
  onClose, 
  appointment, 
  services,
  barbers,
  onSave 
}) => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Appointment Details State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [barberId, setBarberId] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>(AppointmentStatus.PENDING);
  const [notes, setNotes] = useState('');
  
  // Items State (Services & Products)
  const [items, setItems] = useState<CheckoutItem[]>([]);
  
  // Search State
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Slots State
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [isClosedDay, setIsClosedDay] = useState(false);
  const [openingHours, setOpeningHours] = useState<any[]>([]);

  // Initialize from appointment
  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        setSelectedClientId(appointment.client_id || appointment.clientId || '');
        setClientName(appointment.client_name || appointment.clientName || '');
        setClientPhone(appointment.client_phone || appointment.clientPhone || '');
        setDate(appointment.date || '');
        setTime(appointment.time || '');
        setBarberId(appointment.barber_id || appointment.barberId || '');
        setStatus(appointment.status || AppointmentStatus.PENDING);
        setNotes(appointment.notes || '');
        
        // Load items if they exist
        if (appointment.items && Array.isArray(appointment.items)) {
          setItems(appointment.items);
        } else if (appointment.service_id) {
          // Fallback to main service if items is empty
          const mainSvc = services.find(s => s.id === appointment.service_id);
          if (mainSvc) {
            setItems([{
              type: 'SERVICE',
              id: mainSvc.id,
              name: mainSvc.name,
              price: mainSvc.price,
              quantity: 1
            }]);
          } else {
             setItems([]);
          }
        } else {
          setItems([]);
        }
      } else {
        // Default values for new appointment
        setSelectedClientId('');
        setClientName('');
        setClientPhone('');
        setDate(new Date().toISOString().split('T')[0]);
        setTime('');
        setBarberId(profile?.role === 'BARBER' ? profile.id : '');
        setStatus(AppointmentStatus.PENDING);
        setNotes('');
        setItems([]);
      }
      fetchProducts();
    }
  }, [isOpen, appointment, services, profile]);

  // Calculate Available Slots
  useEffect(() => {
    const calculateSlots = async () => {
      if (!profile?.tenant_id || !date) {
        setAvailableSlots([]);
        return;
      }

      setSlotLoading(true);
      try {
        let hours = openingHours;
        if (hours.length === 0) {
          const { data } = await supabase.from('opening_hours').select('*').eq('tenant_id', profile.tenant_id);
          hours = data || [];
          setOpeningHours(hours);
        }

        const { data: existingApts } = await supabase.from('appointments').select('*').eq('tenant_id', profile.tenant_id).eq('date', date);

        if (!hours || hours.length === 0) {
          setAvailableSlots([]);
          return;
        }

        const dateObj = new Date(date + 'T12:00:00');
        const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayName = daysOfWeek[dateObj.getDay()];
        const todayHours = hours.find((h: any) => h.day === dayName);

        if (!todayHours || !todayHours.is_open || !todayHours.open_time || !todayHours.close_time) {
          setIsClosedDay(true);
          setAvailableSlots([]);
          return;
        }

        setIsClosedDay(false);

        const timeToMinutes = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };

        const startMins = timeToMinutes(todayHours.open_time);
        const endMins = timeToMinutes(todayHours.close_time);
        const duration = 30;

        const slots: string[] = [];
        for (let m = startMins; m <= endMins - duration; m += 30) {
          const hour = Math.floor(m / 60);
          const min = m % 60;
          const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

          const hasCollision = existingApts?.some((apt: any) => {
            if (appointment && apt.id === appointment.id) return false;
            if (barberId && apt.barber_id !== barberId) return false;
            if (apt.status === 'CANCELLED' || apt.status === 'COMPLETED') return false;

            const aptStart = timeToMinutes(apt.time);
            const aptEnd = aptStart + (apt.total_duration || 30);
            return (m < aptEnd && (m + duration) > aptStart);
          });

          if (!hasCollision) slots.push(timeStr);
        }
        setAvailableSlots(slots);
      } catch (err) {
        console.error("Error calculating slots", err);
      } finally {
        setSlotLoading(false);
      }
    };

    if (isOpen) calculateSlots();
  }, [date, barberId, isOpen, profile?.tenant_id, appointment]);

  const fetchProducts = async () => {
    if (!profile?.tenant_id) return;
    try {
      setIsSearching(true);
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('name');
      
      if (prods) setAllProducts(prods as any);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredServices = useMemo(() => {
    if (!serviceSearchTerm) return [];
    return services.filter(s => s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()));
  }, [serviceSearchTerm, services]);

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return [];
    return allProducts.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()));
  }, [productSearchTerm, allProducts]);

  const addItem = (item: CheckoutItem) => {
    const existing = items.find(i => i.id === item.id && i.type === item.type);
    if (existing) {
      setItems(items.map(i => (i.id === item.id && i.type === item.type) ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, item]);
    }
    setServiceSearchTerm('');
    setProductSearchTerm('');
    addToast(`${item.name} adicionado!`, 'success');
  };

  const removeItem = (id: string, type: 'SERVICE' | 'PRODUCT') => {
    setItems(items.filter(i => !(i.id === id && i.type === type)));
  };

  const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || loading) return;

    if (!clientName && !selectedClientId) {
      addToast('Por favor, selecione um cliente.', 'error');
      return;
    }

    if (!date || !time) {
      addToast('Defina data e horário.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Find the services with their actual durations
      const selectedServices = items.filter(i => i.type === 'SERVICE');
      const firstService = selectedServices[0];
      
      // Calculate actual total duration
      const totalDuration = selectedServices.reduce((acc, item) => {
        const svc = services.find(s => s.id === item.id);
        return acc + (svc?.duration || 30);
      }, 0);
      
      const appointmentData = {
        tenant_id: profile.tenant_id,
        client_id: selectedClientId || null,
        client_name: clientName,
        client_phone: clientPhone,
        date,
        time,
        barber_id: barberId || null,
        status,
        notes,
        service_id: firstService?.id || null,
        service_ids: selectedServices.map(i => i.id),
        items: items,
        total_duration: totalDuration || 30
      };

      if (appointment?.id) {
        const { error } = await supabase
          .from('appointments')
          .update(appointmentData as any)
          .eq('id', appointment.id);
        if (error) throw error;
        addToast('Agendamento atualizado!', 'success');
      } else {
        const { error } = await supabase
          .from('appointments')
          .insert([appointmentData] as any);
        if (error) throw error;
        addToast('Agendamento criado!', 'success');
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      addToast('Erro ao salvar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={appointment?.id ? "Editar Agendamento" : "Novo Agendamento"} maxWidth="max-w-3xl">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side: Client and Details */}
          <div className="space-y-6">
            <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <User size={14} /> Cliente
              </h4>
              <ClientSelect 
                tenantId={profile?.tenant_id || ''} 
                selectedClientId={selectedClientId}
                onSelect={(client) => {
                  setSelectedClientId(client.id);
                  setClientName(client.name);
                  setClientPhone(client.phone);
                }}
                onNewClient={() => setIsClientModalOpen(true)}
              />
            </div>

            <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> Agendamento
              </h4>

              {/* Barber FIRST so slots filter correctly */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Profissional</label>
                <select
                  value={barberId}
                  onChange={e => { setBarberId(e.target.value); setTime(''); }}
                  className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-4 text-slate-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Selecione o profissional primeiro</option>
                  {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Data</label>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => { setDate(e.target.value); setTime(''); setIsClosedDay(false); }}
                    className={`w-full h-11 bg-slate-900 border rounded-xl px-4 text-slate-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      isClosedDay ? 'border-rose-500/60 text-rose-400' : 'border-slate-800'
                    }`}
                    required
                  />
                  {isClosedDay && (
                    <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                      <AlertCircle size={10} /> Barbearia fechada neste dia
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                    Horário {slotLoading && <span className="text-emerald-500 animate-pulse ml-2 text-[8px]">...</span>}
                  </label>
                  {!barberId ? (
                    <div className="w-full h-11 bg-slate-900/50 border border-slate-800 rounded-xl px-4 flex items-center">
                      <span className="text-xs text-slate-600 italic">Selecione o profissional</span>
                    </div>
                  ) : isClosedDay ? (
                    <div className="w-full h-11 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 flex items-center">
                      <span className="text-xs text-rose-400 italic">Dia fechado</span>
                    </div>
                  ) : (
                    <select
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-4 text-slate-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                      required
                    >
                      <option value="">{availableSlots.length === 0 && !slotLoading ? 'Sem horários disponíveis' : 'Selecione'}</option>
                      {appointment && !availableSlots.includes(appointment.time) && appointment.time && (
                        <option value={appointment.time}>{appointment.time} (Atual)</option>
                      )}
                      {availableSlots.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Status</label>
                <select 
                  value={status}
                  onChange={e => setStatus(e.target.value as AppointmentStatus)}
                  className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-4 text-slate-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="PENDING">Aguardando</option>
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="CANCELLED">Cancelado</option>
                  <option value="COMPLETED">Concluído</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Side: Items and Totals */}
          <div className="space-y-6">
            <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart size={14} /> Serviços e Produtos
              </h4>

              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <Input 
                    icon={<Tag size={16} />}
                    placeholder="Adicionar serviço..."
                    value={serviceSearchTerm}
                    onChange={e => setServiceSearchTerm(e.target.value)}
                    className="h-10 text-sm"
                  />
                  {filteredServices.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto">
                      {filteredServices.map(s => (
                        <button 
                          key={s.id} 
                          type="button"
                          onClick={() => addItem({ type: 'SERVICE', id: s.id, name: s.name, price: s.price, quantity: 1 })}
                          className="w-full flex items-center justify-between p-3 hover:bg-slate-800 text-left border-b border-slate-800 last:border-0"
                        >
                          <span className="text-xs font-bold text-white">{s.name}</span>
                          <span className="text-xs font-black text-emerald-500">R$ {s.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Input 
                    icon={<Package size={16} />}
                    placeholder="Adicionar produto..."
                    value={productSearchTerm}
                    onChange={e => setProductSearchTerm(e.target.value)}
                    className="h-10 text-sm"
                  />
                  {filteredProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto">
                      {filteredProducts.map(p => (
                        <button 
                          key={p.id} 
                          type="button"
                          onClick={() => addItem({ type: 'PRODUCT', id: p.id, name: p.name, price: p.price, quantity: 1 })}
                          className="w-full flex items-center justify-between p-3 hover:bg-slate-800 text-left border-b border-slate-800 last:border-0"
                        >
                          <span className="text-xs font-bold text-white">{p.name}</span>
                          <div className="text-right">
                            <span className="text-xs font-black text-sky-500 block">R$ {p.price.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500">Estoque: {p.stock}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                {items.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-500">Nenhum item adicionado.</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'SERVICE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-sky-500/10 text-sky-500'}`}>
                          {item.type === 'SERVICE' ? <CheckCircle2 size={14} /> : <Package size={14} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{item.name}</p>
                          <p className="text-[10px] text-slate-500">Qtd: {item.quantity} x R$ {item.price.toFixed(2)}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeItem(item.id, item.type)}
                        className="p-1.5 text-slate-500 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-sm font-black text-white uppercase">Total</span>
                <span className="text-xl font-black text-emerald-500">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Observações</label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full h-24 bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                placeholder="Ex: Cliente prefere corte na tesoura..."
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-800">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">Cancelar</Button>
          <Button className="flex-[2]" isLoading={loading} type="submit">Salvar Agendamento</Button>
        </div>
      </form>

      <ClientModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={(client) => {
          setSelectedClientId(client.id);
          setClientName(client.name);
          setClientPhone(client.phone);
          setIsClientModalOpen(false);
        }}
        barbers={barbers}
        editingClient={null}
        loading={false}
      />
    </Modal>
  );
};
