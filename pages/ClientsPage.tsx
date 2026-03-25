import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Search, Plus, Edit2, Trash2, Filter, UserCheck, Phone, Eye, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { Card, Button, Input, Badge, Modal, EmptyState } from '../components/UI';
import { ClientModal } from '../components/ClientModal';
import { Client, Barber } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

const ClientsPage: React.FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    avgTicket: 0,
    retentionRate: 0
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const isOwner = profile?.role === 'OWNER' || profile?.role === 'SUPER_ADMIN';

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      const { data: barbersData } = await supabase
        .from('users' as any)
        .select('id, name, avatar, role, status')
        .eq('tenant_id', profile.tenant_id);
      
      if (barbersData) {
        setBarbers((barbersData as any[]).map(b => ({
          ...b,
          role: b.role as 'OWNER' | 'BARBER',
          status: b.status as 'ONLINE' | 'OFFLINE'
        })));
      }

      let query = supabase
        .from('clients' as any)
        .select(`
          *,
          client_barbers(barber_id, users(name))
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('name');

      const { data: clientsData, error } = await query;

      if (error) throw error;

      if (clientsData) {
        const mappedClients: Client[] = clientsData.map((c: any) => ({
          ...c,
          barbers: c.client_barbers?.map((cb: any) => ({
            id: cb.barber_id,
            name: cb.users?.name || 'Barbeiro'
          })) || []
        }));
        setClients(mappedClients);

        const { data: financialDataRaw } = await supabase
          .from('financial_transactions' as any)
          .select('amount, type')
          .eq('tenant_id', profile.tenant_id);
        
        const financialData = (financialDataRaw || []) as any[];
        const incomeTransactions = financialData.filter(t => t.type === 'REVENUE' || t.type === 'INCOME');
        const totalRevenue = incomeTransactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        const avgTicket = incomeTransactions.length > 0 ? totalRevenue / incomeTransactions.length : 0;
        
        setStats({
          total: mappedClients.length,
          avgTicket,
          retentionRate: 0
        });
      }
    } catch (err: any) {
      addToast('Erro ao carregar dados: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchData();
    }
  }, [profile?.tenant_id]);

  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm);
    
    const matchesBarber = 
      selectedBarberId === 'all' || 
      c.barbers?.some(b => b.id === selectedBarberId);
    
    return matchesSearch && matchesBarber;
  });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const currentClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenModal = (client: Client | null = null) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleSaveClient = async (clientData: Partial<Client>, selectedBarberIds: string[]) => {
    if (!profile?.tenant_id) return;
    setActionLoading(true);
    
    try {
      let clientId: string;

      if (editingClient) {
        const { error } = await supabase
          .from('clients' as any)
          .update({
            name: clientData.name,
            phone: clientData.phone,
            notes: clientData.notes
          })
          .eq('id', editingClient.id);
        
        if (error) throw error;
        clientId = editingClient.id;
      } else {
        const { data, error } = await supabase
          .from('clients' as any)
          .insert({
            tenant_id: profile.tenant_id,
            name: clientData.name,
            phone: clientData.phone,
            notes: clientData.notes
          })
          .select()
          .single();
        
        if (error) throw error;
        clientId = (data as any).id;
      }

      if (isOwner) {
        await supabase
          .from('client_barbers' as any)
          .delete()
          .eq('client_id', clientId);
        
        if (selectedBarberIds.length > 0) {
          const links = selectedBarberIds.map(barberId => ({
            client_id: clientId,
            barber_id: barberId,
            tenant_id: profile.tenant_id
          }));
          const { error: linkError } = await supabase.from('client_barbers' as any).insert(links);
          if (linkError) throw linkError;
        }
      }

      addToast(editingClient ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      addToast('Erro ao salvar: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este cliente? Todos os dados vinculados a ele serão mantidos nos agendamentos, mas o cadastro do cliente será excluído.')) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('clients' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      addToast('Cliente removido com sucesso.', 'success');
      setClients(clients.filter(c => c.id !== id));
    } catch (err: any) {
      addToast('Erro ao excluir: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-emerald-500" />
            Clientes
          </h1>
          <p className="text-slate-400">Gerencie a base de clientes e histórico de serviços.</p>
        </div>
        {isOwner && (
          <Button onClick={() => handleOpenModal()}><Plus size={18} /> Novo Cliente</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-slate-900/40 border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Total de Clientes</p>
            <h3 className="text-2xl font-black text-white">{stats.total}</h3>
          </div>
        </Card>

        <Card className="p-6 bg-slate-900/40 border-slate-800 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Ticket Médio (Geral)</p>
            <h3 className="text-2xl font-black text-white">R$ {stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
        </Card>

        <Card className="p-6 bg-slate-900/40 border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Filtro Ativo</p>
            <h3 className="text-2xl font-black text-white">{filteredClients.length}</h3>
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-slate-900/40 border-slate-800">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              icon={<Search size={18} />}
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {isOwner && (
            <div className="w-full md:w-64">
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <select
                  value={selectedBarberId}
                  onChange={e => { setSelectedBarberId(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none text-sm font-medium"
                >
                  <option value="all">Todos os Barbeiros</option>
                  {barbers.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden border-slate-800/50 shadow-2xl bg-slate-900/50">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium animate-pulse">Carregando clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <EmptyState 
            icon={<Users size={32} />}
            title="Nenhum cliente encontrado"
            description="Não encontramos clientes para os filtros selecionados. Tente ajustar sua busca ou cadastrar um novo cliente."
            action={
              <Button onClick={() => handleOpenModal()} variant="secondary">
                <Plus size={16} /> Cadastrar Cliente
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Contato</th>
                  {isOwner && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Atendido por</th>}
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {currentClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <Link 
                            to={`/admin/clientes/${client.id}`}
                            className="text-sm font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5 group/link"
                          >
                            {client.name}
                            <Eye size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity text-emerald-500" />
                          </Link>
                          {client.notes && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[200px]" title={client.notes}>{client.notes}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                        <Phone size={14} className="text-slate-500" />
                        {client.phone}
                      </div>
                    </td>
                    {isOwner && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center -space-x-2">
                          {client.barbers && client.barbers.length > 0 ? (
                            client.barbers.map((b, idx) => (
                              <div 
                                key={idx} 
                                title={b.name}
                                className="w-8 h-8 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center overflow-hidden"
                              >
                                <img 
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=0f172a&color=10b981`} 
                                  alt={b.name} 
                                />
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Livre</span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/admin/clientes/${client.id}`}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                          title="Ver Perfil Completo"
                        >
                          <UserCheck size={18} />
                        </Link>
                        {isOwner && (
                          <>
                            <button
                              onClick={() => handleOpenModal(client)}
                              className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/5 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => handleDeleteClient(client.id)}
                                disabled={actionLoading}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all disabled:opacity-50"
                                title="Excluir"
                            >
                                <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Mostrando <span className="text-white font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="text-white font-bold">{Math.min(currentPage * itemsPerPage, filteredClients.length)}</span> de <span className="text-white font-bold">{filteredClients.length}</span> clientes
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3"
              >
                Anterior
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      currentPage === page 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3"
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClient}
        editingClient={editingClient}
        loading={actionLoading}
        barbers={barbers}
      />
    </div>
  );
};

export default ClientsPage;
