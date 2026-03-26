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
    const cleanSlug = slug.trim();
    console.log('[Supabase] Buscando tenant por slug:', cleanSlug);
    
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', cleanSlug)
        .maybeSingle()

    if (error) {
        console.error('[Supabase] Erro ao buscar tenant:', error);
        throw error;
    }
    
    if (!data) {
        console.warn('[Supabase] Nenhum tenant encontrado para o slug:', cleanSlug);
    }

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
    try {
        // 1. Tenta buscar cliente existente pelo telefone no tenant
        const { data: results } = await (supabase
            .from('clients' as any)
            .select('id') as any)
            .eq('tenant_id', tenantId)
            .eq('phone', phone)
            .limit(1);

        if (results && results.length > 0) return results[0].id;

        // 2. Se não existir, cria um novo
        const { data: newClient, error: createError } = await (supabase
            .from('clients' as any)
            .insert({
                tenant_id: tenantId,
                name,
                phone,
                notes: 'Cadastrado automaticamente via agendamento online.'
            }) as any)
            .select('id')
            .single();

        if (createError) {
            console.error('Error ensuring client:', createError);
            return null;
        }

        return newClient.id;
    } catch (err) {
        console.error('Unexpected error in ensureClient:', err);
        return null;
    }
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

    const { data, error } = await (supabase
        .from('appointments' as any)
        .insert({
            tenant_id: appointment.tenant_id,
            service_id: appointment.service_id,
            service_ids: appointment.service_ids || [appointment.service_id],
            total_duration: appointment.total_duration || 30,
            barber_id: appointment.barber_id || null,
            client_id: clientId,
            client_name: appointment.client_name,
            client_phone: appointment.client_phone,
            date: appointment.date,
            time: appointment.time,
            notes: appointment.notes
        }) as any)
        .select()
        .single();

    if (error) throw error;

    // 3. Vincular cliente ao barbeiro se um barbeiro foi selecionado
    if (clientId && appointment.barber_id) {
        await (supabase
            .from('client_barbers' as any)
            .insert({
                client_id: clientId,
                barber_id: appointment.barber_id,
                tenant_id: appointment.tenant_id
            }) as any);
    }

    return data;
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
        p_client_id: clientId || ""
    });

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

    // Definir a data mais antiga necessária para as métricas (mês ou 7 dias atrás)
    const fetchStartDate = startOfMonth < sevenDaysAgoStr ? startOfMonth : sevenDaysAgoStr;

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
        .from('financial_transactions')
        .select('amount, type, date, description')
        .eq('tenant_id', tenantId)
        .gte('date', fetchStartDate);

    const financialData = financialDataRaw || [];

    const totalRevenue = financialData
        .filter(curr => curr.date >= startOfMonth)
        .reduce((acc: number, curr) => acc + (curr.type === 'REVENUE' || curr.type === 'INCOME' ? curr.amount : 0), 0);
    
    const serviceRevenue = financialData
        .filter(curr => curr.date >= startOfMonth)
        .reduce((acc: number, curr) => acc + ((curr.type === 'REVENUE' || curr.type === 'INCOME') && !curr.description?.includes('Pedido Online') ? curr.amount : 0), 0);
    
    const productRevenue = financialData
        .filter(curr => curr.date >= startOfMonth)
        .reduce((acc: number, curr) => acc + ((curr.type === 'REVENUE' || curr.type === 'INCOME') && curr.description?.includes('Pedido Online') ? curr.amount : 0), 0);

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
    const { data: upcoming } = await upcomingQuery;

    // Otimização: Gráfico semanal usa os mesmos dados já baixados
    const weeklyFinancials = financialData.filter(tx => tx.date >= sevenDaysAgoStr);

    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const chartData = []

    for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(now.getDate() - (6 - i))
        const dateStr = d.toISOString().split('T')[0]
        const dayName = dayLabels[d.getDay()]

        const dayRevenue = weeklyFinancials
            .filter(tx => tx.date === dateStr && (tx.type === 'REVENUE' || tx.type === 'INCOME'))
            .reduce((acc, curr) => acc + curr.amount, 0);

        chartData.push({ name: dayName, total: dayRevenue })
    }

    // Produtos com estoque baixo (Tenant wide)
    const { data: allProducts, error: err4 } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)

    const lowStock = allProducts?.filter(p => p.stock <= (p.min_stock || 0)).slice(0, 5) || []

    // Clientes ativos (Total de clientes no CRM)
    let activeClientsCount = 0;
    if (isBarber && userId) {
        // Para barbeiro: Clientes vinculados diretamente OU que já agendaram com ele
        const { data: barberClients } = await supabase
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .or(`id.in.(select client_id from client_barbers where barber_id.eq.${userId}),id.in.(select client_id from appointments where barber_id.eq.${userId})`);
        
        // Infelizmente o .or() com subqueries no Supabase JS não é tão direto.
        // Vamos usar uma abordagem mais robusta:
        const [linkedResult, appointedResult] = await Promise.all([
            supabase.from('client_barbers').select('client_id').eq('barber_id', userId),
            supabase.from('appointments').select('client_id').eq('barber_id', userId).not('client_id', 'is', null)
        ]);

        const uniqueClientIds = new Set([
            ...(linkedResult.data?.map(l => l.client_id) || []),
            ...(appointedResult.data?.map(a => a.client_id) || [])
        ]);
        activeClientsCount = uniqueClientIds.size;
    } else {
        // Para owner: Total de clientes no tenant
        const { count } = await supabase
            .from('clients')
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
        upcoming: upcoming || [],
        lowStock,
        activeClientsCount,
        chartData,
        pendingOrders: pendingOrders || [],
        pendingAppointments: pendingAppointments || []
    }
}

// ============================================
// Financial / Management Helpers
// ============================================

export async function getFinancialStats(tenantId: string, startDate?: string, endDate?: string) {
    let query = supabase
        .from('financial_transactions')
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
    
    // Ticket Médio = Faturamento Total / Número de Vendas
    const averageTicket = incomes.length > 0 ? grossRevenue / incomes.length : 0;

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
        .from('financial_transactions')
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
        .from('financial_transactions')
        .upsert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteFinancialTransaction(id: string) {
    const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Helper robusto para processar uma venda (PDV ou Pedido) via RPC atômico
export async function processSale(data: {
    transaction: any,
    appointmentId?: string | null,
    orderId?: string | null,
    inventoryItems: Array<{ id: string, quantity: number }>
}) {
    // Chamada ao RPC process_sale que lida com tudo em uma única transação no Postgres
    const { data: result, error } = await supabase.rpc('process_sale', {
        p_transaction: data.transaction,
        p_inventory_items: data.inventoryItems,
        p_appointment_id: data.appointmentId,
        p_order_id: data.orderId
    } as any);

    if (error) {
        console.error("Error processing sale via RPC:", error);
        throw error;
    }

    return result;
}
