
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  Download,
  Trash2,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, Button, Input, Badge, Modal } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  getFinancialStats, 
  getFinancialTransactions, 
  upsertFinancialTransaction, 
  deleteFinancialTransaction 
} from '../lib/supabase';
import { VendaExpressaButton } from '../components/VendaExpressaButton';
import { supabase } from '../lib/supabase';

const FinancialPage: React.FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState('month'); // day, week, month, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [services, setServices] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'EXPENSE',
    category: 'Aluguel',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'PAID'
  });

  const calculateDates = () => {
    const now = new Date();
    let start = '';
    let end = now.toISOString().split('T')[0];

    if (period === 'day') {
      start = end;
    } else if (period === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(now.getDate() - 7);
      start = lastWeek.toISOString().split('T')[0];
    } else if (period === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      start = firstDay.toISOString().split('T')[0];
    } else {
      start = startDate;
      end = endDate;
    }

    return { start, end };
  };

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      const { start, end } = calculateDates();
      const [statsData, transData] = await Promise.all([
        getFinancialStats(profile.tenant_id, start, end),
        getFinancialTransactions(profile.tenant_id, { startDate: start, endDate: end })
      ]);
      setStats(statsData);
      setTransactions(transData);
      
      // Fetch services for PDV
      const { data: svcs } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', profile.tenant_id);
      setServices(svcs || []);
    } catch (err: any) {
      addToast('Erro ao carregar dados financeiros.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.tenant_id, period, startDate, endDate]);

  const handleOpenModal = () => {
    setFormData({
      type: 'EXPENSE',
      category: 'Aluguel',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      status: 'PAID'
    });
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    
    setFormLoading(true);
    try {
      await upsertFinancialTransaction({
        ...formData,
        tenant_id: profile.tenant_id,
        amount: Number(formData.amount)
      });
      addToast('Despesa registrada com sucesso!', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      addToast('Erro ao salvar despesa.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteFinancialTransaction(id);
      addToast('Transação removida.', 'success');
      fetchData();
    } catch (err) {
      addToast('Erro ao remover transação.', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleExportPDF = () => {
    if (filteredTransactions.length === 0) {
      addToast('Nenhuma transação para exportar.', 'warning');
      return;
    }

    const doc = new jsPDF();
    const { start, end } = calculateDates();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.text('Relatório Financeiro', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${new Date(start).toLocaleDateString('pt-BR')} a ${new Date(end).toLocaleDateString('pt-BR')}`, 14, 30);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 35);

    // Stats Grid (Simulation of the dashboard cards)
    doc.setDrawColor(241, 245, 249);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 45, 180, 25, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text('RESUMO DO PERÍODO', 16, 50);
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Receita Bruta: ${formatCurrency(stats?.grossRevenue || 0)}`, 16, 58);
    doc.text(`Despesas: ${formatCurrency(stats?.totalExpenses || 0)}`, 16, 65);
    doc.text(`Comissões: ${formatCurrency(stats?.totalCommissions || 0)}`, 80, 58);
    doc.text(`Lucro Líquido: ${formatCurrency(stats?.netProfit || 0)}`, 80, 65);
    doc.text(`Ticket Médio: ${formatCurrency(stats?.averageTicket || 0)}`, 140, 58);

    // Transactions Table
    const tableData = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('pt-BR'),
      t.description || 'Sem descrição',
      t.category,
      t.type === 'INCOME' ? 'Entrada' : 'Saída',
      formatCurrency(t.amount),
      t.commission_amount > 0 ? formatCurrency(t.commission_amount) : '-'
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Comissão']],
      body: tableData,
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 80 },
    });

    doc.save(`relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
    addToast('PDF gerado com sucesso!', 'success');
  };

  if (profile?.role !== 'OWNER' && profile?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
        <AlertCircle size={48} className="text-amber-500" />
        <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
        <p className="text-slate-400">Apenas administradores podem visualizar o módulo financeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="text-emerald-500 shrink-0" /> Gestão Financeira
          </h1>
          <p className="text-slate-400">Acompanhe seu fluxo de caixa e lucros.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <VendaExpressaButton 
            services={services} 
            onComplete={fetchData} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white" 
          />
          <Button onClick={handleOpenModal} className="bg-slate-900 border-slate-800 text-slate-300 hover:text-white">
            <Plus size={18} /> Despesa
          </Button>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center">
            {['day', 'week', 'month', 'custom'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === p ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Custom'}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span className="text-slate-600">-</span>
              <input 
                type="date" 
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          )}

          <Button onClick={handleOpenModal} className="h-10">
            <Plus size={18} /> Nova Despesa
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-emerald-500 bg-slate-900/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Receita Bruta</p>
              <h3 className="text-2xl font-black text-white">{loading ? '...' : formatCurrency(stats?.grossRevenue || 0)}</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-4 flex items-center gap-1">
            <Calendar size={10} /> Total de entradas no período
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-rose-500 bg-slate-900/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Despesas</p>
              <h3 className="text-2xl font-black text-white">{loading ? '...' : formatCurrency(stats?.totalExpenses || 0)}</h3>
            </div>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
              <TrendingDown size={20} />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-4">Custos operacionais registrados</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500 bg-slate-900/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Comissões</p>
              <h3 className="text-2xl font-black text-white">{loading ? '...' : formatCurrency(stats?.totalCommissions || 0)}</h3>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <PieChart size={20} />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-4">Parte destinada aos profissionais</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-sky-500 bg-slate-900 shadow-xl shadow-emerald-500/5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Lucro Líquido</p>
              <h3 className="text-2xl font-black text-emerald-400">{loading ? '...' : formatCurrency(stats?.netProfit || 0)}</h3>
            </div>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
             <span className="text-[10px] text-slate-500">Ticket Médio: <span className="text-white font-bold">{loading ? '...' : formatCurrency(stats?.averageTicket || 0)}</span></span>
          </div>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="overflow-hidden border-slate-800/50 bg-slate-900/20">
        <div className="p-6 border-b border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="font-bold text-lg text-white">Histórico de Transações</h2>
          <div className="flex items-center gap-3">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="Buscar transação..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="secondary" size="sm" className="h-9 px-3" onClick={handleExportPDF} title="Exportar PDF">
              <Download size={16} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição / Categoria</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Comissão</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-xs text-slate-500">Carregando transações...</span>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 text-sm italic">
                    Nenhuma transação encontrada para este período.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-emerald-500 transition-colors">{t.description || 'Sem descrição'}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-tight">{t.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={t.type === 'INCOME' ? 'success' : 'danger'}>
                        {t.type === 'INCOME' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {t.commission_amount > 0 ? formatCurrency(t.commission_amount) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-600 hover:text-rose-500 p-1.5"
                        onClick={() => handleDelete(t.id)}
                        disabled={isDeleting === t.id}
                      >
                        <Trash2 size={16} className={isDeleting === t.id ? 'animate-pulse' : ''} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Despesa / Saída"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-400">Categoria</label>
              <select 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="Aluguel">Aluguel</option>
                <option value="Produtos">Produtos / Insumos</option>
                <option value="Marketing">Marketing / ADS</option>
                <option value="Utilidades">Luz / Água / Internet</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Impostos">Impostos</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <Input 
              label="Data"
              type="date"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>

          <Input 
            label="Valor (R$)"
            type="number"
            placeholder="0.00"
            step="0.01"
            value={formData.amount}
            onChange={e => setFormData({...formData, amount: e.target.value})}
            required
          />

          <Input 
            label="Descrição"
            placeholder="Ex: Compra de pomadas e sprays"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" type="submit" isLoading={formLoading}>Registrar Despesa</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinancialPage;
