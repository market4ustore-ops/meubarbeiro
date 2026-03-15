import React, { useState, useEffect } from 'react';
import { User, Phone, FileText, History, Save, X, Scissors } from 'lucide-react';
import { Modal, Button, Input, Card, Badge } from './UI';
import { Client, Barber, ClientAppointmentHistory } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Partial<Client>, selectedBarberIds: string[]) => Promise<void>;
  editingClient: Client | null;
  loading: boolean;
  barbers: Barber[];
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingClient,
  loading,
  barbers
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedBarberIds, setSelectedBarberIds] = useState<string[]>([]);
  const [history, setHistory] = useState<ClientAppointmentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (editingClient) {
      setName(editingClient.name);
      setPhone(editingClient.phone);
      setNotes(editingClient.notes || '');
      setSelectedBarberIds(editingClient.barbers?.map(b => b.id) || []);
      fetchHistory(editingClient.phone);
    } else {
      setName('');
      setPhone('');
      setNotes('');
      setSelectedBarberIds([]);
      setHistory([]);
    }
    setActiveTab('info');
  }, [editingClient, isOpen]);

  const fetchHistory = async (clientPhone: string) => {
    if (!profile?.tenant_id) return;
    setLoadingHistory(true);
    try {
      const query = supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          status,
          services (name),
          users!appointments_barber_id_fkey (name)
        `)
        .eq('tenant_id', profile.tenant_id);

      // Link via client_id if we have it, otherwise fallback to phone
      if (editingClient?.id) {
        query.eq('client_id', editingClient.id);
      } else {
        query.eq('client_phone', clientPhone);
      }

      // USANDO NOME PORQUE O SCHEMA PODE ESTAR SEM O CLIENT_ID CORRETO.
      // Cast to any to fix deep instantiation error when chaining .eq
      (query as any).eq('client_name', editingClient?.name || name);

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;

      const formattedHistory: ClientAppointmentHistory[] = data.map((item: any) => ({
        id: item.id,
        date: item.date,
        time: item.time,
        service_name: item.services?.name || 'Serviço excluído',
        barber_name: item.users?.name || 'Barbeiro excluído',
        status: item.status
      }));

      setHistory(formattedHistory);
    } catch (err) {
      console.error('Error fetching client history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, phone, notes }, selectedBarberIds);
  };

  const toggleBarber = (barberId: string) => {
    setSelectedBarberIds(prev => 
      prev.includes(barberId) 
        ? prev.filter(id => id !== barberId) 
        : [...prev, barberId]
    );
  };

  const isOwner = profile?.role === 'OWNER' || profile?.role === 'SUPER_ADMIN';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'info' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={16} /> Informações
          </button>
          {editingClient && (
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History size={16} /> Histórico
            </button>
          )}
        </div>

        {activeTab === 'info' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Cliente"
                placeholder="Ex: Roberto Silva"
                icon={<User size={18} />}
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
              <Input
                label="Telefone / WhatsApp"
                placeholder="(00) 00000-0000"
                icon={<Phone size={18} />}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-400 block mb-1.5">Observações Internas</label>
              <div className="relative">
                <div className="absolute left-3 top-3 text-slate-500">
                  <FileText size={18} />
                </div>
                <textarea
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all min-h-[100px]"
                  placeholder="Detalhes sobre o cliente, alergias, preferências..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            {isOwner && barbers.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-400 block">Vincular Barbeiros</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {barbers.map(barber => (
                    <button
                      key={barber.id}
                      type="button"
                      onClick={() => toggleBarber(barber.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${
                        selectedBarberIds.includes(barber.id)
                          ? 'bg-emerald-600/10 border-emerald-500 text-emerald-500'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-800 bg-slate-800 shrink-0">
                        <img 
                          src={barber.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=0f172a&color=10b981`} 
                          alt={barber.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="truncate">{barber.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 italic">O barbeiro vinculado terá acesso aos dados deste cliente fora do fluxo de agendamento.</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-800">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" isLoading={loading}>
                <Save size={18} /> Salvar Cliente
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="py-10 flex justify-center text-slate-500 animate-pulse">Carregando histórico...</div>
            ) : history.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {history.map((apt) => (
                  <Card key={apt.id} className="p-4 bg-slate-900/40 border-slate-800/50 hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            apt.status === 'COMPLETED' ? 'success' : 
                            apt.status === 'CANCELLED' ? 'danger' : 
                            apt.status === 'CONFIRMED' ? 'info' : 'warning'
                          }
                          className="text-[10px]"
                        >
                          {apt.status}
                        </Badge>
                        <span className="text-sm font-bold text-white">{new Date(apt.date).toLocaleDateString('pt-BR')} às {apt.time}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Scissors size={12} className="text-emerald-500" />
                        <span>{apt.barber_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <History size={12} className="text-emerald-500" />
                        <span>{apt.service_name}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-3">
                <History size={48} className="text-slate-800 mx-auto" />
                <p className="text-slate-500 text-sm">Nenhum agendamento encontrado para este cliente.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
