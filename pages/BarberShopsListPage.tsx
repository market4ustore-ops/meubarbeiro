
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink, 
  Ban, 
  CheckCircle2, 
  Calendar,
  Store,
  Mail,
  User as UserIcon,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Trash2,
  Globe
} from 'lucide-react';
import { Card, Button, Input, Badge } from '../components/UI';
import { SaaSBarberShop } from '../types';
import { SaaSShopModal } from '../components/SaaSShopModal';
import { useToast } from '../context/ToastContext';

const INITIAL_MOCK_SHOPS: SaaSBarberShop[] = [
  { id: '1', name: 'Barber Shop Vintage', slug: 'barber-shop-vintage', ownerName: 'Lucas Silva', email: 'contato@barbervintage.com', phone: '(11) 98888-7777', plan: 'PROFESSIONAL', status: 'ACTIVE', createdAt: '2023-10-12', monthlyRevenue: 99.90 },
  { id: '2', name: 'Dom Juan Barber', slug: 'dom-juan-barber', ownerName: 'Roberto Almeida', email: 'contato@domjuan.com', phone: '(11) 97777-6666', plan: 'ESSENTIAL', status: 'ACTIVE', createdAt: '2023-11-05', monthlyRevenue: 49.90 },
  { id: '3', name: 'Estilo Urbano', slug: 'estilo-urbano', ownerName: 'Carlos Paiva', email: 'carlos@estilo.com', phone: '(11) 96666-5555', plan: 'PREMIUM', status: 'SUSPENDED', createdAt: '2024-01-20', monthlyRevenue: 199.90 },
  { id: '4', name: 'Barber Kids', slug: 'barber-kids', ownerName: 'Ana Paula', email: 'kids@barber.com', phone: '(11) 95555-4444', plan: 'PROFESSIONAL', status: 'TRIAL', createdAt: '2024-03-01', monthlyRevenue: 0 },
];

const BarberShopsListPage: React.FC = () => {
  const { addToast } = useToast();
  const [shops, setShops] = useState<SaaSBarberShop[]>(INITIAL_MOCK_SHOPS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<SaaSBarberShop | null>(null);

  const filteredShops = useMemo(() => {
    return shops.filter(shop => 
      shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [shops, searchTerm]);

  const handleOpenModal = (shop?: SaaSBarberShop) => {
    setEditingShop(shop || null);
    setIsModalOpen(true);
  };

  const handleSaveShop = (shop: SaaSBarberShop) => {
    if (editingShop) {
      setShops(prev => prev.map(s => s.id === shop.id ? shop : s));
      addToast(`Configurações de "${shop.name}" atualizadas.`, 'success');
    } else {
      setShops(prev => [shop, ...prev]);
      addToast(`Nova barbearia "${shop.name}" provisionada com sucesso!`, 'success');
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    setShops(prev => prev.map(shop => {
      if (shop.id === id) {
        const newStatus = shop.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
        addToast(`Status da shop alterado para ${newStatus}.`, 'info');
        return { ...shop, status: newStatus as any };
      }
      return shop;
    }));
  };

  const handleDeleteShop = (id: string) => {
    if (confirm('ATENÇÃO: Esta ação é irreversível. Todos os dados da barbearia (agenda, clientes, estoque) serão deletados permanentemente. Deseja continuar?')) {
      setShops(prev => prev.filter(s => s.id !== id));
      addToast('Shop removida da plataforma.', 'warning');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Barbearias (Tenants)</h1>
          <p className="text-slate-400">Gerenciamento completo das instâncias do SaaS.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Store size={18} /> Provisionar Shop
        </Button>
      </div>

      <Card className="p-4 bg-slate-900/40 border-slate-800">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <Input 
              icon={<Search size={18} />} 
              placeholder="Buscar por nome, slug, dono ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="px-4"><Filter size={18} /> Filtros</Button>
            <div className="px-4 py-2 bg-slate-800 rounded-lg flex items-center gap-2">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total:</span>
               <span className="text-sm font-black text-white">{filteredShops.length}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {filteredShops.length > 0 ? (
          filteredShops.map((shop) => (
            <Card key={shop.id} className="p-6 hover:border-emerald-500/30 transition-all group border-slate-800 relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                shop.plan === 'PREMIUM' ? 'bg-purple-500' : 
                shop.plan === 'PROFESSIONAL' ? 'bg-emerald-500' : 'bg-sky-500'
              }`} />

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-500 border border-slate-700 group-hover:scale-110 transition-transform">
                    <Store size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-500 transition-colors">
                        {shop.name}
                      </h3>
                      <Badge variant={shop.status === 'ACTIVE' ? 'success' : shop.status === 'TRIAL' ? 'warning' : 'danger'}>
                        {shop.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                        <UserIcon size={14} className="text-slate-600" /> {shop.ownerName}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                        <Globe size={14} className="text-slate-600" /> /{shop.slug}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Plano Atual</p>
                    <div className="flex items-center gap-1.5">
                      <CreditCard size={14} className="text-slate-600" />
                      <p className="text-sm font-bold text-white">{shop.plan}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Receita MRR</p>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-emerald-600" />
                      <p className="text-sm font-bold text-emerald-500">R$ {shop.monthlyRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Provisionada</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-600" />
                      <p className="text-sm font-bold text-slate-300">{shop.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 lg:justify-end">
                     <button 
                       onClick={() => handleOpenModal(shop)}
                       className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700" 
                       title="Configurar"
                     >
                       <ExternalLink size={18} />
                     </button>
                     <button 
                       onClick={() => handleToggleStatus(shop.id)}
                       className={`p-2 rounded-lg transition-colors border ${
                         shop.status === 'SUSPENDED' 
                         ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white' 
                         : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white'
                       }`}
                       title={shop.status === 'SUSPENDED' ? "Ativar" : "Suspender"}
                     >
                       {shop.status === 'SUSPENDED' ? <CheckCircle2 size={18} /> : <Ban size={18} />}
                     </button>
                     <button 
                       onClick={() => handleDeleteShop(shop.id)}
                       className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                       title="Deletar Shop"
                     >
                       <Trash2 size={18} />
                     </button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="py-20 text-center space-y-4 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
              <AlertCircle size={32} className="text-slate-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Nenhuma barbearia encontrada</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Não encontramos resultados para sua busca "{searchTerm}". Tente outros termos.</p>
            </div>
            <Button variant="ghost" onClick={() => setSearchTerm('')}>Limpar Busca</Button>
          </div>
        )}
      </div>

      <SaaSShopModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveShop}
        editingShop={editingShop}
      />
    </div>
  );
};

export default BarberShopsListPage;
