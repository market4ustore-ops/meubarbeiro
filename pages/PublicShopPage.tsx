import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Scissors,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Calendar,
  ChevronRight,
  Instagram,
  Facebook,
  Share2,
  CheckCircle2,
  User as UserIcon,
  ChevronLeft,
  ShoppingBag,
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { Card, Button, Badge, Modal, Input } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import {
  getTenantBySlug,
  getServicesByTenant,
  getProductsByTenant,
  getOpeningHoursByTenant,
  createAppointment,
  createProductOrder,
  getAppointmentsByDate
} from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Service = Database['public']['Tables']['services']['Row'];
type Product = Database['public']['Tables']['products']['Row'] & { categories: { name: string, color: string | null } | null };
type Tenant = Database['public']['Tables']['tenants']['Row'];
type OpeningHour = Database['public']['Tables']['opening_hours']['Row'];
type BarberSchedule = Database['public']['Tables']['barber_schedules']['Row'];
type BarberService = Database['public']['Tables']['barber_services']['Row'];

const PublicShopPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addToast } = useToast();

  // Dados do Supabase
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [barberSchedules, setBarberSchedules] = useState<BarberSchedule[]>([]);
  const [barberServices, setBarberServices] = useState<BarberService[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Estados do Agendamento
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);

  // Estados do Catálogo de Produtos
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogStep, setCatalogStep] = useState(1);
  const [cart, setCart] = useState<{ product: Product; quantity: number; selectedVariations?: Record<string, string>; finalPrice?: number }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedGalleryIdx, setSelectedGalleryIdx] = useState(0);
  const [productGallery, setProductGallery] = useState<string[]>([]);
  const [productVariations, setProductVariations] = useState<any[]>([]);
  const [selectedVariationOptions, setSelectedVariationOptions] = useState<Record<string, string>>({});

  // Comum
  const [loading, setLoading] = useState(false);
  const [hasBookedInSession, setHasBookedInSession] = useState(false);
  const [hasOrderedInSession, setHasOrderedInSession] = useState(false);

  // Seleções do Cliente
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientData, setClientData] = useState({ name: '', phone: '' });

  const [selectedProductCategory, setSelectedProductCategory] = useState<string | null>(null);

  // Derivar categorias únicas do catálogo
  const productCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.categories?.name) cats.add(p.categories.name);
    });
    return Array.from(cats);
  }, [products]);

  // Produtos filtrados
  const filteredProducts = useMemo(() => {
    if (!selectedProductCategory) return products;
    return products.filter(p => p.categories?.name === selectedProductCategory);
  }, [products, selectedProductCategory]);

  // Itens em Destaque
  const featuredServices = useMemo(() => services.filter(s => (s as any).featured), [services]);
  const featuredProducts = useMemo(() => products.filter(p => (p as any).featured), [products]);

  // Filter Barbers based on Specialties
  const availableBarbers = useMemo(() => {
    if (selectedServices.length === 0) return barbers;

    return barbers.filter(barber => {
      // Check if barber has ANY specialties defined
      const barberSpecialties = barberServices.filter(bs => bs.user_id === barber.id);

      // If no specialties defined, assume generalist (available for all)
      if (barberSpecialties.length === 0) return true;

      // If specialties defined, MUST have all selected services
      return selectedServices.every(service =>
        barberSpecialties.some(bs => bs.service_id === service.id)
      );
    });
  }, [barbers, selectedServices, barberServices]);

  useEffect(() => {
    if (slug) {
      loadShopData();
    }
  }, [slug]);

  useEffect(() => {
    if (tenant && selectedDate) {
      loadExistingAppointments();
    }
  }, [selectedDate, tenant]);

  const loadShopData = async () => {
    try {
      setPageLoading(true);
      const tenantData = await getTenantBySlug(slug!);
      setTenant(tenantData);

      const [servicesData, productsData, hoursData, barbersData, schedulesData, barberServicesData] = await Promise.all([
        getServicesByTenant(tenantData.id),
        getProductsByTenant(tenantData.id),
        getOpeningHoursByTenant(tenantData.id),
        supabase.from('users').select('*').eq('tenant_id', tenantData.id).in('role', ['BARBER', 'OWNER']).eq('status', 'ONLINE'),
        supabase.from('barber_schedules').select('*').eq('tenant_id', tenantData.id),
        supabase.from('barber_services').select('*').eq('tenant_id', tenantData.id)
      ]);

      if (barbersData.error) throw barbersData.error;

      setServices(servicesData);
      setProducts(productsData as any);
      const sortedHours = (hoursData || []).sort((a, b) => {
        const daysOrder = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
        return daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
      });
      setOpeningHours(sortedHours);
      setBarbers(barbersData.data || []);
      setBarberSchedules(schedulesData.data || []);
      setBarberServices(barberServicesData.data || []);
    } catch (err: any) {
      console.error('Error loading shop data:', err);
      setPageError(err.message || 'Barbearia não encontrada.');
    } finally {
      setPageLoading(false);
    }
  };

  const loadExistingAppointments = async () => {
    if (!tenant || !selectedDate) return;
    try {
      const data = await getAppointmentsByDate(tenant.id, selectedDate);
      setExistingAppointments(data || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
    }
  };

  const handleShare = () => {
    if (!tenant) return;
    if (navigator.share) {
      navigator.share({
        title: tenant.name,
        text: tenant.description || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast('Link da barbearia copiado!', 'info');
    }
  };

  const handleOpenMaps = () => {
    if (!tenant) return;
    const address = [
      tenant.street,
      tenant.number,
      tenant.neighborhood,
      tenant.city,
      tenant.state,
      tenant.zip
    ].filter(Boolean).join(', ');

    if (!address) {
      addToast('Endereço não configurado.', 'warning');
      return;
    }

    const encodeSearch = encodeURIComponent(`${tenant.name}, ${address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeSearch}`, '_blank');
  };

  // Funções de Agendamento
  const startBooking = (service?: Service) => {
    if (service) {
      setSelectedServices([service]);
    } else {
      setSelectedServices([]);
    }
    setIsBookingModalOpen(true);
    setBookingStep(1);
  };

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const isSelected = prev.find(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  const totalBookingPrice = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + s.price, 0);
  }, [selectedServices]);

  const totalBookingDuration = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + s.duration, 0);
  }, [selectedServices]);

  // Styling helpers
  const primaryColor = tenant?.primary_color || '#10b981';

  // Funções de Carrinho/Catálogo
  const openProductDetail = async (product: Product) => {
    setSelectedProduct(product);
    setSelectedGalleryIdx(0);
    setSelectedVariationOptions({});

    // Fetch images for this product
    const db = supabase as any;
    const { data: imgs } = await db.from('product_images').select('url, position').eq('product_id', product.id).order('position');
    const imageUrls: string[] = imgs && imgs.length > 0
      ? imgs.map((i: any) => i.url)
      : [(product as any).image_url || (product as any).image || ''];
    setProductGallery(imageUrls.filter(Boolean));

    // Fetch variations
    const { data: vtypes } = await db.from('product_variation_types').select('*, product_variation_options(*)').eq('product_id', product.id);
    setProductVariations(vtypes || []);
  };

  const getVariationPriceModifier = () => {
    let total = 0;
    for (const vtype of productVariations) {
      const selectedOptId = selectedVariationOptions[vtype.id];
      if (selectedOptId) {
        const opt = (vtype.product_variation_options || []).find((o: any) => o.id === selectedOptId);
        if (opt) total += opt.price_modifier || 0;
      }
    }
    return total;
  };

  const handleAddToCartFromDetail = () => {
    if (!selectedProduct) return;
    const modifier = getVariationPriceModifier();
    const finalPrice = selectedProduct.price + modifier;
    const productWithPrice = { ...selectedProduct, price: finalPrice };
    setCart(prev => {
      const existing = prev.find(item => item.product.id === selectedProduct.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === selectedProduct.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product: productWithPrice as any, quantity: 1, selectedVariations: selectedVariationOptions }];
    });
    addToast(`${selectedProduct.name} adicionado ao carrinho`, 'success');
    setSelectedProduct(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };


  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [cart]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSendWhatsApp = (type: 'booking' | 'order' | 'both') => {
    if (!tenant || !tenant.phone) {
      addToast('Telefone da barbearia não encontrado.', 'error');
      return;
    }

    const shopName = tenant.name;
    const emojiUser = '\uD83D\uDC64';
    const emojiPhone = '\uD83D\uDCDE';
    const emojiScissors = '\u2702\uFE0F';
    const emojiCalendar = '\uD83D\uDCC5';
    const emojiClock = '\u23F0';
    const emojiBarber = '\uD83E\uDDD4';
    const emojiBag = '\uD83D\uDECD\uFE0F';
    const emojiMoney = '\uD83D\uDCB0';
    const emojiCheck = '\u2705';

    const lines: string[] = [];
    const isBoth = type === 'both' || (hasBookedInSession && hasOrderedInSession);

    if (isBoth) {
      lines.push(`*${emojiCheck} Resumo Geral - ${shopName}*`);
    } else if (type === 'booking') {
      lines.push(`*${emojiScissors} Novo Agendamento - ${shopName}*`);
    } else {
      lines.push(`*${emojiBag} Novo Pedido de Produtos - ${shopName}*`);
    }

    lines.push('');
    lines.push(`${emojiUser} *Cliente:* ${clientData.name}`);
    lines.push(`${emojiPhone} *WhatsApp:* ${clientData.phone}`);
    lines.push('');

    if (isBoth || type === 'booking') {
      const servicesNames = selectedServices.map(s => s.name).join(', ');
      const dateStr = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR');
      const barberName = selectedBarber?.name || 'A definir';

      lines.push(`*DADOS DO AGENDAMENTO*`);
      lines.push(`${emojiScissors} *Serviços:* ${servicesNames}`);
      lines.push(`${emojiCalendar} *Data:* ${dateStr}`);
      lines.push(`${emojiClock} *Horário:* ${selectedTime}`);
      lines.push(`${emojiBarber} *Barbeiro:* ${barberName}`);
      lines.push('');
    }

    if (isBoth || type === 'order') {
      lines.push(`*DADOS DO PEDIDO*`);
      cart.forEach(item => {
        lines.push(`• ${item.quantity}x ${item.product.name} (R$ ${(item.product.price * item.quantity).toFixed(2)})`);
      });
      lines.push('');
    }

    const totalVal = (isBoth || type === 'booking' ? totalBookingPrice : 0) + (isBoth || type === 'order' ? cartTotal : 0);
    lines.push(`${emojiMoney} *Total Geral:* R$ ${totalVal.toFixed(2)}`);
    lines.push('');
    lines.push(`_Enviado via sistema meuBarbeiro (manual)_`);

    const message = lines.join('\n');
    let cleanPhone = tenant.phone.replace(/\D/g, '');
    if (cleanPhone.length <= 11 && cleanPhone.length > 0) {
      cleanPhone = `55${cleanPhone}`;
    }

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setLoading(true);
    try {
      await createProductOrder({
        tenant_id: tenant.id,
        client_name: clientData.name,
        client_phone: clientData.phone,
        total: cartTotal,
        items: cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price
        }))
      });

      setHasOrderedInSession(true);

      if (tenant.scheduling_enabled && !hasBookedInSession) {
        setCatalogStep(3.5); // Sugestão de agendamento
      } else {
        setCatalogStep(4); // Sucesso direto
      }
    } catch (err: any) {
      addToast('Erro ao criar pedido. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || selectedServices.length === 0) return;

    setLoading(true);
    try {
      await createAppointment({
        tenant_id: tenant.id,
        service_id: selectedServices[0].id, // Mantemos o primeiro como principal por compatibilidade
        service_ids: selectedServices.map(s => s.id),
        total_duration: totalBookingDuration,
        client_name: clientData.name,
        client_phone: clientData.phone,
        date: selectedDate,
        time: selectedTime,
        barber_id: selectedBarber?.id
      });

      setHasBookedInSession(true);

      if (tenant.digital_card_enabled && !hasOrderedInSession) {
        setBookingStep(4.5); // Sugestão de produtos
      } else {
        setBookingStep(5); // Sucesso direto
      }
    } catch (err: any) {
      addToast('Erro ao agendar. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const availableTimes = useMemo(() => {
    if (!openingHours || openingHours.length === 0) return [];

    const now = new Date();
    const todayString = now.toISOString().split('T')[0];
    const durationNeeded = totalBookingDuration;

    // Pegar o dia da semana atual em português
    const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dateToEvaluate = selectedDate ? new Date(selectedDate + 'T12:00:00') : now;
    const dayName = daysOfWeek[dateToEvaluate.getDay()];

    const todayHours = openingHours.find(h => h.day === dayName);
    if (!todayHours || !todayHours.is_open || !todayHours.open_time || !todayHours.close_time) return [];

    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const startDayMins = timeToMinutes(todayHours.open_time);
    const endDayMins = timeToMinutes(todayHours.close_time);

    // Override with Barber Schedule if selected
    let effectiveStart = startDayMins;
    let effectiveEnd = endDayMins;
    let lunchStartMins = -1;
    let lunchEndMins = -1;

    if (selectedBarber) {
      const barberSchedule = barberSchedules.find(s => s.user_id === selectedBarber.id && s.day === dayName);
      if (barberSchedule) {
        if (!barberSchedule.is_working) return []; // Barber not working today
        effectiveStart = timeToMinutes(barberSchedule.start_time);
        effectiveEnd = timeToMinutes(barberSchedule.end_time);

        if (barberSchedule.lunch_start && barberSchedule.lunch_end) {
          lunchStartMins = timeToMinutes(barberSchedule.lunch_start);
          lunchEndMins = timeToMinutes(barberSchedule.lunch_end);
        }
      }
    }

    const slots = [];
    for (let m = effectiveStart; m <= effectiveEnd - durationNeeded; m += 30) {
      // Check Lunch Break
      if (lunchStartMins !== -1 && lunchEndMins !== -1) {
        // If slot start is in lunch OR slot end is in lunch
        // Simple check: start < lunchEnd AND end > lunchStart
        if (m < lunchEndMins && (m + durationNeeded) > lunchStartMins) continue;
      }
      const hour = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

      // 1. Horário passado
      if (selectedDate === todayString) {
        const currentMins = now.getHours() * 60 + now.getMinutes();
        if (m <= currentMins) continue;
      }

      // 2. Colisão
      const hasCollision = existingAppointments.some(apt => {
        const aptStart = timeToMinutes(apt.time);
        const aptEnd = aptStart + (apt.total_duration || 30);
        return (m < aptEnd && (m + durationNeeded) > aptStart);
      });

      if (!hasCollision) {
        slots.push(timeStr);
      }
    }

    return slots;
  }, [selectedDate, totalBookingDuration, existingAppointments, openingHours]);

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 animate-pulse">Carregando barbearia...</p>
        </div>
      </div>
    );
  }

  if (pageError || !tenant) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-6 border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Oops!</h2>
          <p className="text-slate-400">{pageError || 'Não conseguimos encontrar esta barbearia.'}</p>
          <Button onClick={() => window.location.reload()} variant="secondary">Tentar Novamente</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans">
      {/* Banner / Header */}
      <div className="relative h-48 sm:h-64 bg-slate-900 overflow-hidden">
        <img
          src={tenant.banner_url || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop"}
          className="w-full h-full object-cover opacity-40"
          alt="Barber Shop"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>

        <button
          onClick={handleShare}
          className="absolute top-4 right-4 p-2 bg-slate-950/50 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-slate-900 transition-all z-20"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Profile Section */}
      <div className="max-w-2xl mx-auto px-6 -mt-16 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-3xl bg-slate-900 border-4 border-slate-950 shadow-2xl overflow-hidden mb-4">
            <img src={tenant.logo_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt={tenant.name} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">{tenant.name}</h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-md">
            {tenant.description}
          </p>

          <div className="flex gap-4 mt-6">
            {tenant.instagram_url && (
              <a href={tenant.instagram_url} target="_blank" rel="noreferrer" className="p-3 bg-slate-900/50 text-slate-400 rounded-2xl border border-slate-800 hover:text-emerald-500 hover:border-emerald-500/50 transition-all" style={{ '--hover-color': primaryColor } as any}>
                <Instagram size={20} />
              </a>
            )}
            <a href={`https://wa.me/${tenant.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-3 bg-slate-900/50 text-slate-400 rounded-2xl border border-slate-800 hover:text-emerald-500 hover:border-emerald-500/50 transition-all" style={{ '--hover-color': primaryColor } as any}>
              <MessageCircle size={20} />
            </a>
            {tenant.facebook_url && (
              <a href={tenant.facebook_url} target="_blank" rel="noreferrer" className="p-3 bg-slate-900/50 text-slate-400 rounded-2xl border border-slate-800 hover:text-emerald-500 hover:border-emerald-500/50 transition-all" style={{ '--hover-color': primaryColor } as any}>
                <Facebook size={20} />
              </a>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {tenant.scheduling_enabled && (
            <Button
              onClick={() => startBooking()}
              className="flex-1 h-14 text-lg shadow-xl shadow-emerald-600/20 gap-3 group rounded-2xl border-none"
              style={{ backgroundColor: primaryColor }}
            >
              <Calendar size={22} />
              Agendar Agora
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
          {tenant.digital_card_enabled && (
            <Button
              onClick={() => setIsCatalogModalOpen(true)}
              variant="secondary"
              className="flex-1 h-14 text-lg gap-3 rounded-2xl border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              <ShoppingBag size={22} />
              Nossos Produtos
            </Button>
          )}
        </div>

        {((tenant.scheduling_enabled && featuredServices.length > 0) || (tenant.digital_card_enabled && featuredProducts.length > 0)) && (
          <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp size={20} style={{ color: primaryColor }} /> Destaques
              </h2>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
              {tenant.scheduling_enabled && featuredServices.map(service => (
                <div
                  key={`feat-svc-${service.id}`}
                  onClick={() => startBooking(service)}
                  className="min-w-[280px] bg-slate-900/40 border border-slate-800 rounded-3xl p-5 hover:border-emerald-500/30 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Scissors size={64} />
                  </div>
                  <Badge variant="success" className="mb-3 bg-emerald-500/10 text-emerald-500 border-none px-2 py-0.5 text-[10px]">SERVIÇO</Badge>
                  <h4 className="text-lg font-black text-white group-hover:text-emerald-500 transition-colors uppercase leading-tight">{service.name}</h4>
                  <p className="text-xl font-black mt-2">R$ {service.price.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium italic">{service.duration} min</p>
                </div>
              ))}

              {tenant.digital_card_enabled && featuredProducts.map(product => (
                <div
                  key={`feat-prod-${product.id}`}
                  onClick={() => { setIsCatalogModalOpen(true); }}
                  className="min-w-[280px] bg-slate-900/40 border border-slate-800 rounded-3xl p-5 hover:border-sky-500/30 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Package size={64} />
                  </div>
                  <Badge variant="info" className="mb-3 bg-sky-500/10 text-sky-500 border-none px-2 py-0.5 text-[10px]">PRODUTO</Badge>
                  <h4 className="text-lg font-black text-white group-hover:text-sky-500 transition-colors uppercase leading-tight">{product.name}</h4>
                  <p className="text-xl font-black mt-2">R$ {product.price.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium italic">{product.categories?.name || 'Geral'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Scissors size={20} style={{ color: primaryColor }} /> Nossos Serviços
            </h2>
            <Badge variant="secondary" className="bg-slate-900 text-slate-400 border-slate-800">{services.length} Opções</Badge>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {services.map(service => (
              <Card
                key={service.id}
                className="overflow-hidden bg-slate-900/30 border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col sm:flex-row gap-4"
                onClick={() => startBooking(service)}
                style={{ '--hover-border': primaryColor } as any}
              >
                {service.image_url && (
                  <div className="w-full sm:w-24 h-24 shrink-0">
                    <img src={service.image_url} className="w-full h-full object-cover" alt={service.name} />
                  </div>
                )}
                <div className="p-4 flex-1 flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-100 group-hover:text-emerald-500 transition-colors uppercase tracking-tight" style={{ '--hover-text': primaryColor } as any}>{service.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1"><Clock size={12} /> {service.duration} min</span>
                      <span className="text-slate-800">•</span>
                      <span>{service.category || 'Serviço'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white">R$ {service.price.toFixed(2)}</p>
                    <button className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: primaryColor }}>
                      Selecionar
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Grid */}
        <div className="mt-12 grid grid-cols-1 gap-4">
          <Card className="p-5 border-slate-800 bg-slate-900/20">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <MapPin size={14} /> Localização
            </h3>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <p className="text-white font-bold">
                  {(tenant.street || tenant.number)
                    ? `${tenant.street || ''}${tenant.number ? `, ${tenant.number}` : ''}`
                    : 'Endereço não informado'}
                </p>
                <p className="text-xs text-slate-500">
                  {tenant.neighborhood ? `${tenant.neighborhood}, ` : ''}
                  {tenant.city || ''}
                  {tenant.state ? ` - ${tenant.state}` : ''}
                  {!tenant.city && !tenant.state && !tenant.neighborhood && 'Cidade não informada'}
                </p>
              </div>
              <Button
                onClick={handleOpenMaps}
                variant="secondary"
                className="px-4 py-2 text-xs bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl"
              >
                Abrir no Maps
              </Button>
            </div>
          </Card>

          <Card className="p-5 border-slate-800 bg-slate-900/20">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Clock size={14} /> Horários
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {openingHours.length > 0 ? openingHours.map(hour => (
                <div key={hour.id} className="flex justify-between items-center text-xs">
                  <span className={`${hour.is_open ? 'text-slate-400 font-medium' : 'text-slate-700'}`}>{hour.day}</span>
                  {hour.is_open ? (
                    <span className="font-bold text-slate-200">{hour.open_time?.substring(0, 5)} — {hour.close_time?.substring(0, 5)}</span>
                  ) : (
                    <span className="font-bold text-red-500/30 uppercase tracking-widest text-[10px]">Fechado</span>
                  )}
                </div>
              )) : (
                <p className="text-slate-600 text-[10px] uppercase font-bold">Nenhum horário cadastrado</p>
              )}
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-full border border-slate-800">
            <img src="/logo.png" alt="Logomarca Meu Barbeiro" className="h-4 w-auto grayscale opacity-70" />
            <span className="font-black text-[10px] text-slate-500 uppercase tracking-widest">Powered by MeuBarbeiro</span>
          </div>
          <p className="text-[10px] text-slate-700 uppercase tracking-widest font-medium">
            © 2024 {tenant.name}
          </p>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/${tenant.phone?.replace(/\D/g, '')}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce z-40 border-4 border-slate-950"
        style={{ backgroundColor: primaryColor, boxShadow: `0 25px 50px -12px ${primaryColor}66` }}
      >
        <Phone size={24} />
      </a>

      {/* MODAL DE AGENDAMENTO (MULTI-STEP) */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title={bookingStep === 5 ? "" : "Agendamento Online"}
        maxWidth="max-w-md"
      >
        <div className="relative">
          {bookingStep < 5 && (
            <div className="mb-6 flex justify-between items-center px-1">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-1.5 rounded-full transition-all ${bookingStep >= s ? '' : 'bg-slate-800'}`}
                    style={bookingStep >= s ? { backgroundColor: primaryColor } : {}}
                  />
                </div>
              ))}
            </div>
          )}

          {bookingStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-bold text-white">Escolha os serviços</h4>
                {selectedServices.length > 0 && (
                  <Badge className="border-none text-white" style={{ backgroundColor: primaryColor }}>{selectedServices.length} selecionados</Badge>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                {services.map(s => {
                  const isSelected = selectedServices.find(item => item.id === s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleService(s)}
                      className={`p-4 text-left rounded-xl border-2 transition-all flex justify-between items-center ${isSelected ? 'bg-white/5' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
                      style={isSelected ? { borderColor: primaryColor } : {}}
                    >
                      <div>
                        <p className={`font-bold transition-colors`} style={isSelected ? { color: primaryColor } : { color: 'white' }}>{s.name}</p>
                        <p className="text-xs text-slate-500">{s.duration} min • R$ {s.price.toFixed(2)}</p>
                      </div>
                      {isSelected ? <CheckCircle2 style={{ color: primaryColor }} size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-800" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Tempo Total</p>
                    <p className="text-white font-bold">{totalBookingDuration} minutos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Valor Total</p>
                    <p className="text-xl font-black" style={{ color: primaryColor }}>R$ {totalBookingPrice.toFixed(2)}</p>
                  </div>
                </div>
                <Button
                  className="w-full h-12"
                  disabled={selectedServices.length === 0}
                  onClick={() => setBookingStep(2)}
                  style={{ backgroundColor: primaryColor }}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {bookingStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setBookingStep(1)} className="p-1 hover:bg-slate-800 rounded-lg" style={{ color: primaryColor }}><ChevronLeft size={20} /></button>
                <h4 className="text-lg font-bold text-white">Com quem prefere?</h4>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto no-scrollbar">
                {availableBarbers.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setSelectedBarber(b); setBookingStep(3); }}
                    className={`p-4 text-left rounded-xl border-2 transition-all flex justify-between items-center ${selectedBarber?.id === b.id ? 'bg-white/5' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
                    style={selectedBarber?.id === b.id ? { borderColor: primaryColor } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                        {b.avatar_url ? <img src={b.avatar_url} className="w-full h-full object-cover" /> : <UserIcon size={20} className="m-2.5 text-slate-500" />}
                      </div>
                      <div>
                        <p className="font-bold text-white">{b.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{b.role === 'OWNER' ? 'Proprietário' : 'Especialista'}</p>
                      </div>
                    </div>
                    {selectedBarber?.id === b.id && <CheckCircle2 style={{ color: primaryColor }} size={20} />}
                  </button>
                ))}
                <Button variant="ghost" onClick={() => { setSelectedBarber(null); setBookingStep(3); }} className="w-full mt-2">Qualquer Profissional</Button>
              </div>
            </div>
          )}

          {bookingStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setBookingStep(2)} className="p-1 hover:bg-slate-800 rounded-lg" style={{ color: primaryColor }}><ChevronLeft size={20} /></button>
                <h4 className="text-lg font-bold text-white">Qual o melhor horário?</h4>
              </div>
              <p className="text-xs text-slate-500 italic">Mostrando apenas horários com {totalBookingDuration}min livres.</p>
              <div className="space-y-4">
                <Input
                  type="date"
                  label="Data"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                {selectedDate && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Horários Disponíveis</label>
                    {availableTimes.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {availableTimes.map(t => (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className={`py-2 px-3 rounded-lg border text-sm font-bold transition-all ${selectedTime === t ? 'text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                            style={selectedTime === t ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center space-y-2">
                        <Clock size={24} className="mx-auto text-slate-600" />
                        <p className="text-sm text-slate-400">Infelizmente não há horários disponíveis para {totalBookingDuration}min nesta data.</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-tight">Por favor, selecione outra data ou menos serviços.</p>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  className="w-full mt-4 h-12"
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => {
                    if (clientData.name && clientData.phone) {
                      handleConfirmBooking(new Event('submit') as any);
                    } else {
                      setBookingStep(4);
                    }
                  }}
                  style={{ backgroundColor: primaryColor }}
                >
                  Confirmar Data e Hora
                </Button>
              </div>
            </div>
          )}

          {bookingStep === 4 && (
            <form onSubmit={handleConfirmBooking} className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setBookingStep(3)} className="p-1 hover:bg-slate-800 rounded-lg" style={{ color: primaryColor }}><ChevronLeft size={20} /></button>
                <h4 className="text-lg font-bold text-white">Quase lá! Só seus dados.</h4>
              </div>
              <div className="space-y-3">
                <Input label="Seu Nome" placeholder="Ex: Carlos Alberto" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} required />
                <Input
                  label="Celular / WhatsApp"
                  placeholder="(00) 00000-0000"
                  value={clientData.phone}
                  onChange={e => setClientData({ ...clientData, phone: formatPhone(e.target.value) })}
                  maxLength={15}
                  required
                />
              </div>
              <Card className="p-4 bg-slate-900/50 space-y-3" style={{ borderColor: `${primaryColor}33` }}>
                <div className="space-y-1">
                  {selectedServices.map(s => (
                    <p key={s.id} className="text-xs text-slate-400 flex justify-between">
                      {s.name} <span>R$ {s.price.toFixed(2)}</span>
                    </p>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <p className="text-sm text-slate-200">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')} às {selectedTime}
                    <br /><span className="text-[10px] text-slate-500">{totalBookingDuration} min totais</span>
                  </p>
                  <p className="text-lg font-black" style={{ color: primaryColor }}>R$ {totalBookingPrice.toFixed(2)}</p>
                </div>
              </Card>
              <Button type="submit" className="w-full h-14 text-lg font-bold" isLoading={loading} style={{ backgroundColor: primaryColor }}>Finalizar Agendamento</Button>
            </form>
          )}

          {bookingStep === 4.5 && (
            <div className="text-center py-10 space-y-6 animate-in zoom-in">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2" style={{ backgroundColor: `${primaryColor}1A`, borderColor: `${primaryColor}4D`, color: primaryColor }}>
                <ShoppingBag size={48} />
              </div>
              <h2 className="text-2xl font-black text-white">Agendamento Realizado!</h2>
              <p className="text-slate-400 text-sm">Antes de terminar, <strong>{clientData.name}</strong>, você gostaria de aproveitar e adicionar algum produto ao seu pedido?</p>
              <div className="space-y-3 pt-4">
                <Button className="w-full h-14 gap-2 text-white" onClick={() => { setIsBookingModalOpen(false); setIsCatalogModalOpen(true); setCatalogStep(1); }} style={{ backgroundColor: primaryColor }}>
                  <Plus size={20} /> Ver Catálogo de Produtos
                </Button>
                <Button variant="ghost" className="w-full h-12 text-slate-500 hover:text-white font-bold" onClick={() => setBookingStep(5)}>
                  Não, obrigado. Concluir.
                </Button>
              </div>
            </div>
          )}

          {bookingStep === 5 && (
            <div className="text-center py-10 space-y-6 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border-2" style={{ color: primaryColor, borderColor: `${primaryColor}4D` }}>
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-2xl font-black text-white">Agendado com Sucesso!</h2>
              <p className="text-slate-400 text-sm">Tudo certo, <strong>{clientData.name}</strong>! Salve este horário na sua agenda.</p>
              <div className="space-y-3 pt-4">
                <Button className="w-full h-14 gap-2 text-white" onClick={() => handleSendWhatsApp(hasOrderedInSession ? 'both' : 'booking')} style={{ backgroundColor: primaryColor }}>
                  <MessageCircle size={20} /> {hasOrderedInSession ? 'Enviar resumo (Serviços + Produtos)' : 'Enviar comprovante via WhatsApp'}
                </Button>
                <Button variant="ghost" className="w-full h-12 text-slate-400 hover:text-white" onClick={() => setIsBookingModalOpen(false)}>
                  Entendido, obrigado!
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL DE CATÁLOGO (MULTI-STEP) */}
      <Modal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        title={catalogStep === 4 ? "" : "Catálogo de Produtos"}
        maxWidth="max-w-2xl"
      >
        <div className="relative">
          {catalogStep < 4 && (
            <div className="mb-6 flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg" style={{ color: primaryColor }}>
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Carrinho</p>
                  <p className="text-sm font-black text-white">{cart.length} itens • R$ {cartTotal.toFixed(2)}</p>
                </div>
              </div>
              {cart.length > 0 && catalogStep === 1 && (
                <Button onClick={() => setCatalogStep(2)} className="h-10 px-4 text-xs" style={{ backgroundColor: primaryColor }}>Ver Carrinho</Button>
              )}
            </div>
          )}

          {selectedProduct ? (
            /* ── Product detail view ── */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedProduct(null)} className="p-1 hover:bg-slate-800 rounded-lg" style={{ color: primaryColor }}>
                  <ChevronLeft size={20} />
                </button>
                <h4 className="text-base font-bold text-white line-clamp-1">{selectedProduct.name}</h4>
              </div>

              {/* Main image */}
              {productGallery.length > 0 && (
                <div className="rounded-2xl overflow-hidden aspect-square bg-slate-900 relative">
                  <img src={productGallery[selectedGalleryIdx]} className="w-full h-full object-cover" alt={selectedProduct.name} />
                  {productGallery.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                      {productGallery.map((_, idx) => (
                        <button key={idx} onClick={() => setSelectedGalleryIdx(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${idx === selectedGalleryIdx ? 'scale-125' : 'bg-white/30 hover:bg-white/60'}`}
                          style={idx === selectedGalleryIdx ? { backgroundColor: primaryColor } : {}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Thumbnail strip */}
              {productGallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {productGallery.map((url, idx) => (
                    <button key={idx} onClick={() => setSelectedGalleryIdx(idx)}
                      className={`w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${idx === selectedGalleryIdx ? '' : 'border-slate-800 opacity-50 hover:opacity-80'}`}
                      style={idx === selectedGalleryIdx ? { borderColor: primaryColor } : {}}
                    >
                      <img src={url} className="w-full h-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black" style={{ color: primaryColor }}>
                  R$ {(selectedProduct.price + getVariationPriceModifier()).toFixed(2)}
                </span>
                {getVariationPriceModifier() !== 0 && (
                  <span className="text-xs text-slate-500 line-through">R$ {selectedProduct.price.toFixed(2)}</span>
                )}
              </div>

              {/* Variation selectors */}
              {productVariations.map((vtype: any) => (
                <div key={vtype.id} className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{vtype.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {(vtype.product_variation_options || []).map((opt: any) => {
                      const isSelected = selectedVariationOptions[vtype.id] === opt.id;
                      return (
                        <button key={opt.id}
                          onClick={() => setSelectedVariationOptions(prev => ({ ...prev, [vtype.id]: isSelected ? '' : opt.id }))}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-all ${isSelected ? 'text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                          style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor, color: '#fff' } : {}}
                        >
                          {opt.name}{opt.price_modifier > 0 ? ` +R$${opt.price_modifier.toFixed(2)}` : opt.price_modifier < 0 ? ` -R$${Math.abs(opt.price_modifier).toFixed(2)}` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <Button onClick={handleAddToCartFromDetail} className="w-full h-12 gap-2 text-white" style={{ backgroundColor: primaryColor }}>
                <Plus size={16} /> Adicionar ao Carrinho
              </Button>
            </div>
          ) : (
            /* ── Product grid ── */
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                <button
                  onClick={() => setSelectedProductCategory(null)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${!selectedProductCategory ? 'bg-white text-slate-950 border-white' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'}`}
                  style={!selectedProductCategory ? { backgroundColor: primaryColor, borderColor: primaryColor, color: '#fff' } : {}}
                >
                  TODOS
                </button>
                {productCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedProductCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedProductCategory === cat ? 'bg-white text-slate-950 border-white' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'}`}
                    style={selectedProductCategory === cat ? { backgroundColor: primaryColor, borderColor: primaryColor, color: '#fff' } : {}}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 max-h-[500px] overflow-y-auto no-scrollbar pr-2 pb-4">
                {filteredProducts.map(product => (
                  <Card key={product.id} className="bg-slate-900 border-slate-800 overflow-hidden flex flex-col group cursor-pointer" onClick={() => openProductDetail(product)}>
                    <div className="aspect-square relative overflow-hidden">
                      <img src={(product as any).image_url || (product as any).image || 'https://via.placeholder.com/300'} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={product.name} />
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-black/50 backdrop-blur-md border-white/10">{(product as any).categories?.name || 'Geral'}</Badge>
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1 uppercase tracking-tight">{product.name}</h4>
                        <p className="text-lg font-black mt-1" style={{ color: primaryColor }}>R$ {product.price.toFixed(2)}</p>
                      </div>
                      <Button onClick={(e) => { e.stopPropagation(); openProductDetail(product); }} className="w-full h-9 text-xs gap-2" style={{ backgroundColor: primaryColor }}>
                        <Plus size={14} /> Ver Produto
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}


          {/* Step 2: Carrinho Detalhado */}
          {catalogStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setCatalogStep(1)} className="p-1 hover:bg-slate-800 rounded-lg" style={{ color: primaryColor }}><ChevronLeft size={20} /></button>
                <h4 className="text-lg font-bold text-white">Seu Carrinho</h4>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 italic">Seu carrinho está vazio.</div>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-4 p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <img src={item.product.image_url || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h5 className="font-bold text-sm text-white">{item.product.name}</h5>
                        <p className="text-xs font-black" style={{ color: primaryColor }}>R$ {item.product.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 text-slate-400 hover:text-white"><Minus size={16} /></button>
                        <span className="text-sm font-bold text-white w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 text-slate-400 hover:text-white"><Plus size={16} /></button>
                        <button onClick={() => updateQuantity(item.product.id, -item.quantity)} className="ml-2 p-1 text-red-500/50 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total</span>
                    <span className="text-2xl font-black text-white">R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full h-14 text-lg"
                    onClick={() => {
                      if (clientData.name && clientData.phone) {
                        handleConfirmOrder(new Event('submit') as any);
                      } else {
                        setCatalogStep(3);
                      }
                    }}
                    style={{ backgroundColor: primaryColor }}
                  >
                    Reservar Produtos
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Identificação */}
          {catalogStep === 3 && (
            <form onSubmit={handleConfirmOrder} className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setCatalogStep(2)} className="p-1 hover:bg-slate-800 rounded-lg" style={{ color: primaryColor }}><ChevronLeft size={20} /></button>
                <h4 className="text-lg font-bold text-white">Confirmar Reserva</h4>
              </div>
              <div className="space-y-3">
                <Input label="Seu Nome" placeholder="Ex: Carlos Alberto" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} required />
                <Input
                  label="Celular / WhatsApp"
                  placeholder="(00) 00000-0000"
                  value={clientData.phone}
                  onChange={e => setClientData({ ...clientData, phone: formatPhone(e.target.value) })}
                  maxLength={15}
                  required
                />
              </div>
              <Card className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Resumo do Pedido</p>
                <div className="space-y-1">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span className="text-slate-300">{item.quantity}x {item.product.name}</span>
                      <span className="text-white font-bold">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total</span>
                  <span className="text-lg font-black" style={{ color: primaryColor }}>R$ {cartTotal.toFixed(2)}</span>
                </div>
              </Card>
              <Button type="submit" className="w-full h-14 text-lg font-bold" isLoading={loading} style={{ backgroundColor: primaryColor }}>Confirmar Pedido</Button>
            </form>
          )}

          {catalogStep === 3.5 && (
            <div className="text-center py-10 space-y-6 animate-in zoom-in">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2" style={{ backgroundColor: `${primaryColor}1A`, borderColor: `${primaryColor}4D`, color: primaryColor }}>
                <Calendar size={48} />
              </div>
              <h2 className="text-2xl font-black text-white">Pedido Recebido!</h2>
              <p className="text-slate-400 text-sm">Tudo certo, <strong>{clientData.name}</strong>! Já separamos seus produtos. Gostaria de aproveitar e agendar um serviço agora?</p>
              <div className="space-y-3 pt-4">
                <Button className="w-full h-14 gap-2 text-white" onClick={() => { setIsCatalogModalOpen(false); setIsBookingModalOpen(true); setBookingStep(1); }} style={{ backgroundColor: primaryColor }}>
                  <Scissors size={20} /> Agendar um Serviço
                </Button>
                <Button variant="ghost" className="w-full h-12 text-slate-500 hover:text-white font-bold" onClick={() => setCatalogStep(4)}>
                  Não, obrigado. Concluir.
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Sucesso */}
          {catalogStep === 4 && (
            <div className="text-center py-10 space-y-6 animate-in zoom-in">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border-2" style={{ color: primaryColor, borderColor: `${primaryColor}4D` }}>
                <ShoppingBag size={48} />
              </div>
              <h2 className="text-2xl font-black text-white">Pedido Recebido!</h2>
              <p className="text-slate-400 text-sm">Olá <strong>{clientData.name}</strong>, separamos seus produtos. Você pode retirá-los em sua próxima visita!</p>
              <div className="space-y-3 pt-4">
                <Button className="w-full h-14 gap-2 text-white" onClick={() => handleSendWhatsApp(hasBookedInSession ? 'both' : 'order')} style={{ backgroundColor: primaryColor }}>
                  <MessageCircle size={20} /> {hasBookedInSession ? 'Enviar resumo (Serviços + Produtos)' : 'Enviar resumo via WhatsApp'}
                </Button>
                <Button variant="ghost" className="w-full h-12 text-slate-400 hover:text-white" onClick={() => setIsCatalogModalOpen(false)}>
                  Ótimo!
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PublicShopPage;
