import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper para obter tenant por slug (público)
export async function getTenantBySlug(slug: string) {
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single()

    if (error) throw error
    return data
}

// Helper para obter serviços de um tenant (público)
export async function getServicesByTenant(tenantId: string) {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('name')

    if (error) throw error
    return data
}

// Helper para obter produtos de um tenant (público)
export async function getProductsByTenant(tenantId: string) {
    const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, color)')
        .eq('tenant_id', tenantId)
        .gt('stock', 0)
        .order('name')

    if (error) throw error
    return data
}

// Helper para obter horários de funcionamento de um tenant (público)
export async function getOpeningHoursByTenant(tenantId: string) {
    const { data, error } = await supabase
        .from('opening_hours')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('id')

    if (error) throw error
    return data
}

// Helper para garantir que um cliente existe no tenant (busca por telefone ou cria)
export async function ensureClient(tenantId: string, name: string, phone: string) {
    // 1. Tenta buscar cliente existente pelo telefone no tenant
    const { data: existingClient, error: searchError } = await supabase
        .from('clients' as any)
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('phone', phone)
        .maybeSingle();

    if (existingClient) return (existingClient as any).id;

    // 2. Se não existir, cria um novo
    const { data: newClient, error: createError } = await supabase
        .from('clients' as any)
        .insert({
            tenant_id: tenantId,
            name,
            phone,
            notes: 'Cadastrado automaticamente via agendamento online.'
        })
        .select('id')
        .single();

    if (createError) {
        console.error('Error ensuring client:', createError);
        return null;
    }

    return (newClient as any).id;
}

// Helper para criar um agendamento (público)
export async function createAppointment(appointment: {
    tenant_id: string
    service_id: string
    service_ids?: string[]
    total_duration?: number
    barber_id?: string
    client_name: string
    client_phone: string
    date: string
    time: string
    notes?: string
}) {
    // Garantir vínculo com o CRM de Clientes
    const clientId = await ensureClient(appointment.tenant_id, appointment.client_name, appointment.client_phone);

    const { data, error } = await supabase
        .from('appointments')
        .insert({
            tenant_id: appointment.tenant_id,
            service_id: appointment.service_id,
            service_ids: appointment.service_ids || [appointment.service_id],
            total_duration: appointment.total_duration || 30,
            barber_id: appointment.barber_id || null,
            client_id: clientId, // Novo campo
            client_name: appointment.client_name,
            client_phone: appointment.client_phone,
            date: appointment.date,
            time: appointment.time,
            notes: appointment.notes
        } as any)
        .select()
        .single()

    if (error) throw error
    return data
}

// Helper para buscar agendamentos de um dia (novo)
export async function getAppointmentsByDate(tenantId: string, date: string) {
    const { data, error } = await supabase
        .rpc('get_appointments_for_date', {
            p_tenant_id: tenantId,
            p_date: date
        })

    if (error) throw error
    return data
}

// Helper para criar um pedido de produtos (público)
export async function createProductOrder(order: {
    tenant_id: string
    client_name: string
    client_phone: string
    total: number
    items: Array<{
        product_id: string
        product_name: string
        quantity: number
        unit_price: number
    }>
}) {
    // Garantir vínculo com o CRM de Clientes
    const clientId = await ensureClient(order.tenant_id, order.client_name, order.client_phone);

    const { data, error } = await supabase.rpc('create_product_order', {
        p_tenant_id: order.tenant_id,
        p_client_name: order.client_name,
        p_client_phone: order.client_phone,
        p_total: order.total,
        p_items: order.items,
        p_client_id: clientId // Novo parâmetro
    } as any);

    if (error) throw error
    return data
}

