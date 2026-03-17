
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, UserPlus, ShieldCheck, Shield, Clock } from 'lucide-react';
import { Card, Button, Input, Badge, Modal } from '../components/UI';
import { MOCK_BARBERS } from '../constants';
import { BarberModal } from '../components/BarberModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { Barber } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../context/SubscriptionContext';
import { useToast } from '../context/ToastContext';

const BarbersPage: React.FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const { canAddBarbers, getCurrentBarberCount, showUpgradeModal } = useSubscription();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleBarber, setScheduleBarber] = useState<Barber | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBarbers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', profile?.tenant_id);

    if (data) {
      const mappedBarbers: Barber[] = data.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role as 'OWNER' | 'BARBER',
        status: u.status as 'ONLINE' | 'OFFLINE',
        avatar: u.avatar || undefined,
        username: u.email || '',
        password: '',
        commission_rate: u.commission_rate || 0
      }));
      setBarbers(mappedBarbers);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchBarbers();
    }
  }, [profile?.tenant_id]);

  const filteredBarbers = barbers.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddBarber = async () => {
    const count = await getCurrentBarberCount();
    if (!canAddBarbers(count)) {
      addToast('Limite de barbeiros atingido (2 extras além do dono).', 'warning');
      return;
    }
    setEditingBarber(null);
    setIsModalOpen(true);
  };

  const handleEditBarber = (barber: Barber) => {
    setEditingBarber(barber);
    setIsModalOpen(true);
  };

  const handleEditSchedule = (barber: Barber) => {
    setScheduleBarber(barber);
    setIsScheduleModalOpen(true);
  };

  const handleDeleteBarber = async (id: string) => {
    if (id === profile?.id) {
      addToast("Você não pode remover seu próprio usuário.", 'error');
      return;
    }

    if (confirm('Tem certeza que deseja remover este membro da equipe? O acesso ao sistema também será removido.')) {
      setActionLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('admin-delete-user', {
          body: { userId: id }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        addToast('Membro e acesso removidos com sucesso.', 'success');
        setBarbers(barbers.filter(b => b.id !== id));
      } catch (err: any) {
        console.error('Delete Error:', err);
        addToast(`Erro ao remover membro: ${err.message}`, 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleSaveBarber = async (barber: Barber) => {
    setActionLoading(true);
    try {
      if (editingBarber) {
        // Update existing
        const { error } = await supabase
          .from('users')
          .update({
            name: barber.name,
            role: barber.role,
            status: barber.status,
            commission_rate: barber.commission_rate || 0
          })
          .eq('id', barber.id);

        if (error) throw error;

        addToast('Membro atualizado!', 'success');
        fetchBarbers();
        setIsModalOpen(false);
      } else {
        // Invite New Barber using Edge Function
        const email = barber.username.toLowerCase().trim();
        if (!email.includes('@')) {
          throw new Error("Por favor, insira um email válido.");
        }

        const { data, error } = await supabase.functions.invoke('admin-invite-user', {
          body: {
            email,
            password: barber.password,
            name: barber.name,
            role: barber.role,
            tenant_id: profile?.tenant_id
          }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        if (data.inviteLink) {
          setGeneratedInviteLink(data.inviteLink);
          addToast('Convite processado! Se precisar, copie o link manual abaixo.', 'success');
        } else {
          addToast('Convite enviado com sucesso!', 'success');
        }

        // Update commission_rate for the new user if it was set
        if (data.userId && barber.commission_rate) {
          await supabase.from('users').update({ commission_rate: barber.commission_rate }).eq('id', data.userId);
        }

        fetchBarbers();
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error('Action Error:', err);
      addToast(err.message || 'Erro ao processar ação.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus className="text-emerald-500 shrink-0" /> Equipe
          </h1>
          <p className="text-slate-400">Gerencie os profissionais da sua barbearia.</p>
        </div>
        <Button onClick={handleAddBarber}><UserPlus size={18} /> Adicionar Membro</Button>
      </div>

      <Card className="p-4 bg-slate-900/40">
        <div className="max-w-md">
          <Input
            icon={<Search size={18} />}
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBarbers.map((barber) => (
          <Card key={barber.id} className="group hover:border-slate-700 transition-all">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-800 group-hover:border-emerald-500/50 transition-colors">
                    <img
                      src={barber.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=0f172a&color=10b981`}
                      alt={barber.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-slate-950 flex items-center justify-center ${barber.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-500'}`} title={barber.status}>
                  </div>
                </div>
                <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditBarber(barber)}
                    className="p-2 bg-slate-800/50 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </Button>
                  {barber.id !== profile?.id && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteBarber(barber.id)}
                      disabled={actionLoading}
                      className="p-2 bg-slate-800/50 rounded-lg"
                      title="Remover Membro"
                    >
                      <Trash2 size={16} className={actionLoading ? 'animate-pulse' : ''} />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">{barber.name}</h3>
                <div className="flex items-center gap-2">
                  {barber.role === 'OWNER' ? (
                    <Badge variant="success" className="flex items-center gap-1">
                      <ShieldCheck size={12} /> Dono
                    </Badge>
                  ) : (
                    <Badge variant="info" className="flex items-center gap-1">
                      <Shield size={12} /> Barbeiro
                    </Badge>
                  )}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${barber.status === 'ONLINE' ? 'text-emerald-500' : 'text-slate-500'}`}>
                    ● {barber.status}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  variant="secondary"
                  className="w-full text-xs h-9 bg-slate-900 border-slate-800 hover:border-emerald-500/50"
                  onClick={() => handleEditSchedule(barber)}
                >
                  <Clock size={14} className="mr-2" /> Gerenciar Escala
                </Button>
              </div>

            </div>
          </Card>
        ))}

        <button
          onClick={handleAddBarber}
          className="border-2 border-dashed border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-slate-600 hover:border-emerald-500/50 hover:text-emerald-500 transition-all group min-h-[250px]"
        >
          <div className="p-4 bg-slate-900 rounded-full mb-3 group-hover:bg-emerald-500/10">
            <Plus size={32} />
          </div>
          <span className="font-bold">Novo Barbeiro</span>
          <span className="text-xs text-slate-500">Expanda sua equipe</span>
        </button>
      </div>

      {generatedInviteLink && (
        <Modal
          isOpen={!!generatedInviteLink}
          onClose={() => setGeneratedInviteLink(null)}
          title="Link de Convite Gerado"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              O convite foi processado. Se o profissional não receber o email, você pode enviar este link manualmente (ex: via WhatsApp):
            </p>
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 break-all text-xs font-mono text-emerald-500 leading-relaxed">
              {generatedInviteLink}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(generatedInviteLink);
                addToast('Link copiado!', 'success');
              }}
            >
              Copiar Link
            </Button>
          </div>
        </Modal>
      )}

      <BarberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBarber}
        editingBarber={editingBarber}
        loading={actionLoading}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        barber={scheduleBarber}
        tenantId={profile?.tenant_id}
      />
    </div>
  );
};

export default BarbersPage;
