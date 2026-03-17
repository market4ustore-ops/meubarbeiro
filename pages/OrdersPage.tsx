import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  User as UserIcon,
  Filter,
  Eye,
  ChevronRight,
  AlertCircle,
  Truck
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { getOrdersByTenant, updateOrderStatus, processSale } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type DBOrder = Database['public']['Tables']['product_orders']['Row'] & {
  product_order_items: Database['public']['Tables']['product_order_items']['Row'][]
};

export enum OrderStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export const OrderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'PENDENTE',
  [OrderStatus.READY]: 'SEPARADO',
  [OrderStatus.COMPLETED]: 'RETIRADO',
  [OrderStatus.CANCELLED]: 'CANCELADO'
};

const OrdersPage: React.FC = () => {
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { profile: user } = useAuth();

  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<DBOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    if (user?.tenant_id) {
      loadOrders();
    }
  }, [user?.tenant_id]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getOrdersByTenant(user!.tenant_id);
      setOrders(data as DBOrder[]);
    } catch (err: any) {
      addToast('Erro ao carregar pedidos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case OrderStatus.PENDING: return 'warning';
      case OrderStatus.READY: return 'info';
      case OrderStatus.COMPLETED: return 'success';
      case OrderStatus.CANCELLED: return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case OrderStatus.PENDING: return <Clock size={14} />;
      case OrderStatus.READY: return <Package size={14} />;
      case OrderStatus.COMPLETED: return <CheckCircle2 size={14} />;
      case OrderStatus.CANCELLED: return <XCircle size={14} />;
      default: return null;
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

      const order = orders.find(o => o.id === orderId);

      if (newStatus === OrderStatus.READY) {
        addToast('Pedido marcado como separado!', 'success');
        addNotification({
          title: 'Pedido Pronto para Retirada',
          message: `O pedido de ${order?.client_name} está separado e aguardando retirada.`,
          type: 'info'
        });
      } else if (newStatus === OrderStatus.COMPLETED) {
        if (order) {
            // Unificação de Vendas: Criar transação financeira e baixar estoque
            await processSale({
                transaction: {
                    tenant_id: user!.tenant_id,
                    type: 'INCOME',
                    category: 'Pedido Online',
                    amount: order.total,
                    description: `Pedido Online - Cliente: ${order.client_name}`,
                    date: new Date().toISOString().split('T')[0],
                    status: 'PAID',
                    client_id: order.client_id || null,
                    payment_method: 'CASH', // Default for pickup, can be improved later
                    items: order.product_order_items.map(i => ({
                        type: 'PRODUCT',
                        id: i.product_id,
                        name: i.product_name,
                        price: i.unit_price,
                        quantity: i.quantity
                    }))
                },
                orderId: order.id,
                inventoryItems: order.product_order_items.map(i => ({
                    id: i.product_id,
                    quantity: i.quantity
                }))
            });
            addToast('Pedido e Venda concluídos!', 'success');
        }
      } else if (newStatus === OrderStatus.CANCELLED) {
        addToast('Pedido cancelado.', 'warning');
        addNotification({
          title: 'Pedido Cancelado',
          message: `O pedido de ${order?.client_name} foi cancelado.`,
          type: 'danger'
        });
      }

      setIsDetailModalOpen(false);
    } catch (err: any) {
      addToast('Erro ao atualizar status.', 'error');
    }
  };

  const openOrderDetail = (order: DBOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
      const matchesSearch = (o.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (o.client_phone?.includes(searchTerm) || false);
      return matchesStatus && matchesSearch;
    });
  }, [orders, filterStatus, searchTerm]);

  const pendingCount = orders.filter(o => o.status === OrderStatus.PENDING).length;
  const readyCount = orders.filter(o => o.status === OrderStatus.READY).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingBag className="text-emerald-500 shrink-0" /> Pedidos de Produtos
          </h1>
          <p className="text-slate-400">Gerencie as reservas de produtos feitas pelos clientes.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{pendingCount}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Pendentes</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 text-sky-500 rounded-lg">
              <Package size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{readyCount}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Separados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">
                {orders.filter(o => o.status === OrderStatus.COMPLETED).length}
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Retirados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">
                R$ {orders.filter(o => o.status === OrderStatus.COMPLETED).reduce((acc, o) => acc + (o.total || 0), 0).toFixed(0)}
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Vendido</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-slate-900/40">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              icon={<Search size={18} />}
              placeholder="Buscar por cliente ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer text-sm"
              >
                <option value="all">Todos os Status</option>
                <option value={OrderStatus.PENDING}>Pendente</option>
                <option value={OrderStatus.READY}>Separado</option>
                <option value={OrderStatus.COMPLETED}>Retirado</option>
                <option value={OrderStatus.CANCELLED}>Cancelado</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Alert for pending orders */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-medium">
            Você tem <strong>{pendingCount} pedido(s)</strong> aguardando separação!
          </p>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingBag size={48} className="text-slate-800 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-500">Nenhum pedido encontrado</h3>
            <p className="text-sm text-slate-600 mt-1">Os pedidos feitos pelo catálogo público aparecerão aqui.</p>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card
              key={order.id}
              className={`p-4 hover:border-slate-700 transition-all cursor-pointer group ${order.status === OrderStatus.PENDING ? 'border-l-4 border-l-amber-500' :
                order.status === OrderStatus.READY ? 'border-l-4 border-l-sky-500' :
                  order.status === OrderStatus.COMPLETED ? 'border-l-4 border-l-emerald-500 opacity-70' :
                    'border-l-4 border-l-red-500 opacity-50'
                }`}
              onClick={() => openOrderDetail(order)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left - Client Info */}
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${order.status === OrderStatus.PENDING ? 'bg-amber-500/10 text-amber-500' :
                    order.status === OrderStatus.READY ? 'bg-sky-500/10 text-sky-500' :
                      order.status === OrderStatus.COMPLETED ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-red-500/10 text-red-500'
                    }`}>
                    {getStatusIcon(order.status || '')}
                  </div>
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                      {order.client_name}
                      <Badge variant={getStatusBadgeVariant(order.status || '')} className="text-[10px]">
                        {order.status ? OrderStatusLabels[order.status as OrderStatus] : ''}
                      </Badge>
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone size={12} />
                        {order.client_phone}
                      </span>
                      <span className="text-slate-800">•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center - Items Summary */}
                <div className="flex-1 px-4 hidden md:block">
                  <p className="text-sm text-slate-400">
                    {order.product_order_items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                  </p>
                </div>

                {/* Right - Total & Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-black text-white">R$ {order.total?.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest">{order.product_order_items.length} item(s)</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.status === OrderStatus.PENDING && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, OrderStatus.READY); }}
                        className="h-10 px-3 text-xs"
                      >
                        <Package size={16} /> Separar
                      </Button>
                    )}
                    {order.status === OrderStatus.READY && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, OrderStatus.COMPLETED); }}
                        className="h-10 px-3 text-xs"
                      >
                        <CheckCircle2 size={16} /> Entregar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="p-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); openOrderDetail(order); }}
                    >
                      <Eye size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detalhes do Pedido"
        maxWidth="max-w-lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <Badge variant={getStatusBadgeVariant(selectedOrder.status || '')} className="text-sm px-3 py-1">
                {getStatusIcon(selectedOrder.status || '')}
                <span className="ml-1">{selectedOrder.status ? OrderStatusLabels[selectedOrder.status as OrderStatus] : ''}</span>
              </Badge>
              <span className="text-xs text-slate-500">{formatDate(selectedOrder.created_at)}</span>
            </div>

            {/* Client Info */}
            <Card className="p-4 bg-slate-900/50">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <UserIcon size={14} /> Dados do Cliente
              </h4>
              <div className="space-y-2">
                <p className="text-white font-bold">{selectedOrder.client_name}</p>
                <a
                  href={`https://wa.me/55${selectedOrder.client_phone?.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 text-sm"
                >
                  <Phone size={14} />
                  {selectedOrder.client_phone}
                  <ChevronRight size={14} />
                </a>
              </div>
            </Card>

            {/* Items List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Package size={14} /> Itens do Pedido
              </h4>
              <div className="space-y-2">
                {selectedOrder.product_order_items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                        <Package size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{item.product_name}</p>
                        <p className="text-xs text-slate-500">R$ {item.unit_price?.toFixed(2)} cada</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">x{item.quantity}</p>
                      <p className="text-xs text-emerald-500 font-bold">R$ {((item.unit_price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <span className="text-sm font-bold text-slate-300">Total do Pedido</span>
              <span className="text-2xl font-black text-emerald-500">R$ {selectedOrder.total?.toFixed(2)}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
              {selectedOrder.status === OrderStatus.PENDING && (
                <>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => handleUpdateStatus(selectedOrder.id, OrderStatus.CANCELLED)}
                  >
                    <XCircle size={18} /> Cancelar Pedido
                  </Button>
                  <Button
                    className="flex-[2]"
                    onClick={() => handleUpdateStatus(selectedOrder.id, OrderStatus.READY)}
                  >
                    <Package size={18} /> Marcar como Separado
                  </Button>
                </>
              )}
              {selectedOrder.status === OrderStatus.READY && (
                <>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => handleUpdateStatus(selectedOrder.id, OrderStatus.CANCELLED)}
                  >
                    <XCircle size={18} /> Cancelar
                  </Button>
                  <Button
                    className="flex-[2]"
                    onClick={() => handleUpdateStatus(selectedOrder.id, OrderStatus.COMPLETED)}
                  >
                    <CheckCircle2 size={18} /> Confirmar Retirada
                  </Button>
                </>
              )}
              {(selectedOrder.status === OrderStatus.COMPLETED || selectedOrder.status === OrderStatus.CANCELLED) && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Fechar
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;