// Helper para buscar pedidos de um tenant (admin)
export async function getOrdersByTenant(tenantId: string) {
    const { data, error } = await supabase
        .from('product_orders')
        .select('*, product_order_items(*)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

// Helper para atualizar status de um pedido (admin)
export async function updateOrderStatus(orderId: string, status: Database["public"]["Enums"]["order_status"]) {
    const { data, error } = await supabase
        .from('product_orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single()

    if (error) throw error
    return data
}

// Helper para estatísticas do dashboard (admin)
export async function getDashboardStats(tenantId: string, userId?: string, userRole?: string) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()

    // Início do mês atual
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    // Início de 7 dias atrás para o gráfico
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(now.getDate() - 6)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const isBarber = userRole === 'BARBER';

    // Query builder helpers to apply filters conditionally
    const applyBarberFilter = (query: any) => {
        if (isBarber && userId) {
            return query.eq('barber_id', userId);
        }
        return query;
    };

    // Total de serviços hoje
    let servicesTodayQuery = supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('date', today);

    servicesTodayQuery = applyBarberFilter(servicesTodayQuery);
    const { count: servicesToday, error: err1 } = await servicesTodayQuery;

    // Revenue calculation from financial_transactions (the source of truth)
    const { data: financialDataRaw } = await supabase
        .from('financial_transactions' as any)
        .select('amount, type, date, description')
        .eq('tenant_id', tenantId)
        .gte('date', startOfMonth);

    const financialData = (financialDataRaw || []) as any[];

    const totalRevenue = financialData.reduce((acc: number, curr: any) => acc + (curr.type === 'REVENUE' || curr.type === 'INCOME' ? curr.amount : 0), 0);
    const serviceRevenue = financialData.reduce((acc: number, curr: any) => acc + ((curr.type === 'REVENUE' || curr.type === 'INCOME') && !curr.description?.includes('Pedido Online') ? curr.amount : 0), 0);
    const productRevenue = financialData.reduce((acc: number, curr: any) => acc + ((curr.type === 'REVENUE' || curr.type === 'INCOME') && curr.description?.includes('Pedido Online') ? curr.amount : 0), 0);

    // Próximos agendamentos (hoje)
    const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    let upcomingQuery = supabase
        .from('appointments')
        .select('*, services(*)')
        .eq('tenant_id', tenantId)
        .eq('date', today)
        .gte('time', currentTime)
        .neq('status', 'CANCELLED')
        .order('time')
        .limit(5);

    upcomingQuery = applyBarberFilter(upcomingQuery);
    const { data: upcoming, error: err3 } = await upcomingQuery;

    // Dados para o gráfico semanal (últimos 7 dias)
    let weeklyServicesQuery = supabase
        .from('appointments')
        .select('date, services(price)')
        .eq('tenant_id', tenantId)
        .eq('status', 'COMPLETED')
        .gte('date', sevenDaysAgoStr);

    weeklyServicesQuery = applyBarberFilter(weeklyServicesQuery);

    // Weekly chart data from financial_transactions
    const { data: weeklyFinancialsRaw } = await supabase
        .from('financial_transactions' as any)
        .select('date, amount, type')
        .eq('tenant_id', tenantId)
        .gte('date', sevenDaysAgoStr);

    const weeklyFinancials = (weeklyFinancialsRaw || []) as any[];

    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const chartData = []

    for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(now.getDate() - (6 - i))
        const dateStr = d.toISOString().split('T')[0]
        const dayName = dayLabels[d.getDay()]

        const dayRevenue = weeklyFinancials
            .filter(tx => tx.date === dateStr && (tx.type === 'REVENUE' || tx.type === 'INCOME'))
            .reduce((acc, curr: any) => acc + curr.amount, 0);

        chartData.push({ name: dayName, total: dayRevenue })
    }

    // Produtos com estoque baixo (Tenant wide)
    const { data: allProducts, error: err4 } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)

    const lowStock = allProducts?.filter((p: any) => p.stock <= (p.min_stock || 0)).slice(0, 5) || []

    // Clientes ativos (Total de clientes no CRM)
    let activeClientsCount = 0;
    if (isBarber && userId) {
        // Para barbeiro: Clientes vinculados diretamente OU que já agendaram com ele
        const { data: barberClients, error: errClients } = await supabase
            .from('clients' as any)
            .select('id', { count: 'exact', head: true })
            .or(`id.in.(select client_id from client_barbers where barber_id.eq.${userId}),id.in.(select client_id from appointments where barber_id.eq.${userId})`);
        
        // Infelizmente o .or() com subqueries no Supabase JS não é tão direto.
        // Vamos usar uma abordagem mais robusta:
        const [linkedResult, appointedResult] = await Promise.all([
            supabase.from('client_barbers' as any).select('client_id').eq('barber_id', userId),
            supabase.from('appointments' as any).select('client_id').eq('barber_id', userId).not('client_id', 'is', null)
        ]);

        const uniqueClientIds = new Set([
            ...((linkedResult.data as any[])?.map(l => l.client_id) || []),
            ...((appointedResult.data as any[])?.map(a => a.client_id) || [])
        ]);
        activeClientsCount = uniqueClientIds.size;
    } else {
        // Para owner: Total de clientes no tenant
        const { count, error: errClients } = await supabase
            .from('clients' as any)
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
        activeClientsCount = count || 0;
    }

    // Novos pedidos (Pendentes) - Notificações (Tenant wide)
    const { data: pendingOrders, error: errOrders } = await supabase
        .from('product_orders')
        .select('id, client_name, total, created_at, product_order_items(product_name, quantity)')
        .eq('tenant_id', tenantId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(5)

    // Novos agendamentos (Pendentes) - Notificações
    let pendingAppointmentsQuery = supabase
        .from('appointments')
        .select('id, client_name, date, time, services(name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'PENDING')
        .gte('date', today) // Apenas futuros ou hoje
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(5);

    pendingAppointmentsQuery = applyBarberFilter(pendingAppointmentsQuery);
    const { data: pendingAppointments, error: errAppts } = await pendingAppointmentsQuery;

    return {
        servicesToday: servicesToday || 0,
        totalRevenue,
        serviceRevenue,
        productRevenue,
        upcoming: (upcoming || []) as any[],
        lowStock,
        activeClientsCount,
        chartData,
        pendingOrders: (pendingOrders || []) as any[],
        pendingAppointments: (pendingAppointments || []) as any[]
    }
}

// ============================================
// Financial / Management Helpers
// ============================================

export async function getFinancialStats(tenantId: string, startDate?: string, endDate?: string) {
    let query = supabase
        .from('financial_transactions' as any)
        .select('*')
        .eq('tenant_id', tenantId);

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;

    if (error) throw error;

    const transactions = data as any[];
    const incomes = transactions.filter(t => t.type === 'INCOME');
    const expenses = transactions.filter(t => t.type === 'EXPENSE');

    const grossRevenue = incomes.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalCommissions = incomes.reduce((sum, t) => sum + Number(t.commission_amount || 0), 0);
    
    const netProfit = grossRevenue - totalExpenses - totalCommissions;
    
    // Unique clients in income
    const uniqueClients = new Set(incomes.map(t => t.client_id).filter(Boolean));
    const averageTicket = uniqueClients.size > 0 ? grossRevenue / uniqueClients.size : 0;

    return {
        grossRevenue,
        totalExpenses,
        totalCommissions,
        netProfit,
        averageTicket,
        transactionCount: transactions.length
    };
}

export async function getFinancialTransactions(tenantId: string, options?: { limit?: number, type?: string, startDate?: string, endDate?: string }) {
    let query = supabase
        .from('financial_transactions' as any)
        .select(`
            *,
            clients(name),
            users(name)
        `)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

    if (options?.limit) query = query.limit(options.limit);
    if (options?.type) query = query.eq('type', options.type);
    if (options?.startDate) query = query.gte('date', options.startDate);
    if (options?.endDate) query = query.lte('date', options.endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function upsertFinancialTransaction(transaction: any) {
    // Ensure all numeric types are handled
    const payload = {
        ...transaction,
        amount: Number(transaction.amount),
        commission_amount: Number(transaction.commission_amount || 0)
    };

    const { data, error } = await supabase
        .from('financial_transactions' as any)
        .upsert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteFinancialTransaction(id: string) {
    const { error } = await supabase
        .from('financial_transactions' as any)
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Helper robusto para processar uma venda (PDV ou Pedido)
export async function processSale(data: {
    transaction: any,
    appointmentId?: string | null,
    orderId?: string | null,
    inventoryItems: Array<{ id: string, quantity: number }>
}) {
    // 1. Criar transação financeira
    const { data: tx, error: txError } = await supabase
        .from('financial_transactions' as any)
        .insert(data.transaction)
        .select()
        .single();

    if (txError) throw txError;

    // 2. Se houver agendamento, marcar como concluído
    if (data.appointmentId) {
        const { error: aptError } = await supabase
            .from('appointments')
            .update({ status: 'COMPLETED' })
            .eq('id', data.appointmentId);
        
        if (aptError) console.error("Appointment update error:", aptError);
    }

    // 3. Se houver pedido online, marcar como concluído
    if (data.orderId) {
        const { error: orderError } = await supabase
            .from('product_orders')
            .update({ status: 'COMPLETED' })
            .eq('id', data.orderId);
        
        if (orderError) console.error("Order update error:", orderError);
    }

    // 4. Baixa de estoque
    for (const item of data.inventoryItems) {
        // Buscamos o estoque atual para garantir precisão (decremento atômico seria melhor via RPC, mas vamos manter o padrão por enquanto)
        const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.id)
            .single();

        if (product) {
            await supabase
                .from('products')
                .update({ stock: (product.stock || 0) - item.quantity })
                .eq('id', item.id);
        }
    }

    return tx;
}
