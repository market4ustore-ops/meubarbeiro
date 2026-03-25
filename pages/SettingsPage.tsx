import React, { useState, useEffect } from 'react';
import {
  Store,
  MapPin,
  Clock,
  Palette,
  Save,
  Globe,
  Phone,
  Mail,
  Camera,
  Check,
  Lock,
  Layout,
  Calendar as CalendarIcon,
  CreditCard as CardIcon,
  Loader2,
  Instagram,
  Facebook,
  Image as ImageIcon,
  Key,
  ShieldCheck
} from 'lucide-react';
import { Card, Button, Input, Badge } from '../components/UI';
import { ImageUpload } from '../components/ImageUpload';
import { ShopSettings } from '../types';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type TabType = 'general' | 'address' | 'hours' | 'appearance' | 'security';

const SettingsPage: React.FC = () => {
  const { addToast } = useToast();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Password Reset State
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!profile?.tenant_id) return;

      try {
        setFetching(true);
        // 1. Fetch Tenant data
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profile.tenant_id)
          .single();

        if (tenantError) throw tenantError;

        // 2. Fetch Opening Hours
        // 2. Fetch Opening Hours
        const { data: hours, error: hoursError } = await supabase
          .from('opening_hours')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .order('id');

        if (hoursError) throw hoursError;

        // Ensure all days are present
        const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
        const openingHours = daysOfWeek.map(day => {
          const existing = hours.find(h => h.day === day);
          if (existing) {
            return {
              day: existing.day,
              isOpen: existing.is_open,
              open: existing.open_time || '09:00',
              close: existing.close_time || '18:00'
            };
          }
          return {
            day,
            isOpen: true,
            open: '09:00',
            close: '18:00'
          };
        });

        // Map to ShopSettings type
        setSettings({
          name: tenant.name,
          slug: tenant.slug,
          description: tenant.description || '',
          phone: tenant.phone,
          email: tenant.email,
          address: {
            street: tenant.street || '',
            number: tenant.number || '',
            neighborhood: tenant.neighborhood || '',
            city: tenant.city || '',
            state: tenant.state || '',
            zip: tenant.zip || ''
          },
          openingHours,
          logo: tenant.logo_url,
          banner: tenant.banner_url,
          primaryColor: tenant.primary_color || '#10b981',
          instagramUrl: tenant.instagram_url || '',
          facebookUrl: tenant.facebook_url || '',
          schedulingEnabled: tenant.scheduling_enabled ?? true,
          digitalCardEnabled: tenant.digital_card_enabled ?? true,
          bookingFeeEnabled: tenant.booking_fee_enabled ?? false,
          bookingFeeType: tenant.booking_fee_type || 'percentage',
          bookingFeeValue: tenant.booking_fee_value || 0
        } as any);
      } catch (err: any) {
        console.error('Error fetching settings:', err);
        addToast('Erro ao carregar configurações.', 'error');
      } finally {
        setFetching(false);
      }
    };

    fetchSettings();
  }, [profile?.tenant_id, addToast]);

  useEffect(() => {
    if (profile?.role === 'BARBER') {
      setActiveTab('security');
    }
  }, [profile?.role]);

  const handleSave = async () => {
    if (!profile?.tenant_id || !settings) return;

    setLoading(true);
    try {
      // 1. Update Tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          name: settings.name,
          description: settings.description,
          phone: settings.phone,
          email: settings.email,
          street: settings.address.street,
          number: settings.address.number,
          neighborhood: settings.address.neighborhood,
          city: settings.address.city,
          state: settings.address.state,
          zip: settings.address.zip,
          logo_url: settings.logo,
          banner_url: settings.banner,
          primary_color: settings.primaryColor,
          instagram_url: settings.instagramUrl,
          facebook_url: settings.facebookUrl,
          scheduling_enabled: settings.schedulingEnabled,
          digital_card_enabled: settings.digitalCardEnabled,
          booking_fee_enabled: settings.bookingFeeEnabled,
          booking_fee_type: settings.bookingFeeType,
          booking_fee_value: settings.bookingFeeValue
        })
        .eq('id', profile.tenant_id);

      if (tenantError) throw tenantError;

      // 2. Update Opening Hours (Upsert-like logic)
      for (const hour of settings.openingHours) {
        // Check if exists
        const { data: existing } = await supabase
          .from('opening_hours')
          .select('id')
          .eq('tenant_id', profile.tenant_id)
          .eq('day', hour.day)
          .maybeSingle();

        if (existing) {
          const { error: updateError } = await supabase
            .from('opening_hours')
            .update({
              is_open: hour.isOpen,
              open_time: hour.open,
              close_time: hour.close
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('opening_hours')
            .insert({
              tenant_id: profile.tenant_id,
              day: hour.day,
              is_open: hour.isOpen,
              open_time: hour.open,
              close_time: hour.close
            });

          if (insertError) throw insertError;
        }
      }

      addToast('Configurações atualizadas com sucesso!', 'success');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      addToast('Erro ao salvar alterações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (index: number) => {
    if (!settings) return;
    const newHours = [...settings.openingHours];
    newHours[index].isOpen = !newHours[index].isOpen;
    setSettings({ ...settings, openingHours: newHours });
  };

  const handleHourChange = (index: number, field: 'open' | 'close', value: string) => {
    if (!settings) return;
    const newHours = [...settings.openingHours];
    newHours[index][field] = value;
    setSettings({ ...settings, openingHours: newHours });
  };

  const handlePreview = () => {
    if (!settings) return;
    window.open(`#/shop/${settings.slug}`, '_blank');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addToast('As senhas não coincidem.', 'error');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      addToast('A senha deve ter pelo menos 8 caracteres.', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      addToast('Senha atualizada com sucesso!', 'success');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Password Update Error:', err);
      addToast(`Erro ao atualizar senha: ${err.message}`, 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Geral', icon: <Store size={18} />, ownerOnly: true },
    { id: 'address', label: 'Endereço', icon: <MapPin size={18} />, ownerOnly: true },
    { id: 'hours', label: 'Horários', icon: <Clock size={18} />, ownerOnly: true },
    { id: 'appearance', label: 'Visual', icon: <Palette size={18} />, ownerOnly: true },
    { id: 'security', label: 'Segurança', icon: <Key size={18} />, ownerOnly: false },
  ].filter(tab => !tab.ownerOnly || profile?.role === 'OWNER');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Store className="text-emerald-500 shrink-0" /> Configurações
          </h1>
          <p className="text-slate-400">Gerencie a identidade e o funcionamento do seu negócio.</p>
        </div>
        {profile?.role === 'OWNER' && (
          <Button onClick={handleSave} isLoading={loading} disabled={fetching}>
            <Save size={18} /> Salvar Alterações
          </Button>
        )}
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-800 w-fit max-w-full">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {
        fetching ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="font-medium animate-pulse">Carregando configurações...</p>
          </div>
        ) : settings && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Aba Geral */}
              {activeTab === 'general' && (
                <Card className="p-4 md:p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Perfil da Barbearia</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nome da Barbearia"
                      value={settings.name}
                      onChange={e => setSettings({ ...settings, name: e.target.value })}
                      icon={<Store size={18} />}
                    />
                    <div className="relative group">
                      <Input
                        label="Link da sua Página (Slug)"
                        value={settings.slug}
                        icon={<Lock size={18} className="text-slate-600" />}
                        disabled
                        className="bg-slate-950 border-slate-800/50 text-slate-500 cursor-not-allowed italic"
                      />
                      <div className="absolute top-10 right-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest hidden group-hover:block">Imutável</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Descrição / Slogan</label>
                    <textarea
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all min-h-[100px] resize-none"
                      value={settings.description}
                      onChange={e => setSettings({ ...settings, description: e.target.value })}
                      placeholder="Conte um pouco sobre sua barbearia..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Telefone WhatsApp"
                      value={settings.phone}
                      onChange={e => setSettings({ ...settings, phone: e.target.value })}
                      icon={<Phone size={18} />}
                    />
                    <Input
                      label="E-mail de Contato"
                      value={settings.email}
                      onChange={e => setSettings({ ...settings, email: e.target.value })}
                      icon={<Mail size={18} />}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
                    <Input
                      label="Instagram (URL)"
                      placeholder="https://instagram.com/suabarbearia"
                      value={settings.instagramUrl || ''}
                      onChange={e => setSettings({ ...settings, instagramUrl: e.target.value })}
                      icon={<Instagram size={18} />}
                    />
                    <Input
                      label="Facebook (URL)"
                      placeholder="https://facebook.com/suabarbearia"
                      value={settings.facebookUrl || ''}
                      onChange={e => setSettings({ ...settings, facebookUrl: e.target.value })}
                      icon={<Facebook size={18} />}
                    />
                  </div>
                </Card>
              )}

              {/* Aba Endereço */}
              {activeTab === 'address' && (
                <Card className="p-4 md:p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Localização</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-3">
                      <Input
                        label="Rua / Logradouro"
                        value={settings.address.street}
                        onChange={e => setSettings({ ...settings, address: { ...settings.address, street: e.target.value } })}
                      />
                    </div>
                    <Input
                      label="Número"
                      value={settings.address.number}
                      onChange={e => setSettings({ ...settings, address: { ...settings.address, number: e.target.value } })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Bairro"
                      value={settings.address.neighborhood}
                      onChange={e => setSettings({ ...settings, address: { ...settings.address, neighborhood: e.target.value } })}
                    />
                    <Input
                      label="Cidade"
                      value={settings.address.city}
                      onChange={e => setSettings({ ...settings, address: { ...settings.address, city: e.target.value } })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Estado"
                      value={settings.address.state}
                      onChange={e => setSettings({ ...settings, address: { ...settings.address, state: e.target.value } })}
                    />
                    <Input
                      label="CEP"
                      value={settings.address.zip}
                      onChange={e => setSettings({ ...settings, address: { ...settings.address, zip: e.target.value } })}
                    />
                  </div>
                </Card>
              )}

              {/* Aba Horários */}
              {activeTab === 'hours' && (
                <Card className="p-4 md:p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Horário de Funcionamento</h3>
                  <div className="space-y-4">
                    {settings.openingHours.sort((a, b) => {
                      const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
                      return days.indexOf(a.day) - days.indexOf(b.day);
                    }).map((hour, idx) => (
                      <div key={hour.day} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800 gap-4 transition-all hover:bg-slate-900">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleToggleDay(idx)}
                            className={`w-12 h-6 rounded-full relative transition-colors ${hour.isOpen ? 'bg-emerald-600' : 'bg-slate-800'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hour.isOpen ? 'left-7' : 'left-1'}`}></div>
                          </button>
                          <span className={`font-bold ${hour.isOpen ? 'text-white' : 'text-slate-600'}`}>{hour.day}</span>
                        </div>

                        {hour.isOpen ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              value={hour.open}
                              onChange={e => handleHourChange(idx, 'open', e.target.value)}
                            />
                            <span className="text-slate-500">até</span>
                            <input
                              type="time"
                              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              value={hour.close}
                              onChange={e => handleHourChange(idx, 'close', e.target.value)}
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-red-500/50 uppercase tracking-widest">Fechado</span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Aba Visual */}
              {activeTab === 'appearance' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <Card className="p-6 space-y-8">
                    <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Branding e Identidade</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-sm font-medium text-slate-400">Logomarcar da Barbearia</label>
                        <div className="max-w-[160px]">
                          <ImageUpload
                            description="512x512px"
                            value={settings.logo}
                            onChange={(url) => setSettings({ ...settings, logo: url })}
                            bucket="profiles"
                            folder="logo"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 italic">Ideal para perfil e cabeçalhos.</p>
                      </div>

                      <div className="space-y-4">
                        <label className="text-sm font-medium text-slate-400">Imagem de Banner</label>
                        <ImageUpload
                          aspectRatio="video"
                          description="1920x600px"
                          value={settings.banner}
                          onChange={(url) => setSettings({ ...settings, banner: url })}
                          bucket="profiles"
                          folder="banners"
                        />
                        <p className="text-[10px] text-slate-500 italic">Esta imagem aparecerá no topo da sua página pública.</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-800/50">
                      <label className="text-sm font-medium text-slate-400">Cor Principal do seu App</label>
                      <div className="flex flex-wrap gap-3">
                        {['#10b981', '#0ea5e9', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#ffffff'].map(color => (
                          <button
                            key={color}
                            onClick={() => setSettings({ ...settings, primaryColor: color })}
                            className={`w-12 h-12 rounded-xl border-2 transition-all flex items-center justify-center ${settings.primaryColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105 opacity-60'
                              }`}
                            style={{ backgroundColor: color }}
                          >
                            {settings.primaryColor === color && <Check className={color === '#ffffff' ? 'text-black' : 'text-white'} size={20} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 space-y-6">
                    <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Recursos da Página Pública</h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800 hover:bg-slate-900 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                            <CalendarIcon size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Agendamento Online</p>
                            <p className="text-xs text-slate-500">Permitir que clientes agendem horários pelo link público.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, schedulingEnabled: !settings.schedulingEnabled })}
                          className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${settings.schedulingEnabled ? 'bg-emerald-600' : 'bg-slate-800'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.schedulingEnabled ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800 hover:bg-slate-900 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-sky-500/10 text-sky-500 rounded-lg">
                            <CardIcon size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Cartão Digital</p>
                            <p className="text-xs text-slate-500">Exibir o seu cartão de visitas digital na página.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, digitalCardEnabled: !settings.digitalCardEnabled })}
                          className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${settings.digitalCardEnabled ? 'bg-emerald-600' : 'bg-slate-800'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.digitalCardEnabled ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                              <CardIcon size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Taxa de Agendamento</p>
                              <p className="text-xs text-slate-500">Cobrar um sinal para confirmar o agendamento.</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, bookingFeeEnabled: !settings.bookingFeeEnabled })}
                            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${settings.bookingFeeEnabled ? 'bg-emerald-600' : 'bg-slate-800'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.bookingFeeEnabled ? 'left-7' : 'left-1'}`}></div>
                          </button>
                        </div>

                        {settings.bookingFeeEnabled && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200 pt-4 border-t border-slate-800/50">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo de Cobrança</label>
                              <div className="flex gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setSettings({ ...settings, bookingFeeType: 'percentage' })}
                                  className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${settings.bookingFeeType === 'percentage' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                  Porcentagem (%)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSettings({ ...settings, bookingFeeType: 'fixed' })}
                                  className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${settings.bookingFeeType === 'fixed' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                  Valor Fixo (R$)
                                </button>
                              </div>
                            </div>
                            <Input
                              label={settings.bookingFeeType === 'percentage' ? "Porcentagem (%)" : "Valor Fixo (R$)"}
                              type="number"
                              value={settings.bookingFeeValue}
                              onChange={e => setSettings({ ...settings, bookingFeeValue: Number(e.target.value) })}
                              placeholder={settings.bookingFeeType === 'percentage' ? "Ex: 30" : "Ex: 20.00"}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Aba Segurança */}
              {activeTab === 'security' && (
                <Card className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Lock size={18} className="text-emerald-500" /> Segurança da Conta
                    </h3>
                    <p className="text-sm text-slate-500">Mantenha sua conta segura alterando sua senha regularmente.</p>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-6 pt-4 border-t border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input
                        label="Nova Senha"
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        icon={<Key size={18} />}
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                      />
                      <Input
                        label="Confirmar Nova Senha"
                        type="password"
                        placeholder="Repita a nova senha"
                        icon={<ShieldCheck size={18} />}
                        value={passwordData.confirmPassword}
                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" isLoading={passwordLoading}>
                        Atualizar Senha
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </div>

            {/* Sidebar de Ajuda / Informações */}
            <div className="space-y-6">
              <Card className="p-6 bg-emerald-500/5 border-emerald-500/20">
                <h4 className="text-white font-bold flex items-center gap-2 mb-3">
                  <Check className="text-emerald-500" size={18} /> Sua Página está Online
                </h4>
                <p className="text-sm text-slate-400 mb-6">
                  Clientes podem acessar seus serviços e agendar através do link público.
                </p>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 mb-4 flex items-center justify-between gap-2 overflow-hidden">
                  <span className="text-xs text-slate-500 truncate">meubarbeiro.com/#/shop/{settings.slug}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/#/shop/${settings.slug}`);
                      addToast('Link copiado!', 'info');
                    }}
                    className="text-[10px] font-bold text-emerald-500 uppercase shrink-0 hover:text-emerald-400"
                  >
                    Copiar
                  </button>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Agendamento</span>
                    {settings.schedulingEnabled ? (
                      <Badge variant="success" className="text-[8px]">Ativo</Badge>
                    ) : (
                      <Badge variant="danger" className="text-[8px]">Inativo</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Cartão Digital</span>
                    {settings.digitalCardEnabled ? (
                      <Badge variant="success" className="text-[8px]">Exibindo</Badge>
                    ) : (
                      <Badge variant="danger" className="text-[8px]">Oculto</Badge>
                    )}
                  </div>
                </div>

                <Button className="w-full" variant="secondary" onClick={handlePreview}>Visualizar Página</Button>
              </Card>

              <Card className="p-6">
                <h4 className="text-white font-bold mb-3">Privacidade</h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  As informações de endereço e horários são visíveis para seus clientes na página de agendamento online.
                </p>
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800 text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                  <Clock size={14} />
                  Mudanças de fuso horário podem levar 5 min para propagar.
                </div>
              </Card>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default SettingsPage;
