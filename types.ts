import { Database } from './lib/database.types';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

export const AppointmentStatusLabels: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'AGUARDANDO',
  [AppointmentStatus.CONFIRMED]: 'CONFIRMADO',
  [AppointmentStatus.CANCELLED]: 'CANCELADO',
  [AppointmentStatus.COMPLETED]: 'CONCLUÍDO'
};

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

export interface Barber {
  id: string;
  name: string;
  username?: string;
  password?: string;
  avatar?: string;
  role: 'OWNER' | 'BARBER' | 'SUPER_ADMIN';
  status: 'ONLINE' | 'OFFLINE';
  id_db?: string;
  commission_rate?: number;
}

export interface BarberSchedule {
  id: string;
  tenant_id: string;
  user_id: string;
  day: string;
  is_working: boolean;
  start_time: string;
  end_time: string;
  lunch_start?: string;
  lunch_end?: string;
}

export interface BarberService {
  tenant_id: string;
  user_id: string;
  service_id: string;
}

export type Service = Tables<'services'>;
/*
export interface Service {
  id: string;
  name: string;
  category: 'CORTE' | 'BARBA' | 'COMBO' | 'OUTROS';
  duration: number; // in minutes
  price: number;
  promoPrice?: number;
  active: boolean;
  featured: boolean;
  description?: string;
}
*/

export type Product = Tables<'products'> & { 
  categories?: { name: string, color: string },
  has_variations?: boolean 
};
/*
export interface Product {
  id: string;
  name: string;
  category: string;
  category_id?: string;
  price: number;
  stock: number;
  minStock: number;
  featured: boolean;
  image: string;
  has_variations: boolean;
}
*/

export interface Appointment {
  id: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  barberId: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'danger';
}

export interface ShopSettings {
  name: string;
  slug: string;
  description: string;
  phone: string;
  email: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
  openingHours: {
    day: string;
    isOpen: boolean;
    open: string;
    close: string;
  }[];
  logo?: string;
  banner?: string;
  primaryColor: string;
  instagramUrl?: string;
  facebookUrl?: string;
  schedulingEnabled: boolean;
  digitalCardEnabled: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  barberShopName: string;
  slug: string;
  role: 'OWNER' | 'BARBER' | 'SUPER_ADMIN';
}

export interface SaaSBarberShop {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  email: string;
  phone: string;
  password?: string;
  plan: 'ESSENTIAL' | 'PROFESSIONAL' | 'PREMIUM';
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
  createdAt: string;
  monthlyRevenue: number;
}

export interface SaaSPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'MONTHLY' | 'YEARLY';
  description: string;
  maxBarbers: number | 'UNLIMITED';
  maxProducts: number | 'UNLIMITED';
  features: {
    whatsapp: boolean;
    inventory: boolean;
    reports: boolean;
    digitalCard: boolean;
    multiBranch: boolean;
  };
  status: 'ACTIVE' | 'ARCHIVED';
  isPopular?: boolean;
  activeSubscriptions: number;
}

// ============================================
// Subscription & Payment Types (Cakto Integration)
// ============================================

export type SubscriptionStatus = 'pending' | 'active' | 'cancelled' | 'expired';
export type PaymentStatus = 'approved' | 'refunded' | 'chargeback';
export type FeatureKey = 'whatsapp' | 'inventory' | 'reports' | 'digitalCard' | 'multiBranch';

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string | null;
  cakto_subscription_id?: string;
  cakto_customer_id?: string;
  cakto_product_id?: string;
  status: SubscriptionStatus;
  current_period_start?: string;
  current_period_end?: string;
  cancelled_at?: string;
  created_at?: string;
  updated_at?: string;
  // Joined data
  plan?: SaaSPlan;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  cakto_transaction_id: string;
  amount: number;
  status: PaymentStatus;
  payment_method?: string;
  paid_at?: string;
  created_at?: string;
}

export interface CaktoWebhookPayload {
  secret: string;
  event: 'purchase_approved' | 'subscription_renewed' | 'subscription_cancelled' | 'refund' | 'chargeback';
  data: {
    transaction_id: string;
    reference_id: string;
    customer: {
      name: string;
      email: string;
    };
    product?: {
      id: string;
      name: string;
    };
    subscription?: {
      id: string;
      due_date: string;
    };
    amount?: number;
    payment_method?: string;
  };
}

export interface PlanFeatures {
  whatsapp: boolean;
  inventory: boolean;
  reports: boolean;
  digitalCard: boolean;
  multiBranch: boolean;
}


export interface ClientAppointmentHistory {
  id: string;
  date: string;
  time: string;
  service_name: string;
  barber_name: string;
  status: string;
}

export type Client = Tables<'clients'> & {
  barbers?: { id: string; name: string }[];
  appointments?: ClientAppointmentHistory[];
};
/*
export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  barbers?: { id: string; name: string }[];
  appointments?: ClientAppointmentHistory[];
}
*/

export interface CheckoutItem {
  type: 'SERVICE' | 'PRODUCT';
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export type FinancialTransaction = Tables<'financial_transactions'>;
/*
export interface FinancialTransaction {
  id: string;
  tenant_id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  description: string | null;
  date: string;
  status: 'PAID' | 'PENDING';
  client_id?: string | null;
  barber_id?: string | null;
  appointment_id?: string | null;
  commission_amount?: number;
  payment_method?: 'PIX' | 'CARD' | 'CASH' | null;
  items?: CheckoutItem[] | null;
  discount_amount?: number | null;
}
*/
