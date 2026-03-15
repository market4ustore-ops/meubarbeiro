
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Package, Trash2, Search, CreditCard, DollarSign, QrCode, Tag, CheckCircle2, ChevronRight } from 'lucide-react';
import { Modal, Button, Card, Input, Badge } from './UI';
import { Product, Appointment, CheckoutItem, Service } from '../types';
import { supabase, processSale } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ClientSelect } from './ClientSelect';
import { ClientModal } from './ClientModal';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | any;
  services: Service[];
  onComplete: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ 
  isOpen, 
  onClose, 
  appointment, 
  services,
  onComplete 
}) => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'items' | 'payment'>('items');
  
  // Checkout Items
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARD' | 'CASH'>('PIX');
  
  // Product Search
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Client Selection State
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');

  // Initialize from appointment
  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        const mainService = services.find(s => s.id === appointment.service_id);
        if (mainService) {
          setItems([{
            type: 'SERVICE',
            id: mainService.id,
            name: mainService.name,
            price: mainService.price,
            quantity: 1
          }]);
        }
        setSelectedClient({ id: appointment.client_id, name: appointment.client_name });
        setSelectedBarberId(appointment.barber_id || '');
      } else {
        setItems([]);
        setSelectedClient(null);
        setSelectedBarberId(profile?.id || '');
      }
      setStep('items');
      setDiscount(0);
      setPaymentMethod('PIX');
      setServiceSearchTerm('');
      setSearchTerm('');
    }
  }, [isOpen, appointment, services, profile?.id]);

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    try {
      setIsSearching(true);
      
      // Products
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .gt('stock', 0)
        .order('name');
      
      if (prods) setAllProducts(prods.map(p => ({
        id: p.id,
        name: p.name,
        category: '',
        price: p.price,
        stock: p.stock,
        minStock: p.min_stock,
        featured: false,
        image: p.image_url || '',
        has_variations: (p as any).has_variations || false
      })));

      // Barbers
      const { data: brbs } = await supabase
        .from('users')
        .select('id, name, commission_rate')
        .eq('tenant_id', profile.tenant_id)
        .in('role', ['BARBER', 'OWNER']);
      
      setBarbers(brbs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return allProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, allProducts]);

  const filteredServices = useMemo(() => {
    if (!serviceSearchTerm) return [];
    return services.filter(s => s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()));
  }, [serviceSearchTerm, services]);

  const addService = (service: Service) => {
    const existing = items.find(i => i.id === service.id && i.type === 'SERVICE');
    if (existing) {
       setItems(items.map(i => (i.id === service.id && i.type === 'SERVICE') ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
       setItems([...items, {
         type: 'SERVICE',
         id: service.id,
         name: service.name,
         price: service.price,
         quantity: 1
       }]);
    }
    setServiceSearchTerm('');
    addToast(`${service.name} adicionado!`, 'success');
  };

  const addProduct = (product: Product) => {
    const existing = items.find(i => i.id === product.id && i.type === 'PRODUCT');
    if (existing) {
      setItems(items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, {
        type: 'PRODUCT',
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }]);
    }
    setSearchTerm('');
    addToast(`${product.name} adicionado!`, 'success');
  };

  const removeItem = (id: string, type: string) => {
    setItems(items.filter(i => !(i.id === id && i.type === type)));
  };

  const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const handleFinish = async (forcedMethod?: 'PIX' | 'CARD' | 'CASH') => {
    if (!profile?.tenant_id) return;
    const finalMethod = forcedMethod || paymentMethod;
    if (!finalMethod && step === 'payment') {
      addToast('Selecione um método de pagamento.', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Calculate Commission
      const selectedBarber = barbers.find(b => b.id === (selectedBarberId || profile.id));
      const serviceTotal = items.filter(i => i.type === 'SERVICE').reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const commissionAmount = selectedBarber?.commission_rate ? (serviceTotal * selectedBarber.commission_rate) / 100 : 0;

      const transactionData = {
        tenant_id: profile.tenant_id,
        type: 'INCOME',
        category: 'Checkout PDV',
        amount: total,
        description: `PDV - Cliente: ${selectedClient?.name || 'Venda Avulsa'}`,
        date: new Date().toISOString().split('T')[0],
        status: 'PAID',
        client_id: selectedClient?.id || null,
        barber_id: selectedBarberId || profile.id,
        appointment_id: appointment?.id || null,
        payment_method: finalMethod,
        items: items,
        discount_amount: discount,
        commission_amount: commissionAmount
      };

      // Limpeza profunda para evitar estruturas circulares (como elementos DOM ou funções)
      const cleanTransactionData = JSON.parse(JSON.stringify(transactionData));
      const cleanInventoryItems = items
        .filter(i => i.type === 'PRODUCT')
        .map(i => ({ 
          id: i.id, 
          quantity: i.quantity 
        }));

      await processSale({
        transaction: cleanTransactionData,
        appointmentId: appointment?.id || null,
        inventoryItems: cleanInventoryItems
      });

      addToast('Venda finalizada com sucesso!', 'success');
      onComplete();
      onClose();
    } catch (err: any) {
      console.error(err);
      addToast('Erro ao finalizar venda.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finalizar Atendimento / PDV" maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* Client Selection (Only if no fixed appointment) */}
        {!appointment && (
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 space-y-4">
             <ClientSelect 
               tenantId={profile?.tenant_id || ''} 
               onSelect={(c) => setSelectedClient(c)} 
               selectedClientId={selectedClient?.id}
               onNewClient={() => setIsClientModalOpen(true)}
             />
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Profissional Reponsável</label>
                  <select 
                    value={selectedBarberId}
                    onChange={(e) => setSelectedBarberId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Selecione o Profissional</option>
                    {barbers.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
               </div>
             </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${step === 'items' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
            <ShoppingCart size={14} /> Itens
          </div>
          <ChevronRight size={16} className="text-slate-700" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${step === 'payment' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
            <CreditCard size={14} /> Pagamento
          </div>
        </div>

        {step === 'items' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Service Search */}
               <div className="relative">
                  <Input 
                    icon={<Tag size={18} />}
                    placeholder="Adicionar serviço (Corte...)" 
                    value={serviceSearchTerm}
                    onChange={e => setServiceSearchTerm(e.target.value)}
                    className="bg-slate-900 border-slate-800"
                  />
                  {filteredServices.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto no-scrollbar">
                      {filteredServices.map(s => (
                         <button
                           key={s.id}
                           onClick={() => addService(s)}
                           className="w-full flex items-center justify-between p-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0"
                         >
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                               <CheckCircle2 size={16} />
                             </div>
                             <div className="text-left">
                               <p className="text-sm font-bold text-slate-200">{s.name}</p>
                             </div>
                           </div>
                           <span className="text-sm font-black text-emerald-500">R$ {s.price.toFixed(2)}</span>
                         </button>
                      ))}
                    </div>
                  )}
               </div>

               {/* Product Search */}
               <div className="relative">
                  <Input 
                    icon={<Search size={18} />}
                    placeholder="Adicionar produto (Creme...)" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-slate-900 border-slate-800"
                  />
                  {filteredProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto no-scrollbar">
                      {filteredProducts.map(p => (
                         <button
                           key={p.id}
                           onClick={() => addProduct(p)}
                           className="w-full flex items-center justify-between p-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0"
                         >
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
                               <Package size={16} />
                             </div>
                             <div className="text-left">
                               <p className="text-sm font-bold text-slate-200">{p.name}</p>
                               <div className="flex items-center gap-2">
                                 <p className="text-[10px] text-slate-500">Estoque: {p.stock} unid.</p>
                                 {p.stock <= p.minStock && p.stock > 0 && (
                                   <Badge variant="warning" className="text-[8px] px-1 py-0 h-3">BAIXO</Badge>
                                 )}
                                 {p.stock <= 0 && (
                                   <Badge variant="danger" className="text-[8px] px-1 py-0 h-3 uppercase">Esgotado</Badge>
                                 )}
                               </div>
                             </div>
                           </div>
                           <span className="text-sm font-black text-sky-500">R$ {p.price.toFixed(2)}</span>
                         </button>
                      ))}
                    </div>
                  )}
               </div>
             </div>


             {/* Items List */}
             <div className="space-y-3">
               <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <ShoppingCart size={14} /> Carrinho
               </h4>
               <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                 {items.length === 0 ? (
                   <div className="py-10 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                     <p className="text-slate-500 italic text-sm">Nenhum item adicionado.</p>
                   </div>
                 ) : (
                   items.map((item, idx) => (
                     <Card key={`${item.type}-${item.id}`} className="p-3 bg-slate-900/60 border-slate-800/50 hover:border-slate-700 transition-all">
                       <div className="flex items-center justify-between gap-4">
                         <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'SERVICE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-sky-500/10 text-sky-500'}`}>
                             {item.type === 'SERVICE' ? <CheckCircle2 size={20} /> : <Package size={20} />}
                           </div>
                           <div>
                             <p className="text-sm font-bold text-white">{item.name}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                               <Badge variant={item.type === 'SERVICE' ? 'success' : 'info'} size="sm">
                                 {item.type === 'SERVICE' ? 'Serviço' : 'Produto'}
                               </Badge>
                               <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                 Qtd: {item.quantity}
                                 {item.type === 'PRODUCT' && allProducts.find(p => p.id === item.id) && (allProducts.find(p => p.id === item.id)!.stock < item.quantity) && (
                                   <span className="text-red-500 animate-pulse text-[8px] font-black uppercase">(Insuficiente)</span>
                                 )}
                               </span>
                             </div>
                           </div>
                         </div>
                         <div className="flex items-center gap-4">
                           <div className="text-right">
                             <p className="text-sm font-black text-white">R$ {(item.price * item.quantity).toFixed(2)}</p>
                             <p className="text-[10px] text-slate-500">unid: R$ {item.price.toFixed(2)}</p>
                           </div>
                           <button onClick={() => removeItem(item.id, item.type)} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                             <Trash2 size={16} />
                           </button>
                         </div>
                       </div>
                     </Card>
                   ))
                 )}
               </div>
             </div>

             {/* Footer Totals */}
             <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Tag size={16} />
                    <span className="text-sm font-bold">Desconto R$</span>
                  </div>
                  <input 
                    type="number" 
                    value={discount || ''} 
                    onChange={e => setDiscount(Number(e.target.value))}
                    className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-right text-sm font-bold text-white outline-none focus:border-red-500 transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <span className="text-sm font-black text-emerald-500 uppercase tracking-widest">Total a Pagar</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">R$ {total.toFixed(2)}</span>
                    {discount > 0 && <p className="text-[10px] text-emerald-500/70 line-through">Subtotal: R$ {subtotal.toFixed(2)}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1 h-12 font-bold border-amber-500/50 text-amber-500 hover:bg-amber-500/10" 
                    onClick={() => handleFinish('CASH')} 
                    disabled={items.length === 0 || loading}
                  >
                    <DollarSign size={18} className="mr-2" /> Caixa (Dinheiro)
                  </Button>
                  <Button className="flex-1 h-12 font-bold" onClick={() => setStep('payment')} disabled={items.length === 0}>
                    Outros <ChevronRight className="ml-2" size={18} />
                  </Button>
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               {[
                 { id: 'PIX', label: 'PIX', icon: <QrCode size={24} />, color: 'emerald' },
                 { id: 'CARD', label: 'Cartão', icon: <CreditCard size={24} />, color: 'sky' },
                 { id: 'CASH', label: 'Dinheiro', icon: <DollarSign size={24} />, color: 'amber' }
               ].map(m => (
                 <button
                   key={m.id}
                   onClick={() => setPaymentMethod(m.id as any)}
                   className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 ${paymentMethod === m.id ? `bg-${m.color}-500/10 border-${m.color}-500 border-opacity-100 shadow-lg shadow-${m.color}-500/10` : 'bg-slate-900 border-slate-800 border-opacity-50 hover:border-slate-700'}`}
                 >
                   <div className={`${paymentMethod === m.id ? `text-${m.color}-500` : 'text-slate-500'}`}>
                     {m.icon}
                   </div>
                   <span className={`text-sm font-black tracking-widest uppercase ${paymentMethod === m.id ? `text-white` : 'text-slate-500'}`}>{m.label}</span>
                 </button>
               ))}
            </div>

            <div className="p-6 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-4">
               <div className="flex justify-between items-center pb-4 border-b border-slate-800/50">
                 <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">Resumo Final</span>
                 <Badge variant="success">PAGAMENTO NO BALCÃO</Badge>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Subtotal</span>
                   <span className="text-slate-200 font-bold">R$ {subtotal.toFixed(2)}</span>
                 </div>
                 {discount > 0 && (
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-400">Desconto</span>
                     <span className="text-red-500 font-bold">- R$ {discount.toFixed(2)}</span>
                   </div>
                 )}
                 <div className="flex justify-between items-end pt-2">
                   <span className="text-lg font-black text-white uppercase tracking-tighter">Total</span>
                   <span className="text-3xl font-black text-emerald-500">R$ {total.toFixed(2)}</span>
                 </div>
               </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1 h-12 font-bold" onClick={() => setStep('items')}>Voltar</Button>
              <Button className="flex-[2] h-12 font-bold" onClick={() => handleFinish()} disabled={loading}>
                {loading ? 'Finalizando...' : 'Concluir Venda'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ClientModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={(c) => {
          setSelectedClient(c);
          setIsClientModalOpen(false);
        }}
        editingClient={null}
        loading={false}
        barbers={barbers}
      />
    </Modal>
  );
};
