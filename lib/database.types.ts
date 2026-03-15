export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

export interface Database {
    public: {
        Tables: {
            appointments: {
                Row: {
                    barber_id: string | null
                    client_name: string
                    client_phone: string
                    created_at: string | null
                    date: string
                    id: string
                    notes: string | null
                    service_id: string | null
                    service_ids: Json | null
                    status: Database["public"]["Enums"]["appointment_status"] | null
                    tenant_id: string | null
                    time: string
                    total_duration: number | null
                    client_id: string | null
                }
                Insert: {
                    barber_id?: string | null
                    client_name: string
                    client_phone: string
                    created_at?: string | null
                    date: string
                    id?: string
                    notes?: string | null
                    service_id?: string | null
                    service_ids?: Json | null
                    status?: Database["public"]["Enums"]["appointment_status"] | null
                    tenant_id?: string | null
                    time: string
                    total_duration?: number | null
                    client_id?: string | null
                }
                Update: {
                    barber_id?: string | null
                    client_name?: string
                    client_phone?: string
                    created_at?: string | null
                    date?: string
                    id?: string
                    notes?: string | null
                    service_id?: string | null
                    service_ids?: Json | null
                    status?: Database["public"]["Enums"]["appointment_status"] | null
                    tenant_id?: string | null
                    time?: string
                    total_duration?: number | null
                    client_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "appointments_barber_id_fkey"
                        columns: ["barber_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "appointments_service_id_fkey"
                        columns: ["service_id"]
                        isOneToOne: false
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "appointments_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            barber_schedules: {
                Row: {
                    created_at: string
                    day: string
                    end_time: string
                    id: string
                    is_working: boolean | null
                    lunch_end: string | null
                    lunch_start: string | null
                    start_time: string
                    tenant_id: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    day: string
                    end_time?: string
                    id?: string
                    is_working?: boolean | null
                    lunch_end?: string | null
                    lunch_start?: string | null
                    start_time?: string
                    tenant_id: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    day?: string
                    end_time?: string
                    id?: string
                    is_working?: boolean | null
                    lunch_end?: string | null
                    lunch_start?: string | null
                    start_time?: string
                    tenant_id?: string
                    updated_at?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "barber_schedules_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "barber_schedules_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            financial_transactions: {
                Row: {
                    amount: number
                    appointment_id: string | null
                    barber_id: string | null
                    category: string
                    client_id: string | null
                    commission_amount: number | null
                    created_at: string | null
                    date: string
                    description: string | null
                    id: string
                    status: string
                    tenant_id: string
                    type: string
                    updated_at: string | null
                    payment_method: string | null
                    items: any[] | null
                    discount_amount: number | null
                }
                Insert: {
                    amount: number
                    appointment_id?: string | null
                    barber_id?: string | null
                    category: string
                    client_id?: string | null
                    commission_amount?: number | null
                    created_at?: string | null
                    date?: string
                    description?: string | null
                    id?: string
                    status?: string
                    tenant_id: string
                    type: string
                    updated_at?: string | null
                }
                Update: {
                    amount?: number
                    appointment_id?: string | null
                    barber_id?: string | null
                    category?: string
                    client_id?: string | null
                    commission_amount?: number | null
                    created_at?: string | null
                    date?: string
                    description?: string | null
                    id?: string
                    status?: string
                    tenant_id?: string
                    type?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "financial_transactions_appointment_id_fkey"
                        columns: ["appointment_id"]
                        isOneToOne: false
                        referencedRelation: "appointments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "financial_transactions_barber_id_fkey"
                        columns: ["barber_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "financial_transactions_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "clients"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "financial_transactions_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    }
                ]
            }
            barber_services: {
                Row: {
                    created_at: string
                    service_id: string
                    tenant_id: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    service_id: string
                    tenant_id: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    service_id?: string
                    tenant_id?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "barber_services_service_id_fkey"
                        columns: ["service_id"]
                        isOneToOne: false
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "barber_services_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "barber_services_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            client_barbers: {
                Row: {
                    barber_id: string
                    client_id: string
                    created_at: string
                    tenant_id: string
                }
                Insert: {
                    barber_id: string
                    client_id: string
                    created_at?: string
                    tenant_id: string
                }
                Update: {
                    barber_id?: string
                    client_id?: string
                    created_at?: string
                    tenant_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "client_barbers_barber_id_fkey"
                        columns: ["barber_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "client_barbers_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "clients"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "client_barbers_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            clients: {
                Row: {
                    created_at: string | null
                    id: string
                    name: string
                    notes: string | null
                    phone: string
                    tenant_id: string
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    name: string
                    notes?: string | null
                    phone: string
                    tenant_id: string
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    name?: string
                    notes?: string | null
                    phone?: string
                    tenant_id?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "clients_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            categories: {
                Row: {
                    color: string | null
                    created_at: string | null
                    description: string | null
                    id: string
                    name: string
                    tenant_id: string | null
                }
                Insert: {
                    color?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    name: string
                    tenant_id?: string | null
                }
                Update: {
                    color?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    name?: string
                    tenant_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "categories_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            opening_hours: {
                Row: {
                    close_time: string | null
                    day: string
                    id: string
                    is_open: boolean | null
                    open_time: string | null
                    tenant_id: string | null
                }
                Insert: {
                    close_time?: string | null
                    day: string
                    id?: string
                    is_open?: boolean | null
                    open_time?: string | null
                    tenant_id?: string | null
                }
                Update: {
                    close_time?: string | null
                    day?: string
                    id?: string
                    is_open?: boolean | null
                    open_time?: string | null
                    tenant_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "opening_hours_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            product_order_items: {
                Row: {
                    id: string
                    order_id: string | null
                    product_id: string | null
                    product_name: string
                    quantity: number
                    unit_price: number
                }
                Insert: {
                    id?: string
                    order_id?: string | null
                    product_id?: string | null
                    product_name: string
                    quantity: number
                    unit_price: number
                }
                Update: {
                    id?: string
                    order_id?: string | null
                    product_id?: string | null
                    product_name?: string
                    quantity?: number
                    unit_price?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "product_order_items_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "product_orders"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "product_order_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            product_orders: {
                Row: {
                    client_name: string
                    client_phone: string
                    created_at: string | null
                    id: string
                    notes: string | null
                    status: Database["public"]["Enums"]["order_status"] | null
                    tenant_id: string | null
                    total: number
                }
                Insert: {
                    client_name: string
                    client_phone: string
                    created_at?: string | null
                    id?: string
                    notes?: string | null
                    status?: Database["public"]["Enums"]["order_status"] | null
                    tenant_id?: string | null
                    total: number
                }
                Update: {
                    client_name?: string
                    client_phone?: string
                    created_at?: string | null
                    id?: string
                    notes?: string | null
                    status?: Database["public"]["Enums"]["order_status"] | null
                    tenant_id?: string | null
                    total?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "product_orders_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            products: {
                Row: {
                    category_id: string | null
                    created_at: string | null
                    featured: boolean | null
                    id: string
                    image: string | null
                    image_url: string | null
                    min_stock: number | null
                    name: string
                    price: number
                    stock: number | null
                    tenant_id: string | null
                }
                Insert: {
                    category_id?: string | null
                    created_at?: string | null
                    featured?: boolean | null
                    id?: string
                    image?: string | null
                    image_url?: string | null
                    min_stock?: number | null
                    name: string
                    price: number
                    stock?: number | null
                    tenant_id?: string | null
                }
                Update: {
                    category_id?: string | null
                    created_at?: string | null
                    featured?: boolean | null
                    id?: string
                    image?: string | null
                    image_url?: string | null
                    min_stock?: number | null
                    name?: string
                    price?: number
                    stock?: number | null
                    tenant_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "products_category_id_fkey"
                        columns: ["category_id"]
                        isOneToOne: false
                        referencedRelation: "categories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "products_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            saas_plans: {
                Row: {
                    billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null
                    cakto_checkout_url: string | null
                    created_at: string | null
                    description: string | null
                    features: Json | null
                    id: string
                    is_popular: boolean | null
                    max_barbers: number | null
                    max_products: number | null
                    name: string
                    price: number
                    status: Database["public"]["Enums"]["plan_status"] | null
                    updated_at: string | null
                }
                Insert: {
                    billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
                    cakto_checkout_url?: string | null
                    created_at?: string | null
                    description?: string | null
                    features?: Json | null
                    id?: string
                    is_popular?: boolean | null
                    max_barbers?: number | null
                    max_products?: number | null
                    name: string
                    price: number
                    status?: Database["public"]["Enums"]["plan_status"] | null
                    updated_at?: string | null
                }
                Update: {
                    billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
                    cakto_checkout_url?: string | null
                    created_at?: string | null
                    description?: string | null
                    features?: Json | null
                    id?: string
                    is_popular?: boolean | null
                    max_barbers?: number | null
                    max_products?: number | null
                    name?: string
                    price?: number
                    status?: Database["public"]["Enums"]["plan_status"] | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            services: {
                Row: {
                    active: boolean | null
                    category: Database["public"]["Enums"]["service_category"] | null
                    created_at: string | null
                    description: string | null
                    duration: number
                    featured: boolean | null
                    id: string
                    image_url: string | null
                    name: string
                    price: number
                    promo_price: number | null
                    tenant_id: string | null
                }
                Insert: {
                    active?: boolean | null
                    category?: Database["public"]["Enums"]["service_category"] | null
                    created_at?: string | null
                    description?: string | null
                    duration: number
                    featured?: boolean | null
                    id?: string
                    image_url?: string | null
                    name: string
                    price: number
                    promo_price?: number | null
                    tenant_id?: string | null
                }
                Update: {
                    active?: boolean | null
                    category?: Database["public"]["Enums"]["service_category"] | null
                    created_at?: string | null
                    description?: string | null
                    duration?: number
                    featured?: boolean | null
                    id?: string
                    image_url?: string | null
                    name?: string
                    price?: number
                    promo_price?: number | null
                    tenant_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "services_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            subscription_payments: {
                Row: {
                    amount: number
                    cakto_transaction_id: string | null
                    created_at: string | null
                    id: string
                    paid_at: string | null
                    payment_method: string | null
                    status: Database["public"]["Enums"]["payment_status"]
                    subscription_id: string
                }
                Insert: {
                    amount: number
                    cakto_transaction_id?: string | null
                    created_at?: string | null
                    id?: string
                    paid_at?: string | null
                    payment_method?: string | null
                    status: Database["public"]["Enums"]["payment_status"]
                    subscription_id: string
                }
                Update: {
                    amount?: number
                    cakto_transaction_id?: string | null
                    created_at?: string | null
                    id?: string
                    paid_at?: string | null
                    payment_method?: string | null
                    status?: Database["public"]["Enums"]["payment_status"]
                    subscription_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "subscription_payments_subscription_id_fkey"
                        columns: ["subscription_id"]
                        isOneToOne: false
                        referencedRelation: "subscriptions"
                        referencedColumns: ["id"]
                    },
                ]
            }
            subscriptions: {
                Row: {
                    cakto_customer_id: string | null
                    cakto_product_id: string | null
                    cakto_subscription_id: string | null
                    cancelled_at: string | null
                    created_at: string | null
                    current_period_end: string | null
                    current_period_start: string | null
                    id: string
                    plan_id: string | null
                    status: Database["public"]["Enums"]["subscription_status"] | null
                    tenant_id: string
                    updated_at: string | null
                }
                Insert: {
                    cakto_customer_id?: string | null
                    cakto_product_id?: string | null
                    cakto_subscription_id?: string | null
                    cancelled_at?: string | null
                    created_at?: string | null
                    current_period_end?: string | null
                    current_period_start?: string | null
                    id?: string
                    plan_id?: string | null
                    status?: Database["public"]["Enums"]["subscription_status"] | null
                    tenant_id: string
                    updated_at?: string | null
                }
                Update: {
                    cakto_customer_id?: string | null
                    cakto_product_id?: string | null
                    cakto_subscription_id?: string | null
                    cancelled_at?: string | null
                    created_at?: string | null
                    current_period_end?: string | null
                    current_period_start?: string | null
                    id?: string
                    plan_id?: string | null
                    status?: Database["public"]["Enums"]["subscription_status"] | null
                    tenant_id?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "subscriptions_plan_id_fkey"
                        columns: ["plan_id"]
                        isOneToOne: false
                        referencedRelation: "saas_plans"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "subscriptions_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            tenants: {
                Row: {
                    banner_url: string | null
                    city: string | null
                    created_at: string | null
                    description: string | null
                    digital_card_enabled: boolean | null
                    email: string
                    facebook_url: string | null
                    id: string
                    instagram_url: string | null
                    logo: string | null
                    logo_url: string | null
                    name: string
                    neighborhood: string | null
                    number: string | null
                    phone: string | null
                    plan_id: string | null
                    primary_color: string | null
                    scheduling_enabled: boolean | null
                    slug: string
                    state: string | null
                    status: Database["public"]["Enums"]["tenant_status"] | null
                    street: string | null
                    trial_ends_at: string | null
                    updated_at: string | null
                    zip: string | null
                }
                Insert: {
                    banner_url?: string | null
                    city?: string | null
                    created_at?: string | null
                    description?: string | null
                    digital_card_enabled?: boolean | null
                    email: string
                    facebook_url?: string | null
                    id?: string
                    instagram_url?: string | null
                    logo?: string | null
                    logo_url?: string | null
                    name: string
                    neighborhood?: string | null
                    number?: string | null
                    phone?: string | null
                    plan_id?: string | null
                    primary_color?: string | null
                    scheduling_enabled?: boolean | null
                    slug: string
                    state?: string | null
                    status?: Database["public"]["Enums"]["tenant_status"] | null
                    street?: string | null
                    trial_ends_at?: string | null
                    updated_at?: string | null
                    zip?: string | null
                }
                Update: {
                    banner_url?: string | null
                    city?: string | null
                    created_at?: string | null
                    description?: string | null
                    digital_card_enabled?: boolean | null
                    email?: string
                    facebook_url?: string | null
                    id?: string
                    instagram_url?: string | null
                    logo?: string | null
                    logo_url?: string | null
                    name?: string
                    neighborhood?: string | null
                    number?: string | null
                    phone?: string | null
                    plan_id?: string | null
                    primary_color?: string | null
                    scheduling_enabled?: boolean | null
                    slug?: string
                    state?: string | null
                    status?: Database["public"]["Enums"]["tenant_status"] | null
                    street?: string | null
                    trial_ends_at?: string | null
                    updated_at?: string | null
                    zip?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "tenants_plan_id_fkey"
                        columns: ["plan_id"]
                        isOneToOne: false
                        referencedRelation: "saas_plans"
                        referencedColumns: ["id"]
                    },
                ]
            }
            users: {
                Row: {
                    avatar: string | null
                    created_at: string | null
                    email: string
                    id: string
                    name: string
                    phone: string | null
                    role: Database["public"]["Enums"]["user_role"] | null
                    status: Database["public"]["Enums"]["barber_status"] | null
                    tenant_id: string | null
                    updated_at: string | null
                    commission_rate: number | null
                }
                Insert: {
                    avatar?: string | null
                    created_at?: string | null
                    email: string
                    id: string
                    name: string
                    phone?: string | null
                    role?: Database["public"]["Enums"]["user_role"] | null
                    status?: Database["public"]["Enums"]["barber_status"] | null
                    tenant_id?: string | null
                    updated_at?: string | null
                }
                Update: {
                    avatar?: string | null
                    created_at?: string | null
                    email?: string
                    id?: string
                    name?: string
                    phone?: string | null
                    role?: Database["public"]["Enums"]["user_role"] | null
                    status?: Database["public"]["Enums"]["barber_status"] | null
                    tenant_id?: string | null
                    updated_at?: string | null
                    commission_rate?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "users_tenant_id_fkey"
                        columns: ["tenant_id"]
                        isOneToOne: false
                        referencedRelation: "tenants"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            create_product_order: {
                Args: {
                    p_tenant_id: string
                    p_client_name: string
                    p_client_phone: string
                    p_total: number
                    p_items: Json
                    p_client_id: string
                }
                Returns: Json
            }
            process_sale: {
                Args: {
                    p_transaction: Json
                    p_inventory_items: Json
                    p_appointment_id: string
                    p_order_id: string
                }
                Returns: Json
            }
            get_appointments_for_date: {
                Args: {
                    p_tenant_id: string
                    p_date: string
                }
                Returns: {
                    time: string
                    total_duration: number
                    status: Database["public"]["Enums"]["appointment_status"]
                }[]
            }
            get_user_role: {
                Args: Record<PropertyKey, never>
                Returns: Database["public"]["Enums"]["user_role"]
            }
            get_user_tenant_id: {
                Args: Record<PropertyKey, never>
                Returns: string
            }
            is_super_admin: {
                Args: Record<PropertyKey, never>
                Returns: boolean
            }
            register_new_tenant: {
                Args: {
                    p_owner_id: string
                    p_owner_name: string
                    p_owner_email: string
                    p_shop_name: string
                    p_shop_slug: string
                    p_shop_phone: string
                    p_plan_id: string
                }
                Returns: Json
            }
        }
        Enums: {
            appointment_status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
            barber_status: "ONLINE" | "OFFLINE"
            billing_cycle: "MONTHLY" | "YEARLY"
            order_status: "PENDING" | "READY" | "COMPLETED" | "CANCELLED"
            payment_status: "approved" | "refunded" | "chargeback"
            plan_status: "ACTIVE" | "ARCHIVED"
            service_category: "CORTE" | "BARBA" | "COMBO" | "OUTROS"
            subscription_status: "pending" | "active" | "cancelled" | "expired"
            tenant_status: "ACTIVE" | "TRIAL" | "SUSPENDED"
            user_role: "SUPER_ADMIN" | "OWNER" | "BARBER"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
