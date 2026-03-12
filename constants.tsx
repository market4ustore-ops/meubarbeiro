
import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Package,
  Tags,
  Users,
  CreditCard,
  Settings,
  ShieldCheck,
  Store,
  BarChart3,
  Globe,
  ShoppingBag,
  DollarSign,
  Zap
} from 'lucide-react';
import { Service, Product, Barber, Appointment, AppointmentStatus, Category, ShopSettings } from './types';

export const NAV_ITEMS = [
  { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/admin/dashboard' },
  { name: 'Atendimento', icon: <Zap className="w-5 h-5" />, path: '/admin/atendimento' },
  { name: 'Agenda', icon: <Calendar className="w-5 h-5" />, path: '/admin/agenda' },
  { name: 'Clientes', icon: <Users className="w-5 h-5" />, path: '/admin/clientes' },
  { name: 'Equipe', icon: <Users className="w-5 h-5" />, path: '/admin/equipe' },
  { name: 'Financeiro', icon: <DollarSign className="w-5 h-5" />, path: '/admin/financeiro' },
  { name: 'Serviços', icon: <Scissors className="w-5 h-5" />, path: '/admin/servicos' },
  { name: 'Produtos', icon: <Package className="w-5 h-5" />, path: '/admin/produtos' },
  { name: 'Categorias', icon: <Tags className="w-5 h-5" />, path: '/admin/categorias' },
  { name: 'Assinatura', icon: <CreditCard className="w-5 h-5" />, path: '/admin/assinatura' },
  { name: 'Configurações', icon: <Settings className="w-5 h-5" />, path: '/admin/configuracoes' },
];

export const SAAS_NAV_ITEMS = [
  { name: 'Visão Geral SaaS', icon: <BarChart3 className="w-5 h-5" />, path: '/saas/dashboard' },
  { name: 'Barbearias (Tenants)', icon: <Store className="w-5 h-5" />, path: '/saas/shops' },
  { name: 'Planos e Preços', icon: <CreditCard className="w-5 h-5" />, path: '/saas/plans' },
  { name: 'Configurações Globais', icon: <Globe className="w-5 h-5" />, path: '/saas/settings' },
];


export const MOCK_SETTINGS: ShopSettings = {
  name: 'Barber Shop Vintage',
  slug: 'barber-shop-vintage',
  description: 'A melhor experiência em barbearia clássica da região, com profissionais qualificados e ambiente acolhedor.',
  phone: '(11) 98888-7777',
  email: 'contato@barbervintage.com',
  address: {
    street: 'Av. Paulista',
    number: '1000',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    zip: '01310-100'
  },
  openingHours: [
    { day: 'Segunda', isOpen: false, open: '09:00', close: '18:00' },
    { day: 'Terça', isOpen: true, open: '09:00', close: '20:00' },
    { day: 'Quarta', isOpen: true, open: '09:00', close: '20:00' },
    { day: 'Quinta', isOpen: true, open: '09:00', close: '20:00' },
    { day: 'Sexta', isOpen: true, open: '09:00', close: '21:00' },
    { day: 'Sábado', isOpen: true, open: '08:00', close: '18:00' },
    { day: 'Domingo', isOpen: false, open: '09:00', close: '13:00' },
  ],
  logo: 'https://picsum.photos/seed/shop-logo/400',
  primaryColor: '#10b981',
  schedulingEnabled: true,
  digitalCardEnabled: true
};

export const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Pomada', description: 'Produtos para fixação e finalização', color: '#10b981' },
  { id: 'c2', name: 'Gel', description: 'Produtos de brilho e fixação úmida', color: '#0ea5e9' },
  { id: 'c3', name: 'Shampoo', description: 'Cuidado e limpeza diária', color: '#8b5cf6' },
  { id: 'c4', name: 'Acessórios', description: 'Pentes, escovas e outros', color: '#f59e0b' },
];

export const MOCK_SERVICES: Service[] = [
  { id: '1', name: 'Corte Degradê', category: 'CORTE', duration: 45, price: 50, active: true, featured: true },
  { id: '2', name: 'Barba Terapia', category: 'BARBA', duration: 30, price: 35, active: true, featured: false },
  { id: '3', name: 'Combo (Corte + Barba)', category: 'COMBO', duration: 75, price: 75, active: true, featured: true },
  { id: '4', name: 'Pigmentação', category: 'OUTROS', duration: 20, price: 20, active: true, featured: false },
];

export const MOCK_BARBERS: Barber[] = [
  { id: 'b1', name: 'Lucas "The Blade"', avatar: 'https://picsum.photos/seed/barber1/200', role: 'OWNER', status: 'ONLINE' },
  { id: 'b2', name: 'Renato Silva', avatar: 'https://picsum.photos/seed/barber2/200', role: 'BARBER', status: 'ONLINE' },
  { id: 'b3', name: 'Gustavo Paiva', avatar: 'https://picsum.photos/seed/barber3/200', role: 'BARBER', status: 'OFFLINE' },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Pomada Matte Extra Forte', category: 'Pomada', price: 45, stock: 5, minStock: 10, featured: true, image: 'https://picsum.photos/seed/p1/200', has_variations: false },
  { id: 'p2', name: 'Óleo de Barba Cedro', category: 'Acessórios', price: 35, stock: 15, minStock: 5, featured: false, image: 'https://picsum.photos/seed/p2/200', has_variations: false },
  { id: 'p3', name: 'Shampoo Mentolado', category: 'Shampoo', price: 55, stock: 2, minStock: 8, featured: true, image: 'https://picsum.photos/seed/p3/200', has_variations: false },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    clientName: 'Roberto Almeida',
    clientPhone: '11 99999-0000',
    serviceId: '1',
    barberId: 'b1',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    status: AppointmentStatus.CONFIRMED
  },
  {
    id: 'a2',
    clientName: 'João Victor',
    clientPhone: '11 98888-1111',
    serviceId: '2',
    barberId: 'b2',
    date: new Date().toISOString().split('T')[0],
    time: '15:30',
    status: AppointmentStatus.PENDING
  },
];
