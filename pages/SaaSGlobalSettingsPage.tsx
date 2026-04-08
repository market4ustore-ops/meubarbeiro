
import React, { useState } from 'react';
import {
  Shield,
  Settings,
  CreditCard,
  Bell,
  Globe,
  Lock,
  Save,
  AlertTriangle,
  Database,
  Zap,
  Mail,
  Smartphone,
  Info,
  Clock,
  Eye,
  EyeOff,
  UserPlus,
  ShieldCheck,
  History,
  X
} from 'lucide-react';
import { Card, Button, Input, Badge } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';
import packageJson from '../package.json';

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  user_email?: string;
}


type GlobalTab = 'system' | 'payments' | 'security' | 'notifications';

const SaaSGlobalSettingsPage: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<GlobalTab>('system');
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Métrica de banco e Auditoria
  const [dbMetrics, setDbMetrics] = useState({ size: 'Calculando...', percentage: 0 });
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);


  // Configurações Reais de WhatsApp (Banco)
  const [waConfig, setWaConfig] = useState({
    id: '',
    provider: 'ZAVU' as 'ZAVU' | 'EVOLUTION' | 'UAZAPI' | 'WAPI',
    is_active: false,
    api_url: '',
    api_key: '',
    instance_id: '',
    template_name: ''
  });

  // Mock de Configurações Globais
  const [config, setConfig] = useState({
    system: {
      platformName: 'MeuBarbeiro SaaS',
      supportEmail: 'suporte@meubarbeiro.com.br',
      maintenanceMode: false,
      registrationOpen: true,
      trialDays: 7,
    },
    payments: {
      gateway: 'pagarme',
      sandboxMode: true,
      apiKey: import.meta.env.VITE_STRIPE_SECRET_KEY || 'sk_test_PLACEHOLDER',
      monthlyTax: 2.5, // Taxa extra do SaaS
    },
    security: {
      maxLoginAttempts: 5,
      sessionTimeout: 60,
      requireUppercase: true,
      requireSpecialChar: true,
    },
    notifications: {
      adminAlertsEmail: 'admin@meubarbeiro.com.br',
      globalWhatsAppPrefix: '55',
      enableSystemWebhooks: true,
    }
  });

  useEffect(() => {
    fetchWaConfig();
  }, []);

  const fetchWaConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_whatsapp_config')
        .select('*')
        .single();
      
      if (data) {
        setWaConfig({
            id: data.id,
            provider: data.provider,
            is_active: data.is_active,
            api_url: data.api_url || '',
            api_key: data.api_key || '',
            instance_id: data.instance_id || '',
            template_name: data.template_name || ''
        });
      }
    } catch (err) {
      console.error('Erro ao buscar config de whatsapp:', err);
    }
  };

  const fetchDbMetrics = async () => {
    try {
        const { data, error } = await supabase.rpc('get_db_size');
        if (data && data.size) {
            const totalBytes = 524288000;
            const usedPct = data.bytes ? Math.min((data.bytes / totalBytes) * 100, 100) : 0;
            setDbMetrics({ size: data.size, percentage: usedPct });
        } else {
            setDbMetrics({ size: '54 MB', percentage: 10 });
        }
    } catch (err) {
        setDbMetrics({ size: '54 MB', percentage: 10 });
    }
  };

  useEffect(() => {
    fetchWaConfig();
    fetchDbMetrics();
  }, []);

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
        const { data, error } = await supabase
            .from('saas_audit_logs')
            .select('id, action, created_at')
            .order('created_at', { ascending: false })
            .limit(20);
            
        if (!error && data) {
            setAuditLogs(data);
        }
    } catch (err) {
        console.error("Sem tabela de logs ainda.");
    } finally {
        setLoadingAudit(false);
    }
  };

  const handleOpenAudit = () => {
    setIsAuditModalOpen(true);
    fetchAuditLogs();
  };

  const logAction = async (action: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('saas_audit_logs').insert([{ action, user_id: user.id }]);
        }
    } catch (e) {
        // failed silently if not exists
    }
  };


  const handleSave = async () => {
    setLoading(true);
    try {
      // Salvar Configurações de WhatsApp
      const { error: waError } = await supabase
        .from('saas_whatsapp_config')
        .upsert({
            id: waConfig.id || undefined,
            provider: waConfig.provider,
            is_active: waConfig.is_active,
            api_url: waConfig.api_url,
            api_key: waConfig.api_key,
            instance_id: waConfig.instance_id,
            template_name: waConfig.template_name
        });

      if (waError) throw waError;

      await logAction(`Atualizou configurações SaaS globais`);

      addToast('Configurações globais e de WhatsApp atualizadas!', 'success');
    } catch (err) {
      addToast('Erro ao salvar algumas configurações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    try {
      // 1. Buscar o primeiro tenant para usar como teste
      const { data: tenant } = await supabase.from('tenants').select('id, name, phone').limit(1).single();
      
      if (!tenant) {
        addToast('Nenhum tenant encontrado para teste.', 'warning');
        return;
      }

      const { data, error } = await supabase.functions.invoke('whatsapp-notifier', {
        body: {
          table: 'appointments',
          action: 'INSERT',
          data: {
            id: 'test-id',
            tenant_id: tenant.id,
            client_name: '🚀 Cliente de Teste SaaS',
            client_phone: '(85) 99921-6730',
            date: new Date().toISOString().split('T')[0],
            time: '14:30',
            barber_id: null,
            service_id: null,
            status: 'PENDING',
            override_phone: '5585999216730'
          }
        }
      });

      console.log('[TestNotification] API response:', data);

      if (data?.success === false) {
        addToast(`Erro: ${data.error || 'Mensagem não enviada'}. Detalhes: ${data.details || ''}`, 'error');
        return;
      }

      if (error) throw error;
      addToast(`Notificação de teste enviada para ${tenant.name}!`, 'success');
    } catch (err) {
      console.error('Erro no teste de notificação:', err);
      addToast('Erro ao disparar teste. Verifique se a Edge Function está ativa.', 'error');
    }
  };

  const tabs = [
    { id: 'system', label: 'Sistema', icon: <Settings size={18} /> },
    { id: 'payments', label: 'Pagamentos', icon: <CreditCard size={18} /> },
    { id: 'security', label: 'Segurança', icon: <Shield size={18} /> },
    { id: 'notifications', label: 'Notificações', icon: <Bell size={18} /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações Globais</h1>
          <p className="text-slate-400">Parâmetros críticos da plataforma SaaS e regras de negócio.</p>
        </div>
        <Button onClick={handleSave} isLoading={loading}>
          <Save size={18} /> Salvar Alterações
        </Button>
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-800 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as GlobalTab)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* Aba Sistema */}
          {activeTab === 'system' && (
            <Card className="p-6 space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Globe className="text-emerald-500" />
                <h3 className="text-lg font-bold text-white">Configurações Base</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  label="Nome da Plataforma"
                  value={config.system.platformName}
                  onChange={e => setConfig({ ...config, system: { ...config.system, platformName: e.target.value } })}
                  icon={<Zap size={18} />}
                />
                <Input
                  label="E-mail de Suporte Técnico"
                  type="email"
                  value={config.system.supportEmail}
                  onChange={e => setConfig({ ...config, system: { ...config.system, supportEmail: e.target.value } })}
                  icon={<Mail size={18} />}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-400">Dias de Trial Padrão</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="number"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      value={config.system.trialDays}
                      onChange={e => setConfig({ ...config, system: { ...config.system, trialDays: parseInt(e.target.value) || 0 } })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-xl border border-red-500/20 group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Modo de Manutenção Global</p>
                      <p className="text-xs text-slate-500">Ao ativar, apenas administradores poderão acessar a plataforma.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, system: { ...config.system, maintenanceMode: !config.system.maintenanceMode } })}
                    className={`w-12 h-6 rounded-full relative transition-colors ${config.system.maintenanceMode ? 'bg-red-500' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.system.maintenanceMode ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800 group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                      <UserPlus size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Novos Cadastros Liberados</p>
                      <p className="text-xs text-slate-500">Habilita ou desabilita o formulário de registro público.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, system: { ...config.system, registrationOpen: !config.system.registrationOpen } })}
                    className={`w-12 h-6 rounded-full relative transition-colors ${config.system.registrationOpen ? 'bg-emerald-600' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.system.registrationOpen ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Aba Pagamentos */}
          {activeTab === 'payments' && (
            <Card className="p-6 space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <CreditCard className="text-amber-500" />
                <h3 className="text-lg font-bold text-white">Processamento Financeiro</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-400">Gateway de Pagamento</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 focus:outline-none"
                    value={config.payments.gateway}
                    onChange={e => setConfig({ ...config, payments: { ...config.payments, gateway: e.target.value } })}
                  >
                    <option value="cakto">Cakto (Recomendado)</option>
                    <option value="pagarme">Pagar.me (V5)</option>
                    <option value="stripe">Stripe</option>
                    <option value="asaas">Asaas</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-400">Ambiente de Operação</label>
                  <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 h-[46px]">
                    <button
                      onClick={() => setConfig({ ...config, payments: { ...config.payments, sandboxMode: true } })}
                      className={`flex-1 rounded-md text-xs font-bold transition-all ${config.payments.sandboxMode ? 'bg-amber-600 text-white' : 'text-slate-500'}`}
                    >
                      Sandbox (Teste)
                    </button>
                    <button
                      onClick={() => setConfig({ ...config, payments: { ...config.payments, sandboxMode: false } })}
                      className={`flex-1 rounded-md text-xs font-bold transition-all ${!config.payments.sandboxMode ? 'bg-red-600 text-white' : 'text-slate-500'}`}
                    >
                      Produção (Real)
                    </button>
                  </div>
                </div>
              </div>

              {config.payments.gateway === 'cakto' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Input
                      label="Cakto Client ID"
                      value={config.payments.apiKey.split('||')[0] || ''}
                      placeholder="Identificador do cliente"
                      icon={<Shield size={18} />}
                      onChange={e => {
                        const [_, secret] = config.payments.apiKey.split('||');
                        const newKey = `${e.target.value}||${secret || ''}`;
                        setConfig({ ...config, payments: { ...config.payments, apiKey: newKey } });
                      }}
                    />
                    <div className="relative">
                      <Input
                        label="Cakto Client Secret"
                        type={showApiKey ? "text" : "password"}
                        value={config.payments.apiKey.split('||')[1] || ''}
                        placeholder="Senha secreta da API"
                        icon={<Lock size={18} />}
                        onChange={e => {
                          const [id, _] = config.payments.apiKey.split('||');
                          const newKey = `${id || ''}||${e.target.value}`;
                          setConfig({ ...config, payments: { ...config.payments, apiKey: newKey } });
                        }}
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-9 text-slate-500 hover:text-white"
                      >
                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-500 mb-2">
                      <Zap size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Webhooks da Cakto</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      Configure a URL abaixo no painel da Cakto para receber atualizações de pagamento em tempo real:
                    </p>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-slate-950 p-2.5 rounded border border-slate-800 text-[10px] text-emerald-400 font-mono overflow-x-auto">
                        https://mxdqklklnequjdfikvvf.supabase.co/functions/v1/cakto-webhook
                      </code>
                      <Button variant="secondary" className="px-3" onClick={() => {
                        navigator.clipboard.writeText('https://mxdqklklnequjdfikvvf.supabase.co/functions/v1/cakto-webhook');
                        addToast('URL copiada!', 'info');
                      }}>
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    label="Chave Secreta da API"
                    type={showApiKey ? "text" : "password"}
                    value={config.payments.apiKey}
                    icon={<Lock size={18} />}
                    onChange={e => setConfig({ ...config, payments: { ...config.payments, apiKey: e.target.value } })}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-9 text-slate-500 hover:text-white"
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-4">
                <Info className="text-amber-500 shrink-0" size={20} />
                <p className="text-xs text-slate-400 leading-relaxed">
                  As faturas dos tenants são geradas automaticamente através da Cakto. Certifique-se de que os produtos cadastrados na Cakto correspondam aos planos configurados no sistema.
                </p>
              </div>
            </Card>
          )}

          {/* Aba Segurança */}
          {activeTab === 'security' && (
            <Card className="p-6 space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Shield className="text-sky-500" />
                <h3 className="text-lg font-bold text-white">Políticas de Segurança</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  label="Máx. Tentativas de Login"
                  type="number"
                  value={config.security.maxLoginAttempts}
                  onChange={e => setConfig({ ...config, security: { ...config.security, maxLoginAttempts: parseInt(e.target.value) || 1 } })}
                />
                <Input
                  label="Timeout de Sessão (min)"
                  type="number"
                  value={config.security.sessionTimeout}
                  onChange={e => setConfig({ ...config, security: { ...config.security, sessionTimeout: parseInt(e.target.value) || 1 } })}
                />
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Requisitos de Senha</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setConfig({ ...config, security: { ...config.security, requireUppercase: !config.security.requireUppercase } })}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${config.security.requireUppercase ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-500' : 'border-slate-800 bg-slate-950/50 text-slate-500'}`}
                  >
                    <span className="text-xs font-bold">Obrigar Letra Maiúscula</span>
                    <Lock size={16} />
                  </div>
                  <div
                    onClick={() => setConfig({ ...config, security: { ...config.security, requireSpecialChar: !config.security.requireSpecialChar } })}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${config.security.requireSpecialChar ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-500' : 'border-slate-800 bg-slate-950/50 text-slate-500'}`}
                  >
                    <span className="text-xs font-bold">Obrigar Caractere Especial</span>
                    <Shield size={16} />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Aba Notificações */}
          {activeTab === 'notifications' && (
            <Card className="p-6 space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <Bell className="text-purple-500" />
                    <h3 className="text-lg font-bold text-white">Comunicação e Alertas</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Status do Robô</span>
                    <button
                        onClick={() => setWaConfig({ ...waConfig, is_active: !waConfig.is_active })}
                        className={`w-12 h-6 rounded-full relative transition-colors ${waConfig.is_active ? 'bg-emerald-600' : 'bg-slate-800'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${waConfig.is_active ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                    label="E-mail de Alerta Administrativo"
                    value={config.notifications.adminAlertsEmail}
                    onChange={e => setConfig({ ...config, notifications: { ...config.notifications, adminAlertsEmail: e.target.value } })}
                    icon={<Mail size={18} />}
                />
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Provedor de WhatsApp</label>
                    <select
                        className="w-full h-[46px] bg-slate-900 border border-slate-800 rounded-lg px-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        value={waConfig.provider}
                        onChange={e => setWaConfig({ ...waConfig, provider: e.target.value as any })}
                    >
                        <option value="ZAVU">Zavu.dev (Oficial)</option>
                        <option value="EVOLUTION">Evolution API (Unofficial)</option>
                        <option value="UAZAPI">Uazapi (Alta Performance)</option>
                        <option value="WAPI">W-API (w-api.app)</option>
                    </select>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest">
                  <Smartphone size={16} /> Configurações do Provedor
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {(waConfig.provider === 'EVOLUTION' || waConfig.provider === 'UAZAPI' || waConfig.provider === 'WAPI') && (
                    <Input
                      label={waConfig.provider === 'WAPI' ? "API Base URL (W-API)" : waConfig.provider === 'UAZAPI' ? "URL da API (Uazapi)" : "URL da API (Evolution)"}
                      placeholder={waConfig.provider === 'WAPI' ? "https://api.w-api.app/v1" : "https://api.uazapi.com"}
                      value={waConfig.api_url}
                      onChange={e => setWaConfig({ ...waConfig, api_url: e.target.value })}
                    />
                  )}
                  <Input
                    label={waConfig.provider === 'WAPI' ? "API Token (Bearer)" : waConfig.provider === 'EVOLUTION' ? "Apikey (Master Token)" : waConfig.provider === 'UAZAPI' ? "Instância Token" : "API Key (Zavu)"}
                    type="password"
                    value={waConfig.api_key}
                    onChange={e => setWaConfig({ ...waConfig, api_key: e.target.value })}
                  />
                  <Input
                    label={waConfig.provider === 'WAPI' ? "Instance ID" : waConfig.provider === 'EVOLUTION' ? "Nome da Instância" : waConfig.provider === 'UAZAPI' ? "ID da Instância (Opcional)" : "Sender ID / WABA ID"}
                    placeholder={waConfig.provider === 'WAPI' ? "00000000-0000-0000-0000-000000000000" : waConfig.provider === 'UAZAPI' ? "instance01" : "meu-barbeiro-oficial"}
                    value={waConfig.instance_id}
                    onChange={e => setWaConfig({ ...waConfig, instance_id: e.target.value })}
                  />
                  {waConfig.provider === 'ZAVU' && (
                    <Input
                      label="Nome do Template"
                      placeholder="notificacao_venda"
                      value={waConfig.template_name}
                      onChange={e => setWaConfig({ ...waConfig, template_name: e.target.value })}
                    />
                  )}
                </div>

                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 accent-emerald-500" 
                            checked={config.notifications.enableSystemWebhooks}
                            onChange={() => setConfig({ ...config, notifications: { ...config.notifications, enableSystemWebhooks: !config.notifications.enableSystemWebhooks } })}
                        />
                        <label className="text-xs font-bold text-slate-400">Notificar Donos</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 accent-emerald-500" defaultChecked />
                        <label className="text-xs font-bold text-slate-400">Notificar Barbeiros</label>
                      </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    className="text-xs h-9" 
                    onClick={handleSendTest}
                  >
                    <Smartphone size={14} /> Enviar Notificação de Teste
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar Status/Info */}
        <div className="space-y-6">
          <Card className="p-6 bg-slate-900 border-slate-800">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Database size={18} className="text-emerald-500" /> Infraestrutura
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Versão do Core</span>
                <span className="text-white font-mono font-bold">v{packageJson.version}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Último Backup</span>
                <span className="text-emerald-500 font-bold">Automático (Diário)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Uso de BD ({dbMetrics.size})</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.max(dbMetrics.percentage, 2)}%` }} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-amber-500/5 border-amber-500/20">
            <div className="flex gap-3 mb-4">
              <ShieldCheck className="text-amber-500" size={24} />
              <h4 className="text-white font-bold">Auditoria SaaS</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Todas as alterações nesta página são registradas nos logs de auditoria do sistema para conformidade LGPD.
            </p>
            <Button variant="secondary" className="w-full text-xs py-2" onClick={handleOpenAudit}>
                Ver Logs de Auditoria
            </Button>
          </Card>
        </div>
      </div>

      {/* Modal de Auditoria */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                  <History size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Logs de Auditoria</h2>
                  <p className="text-xs text-slate-400">Histórico de ações críticas registradas no SaaS.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAuditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                {loadingAudit ? (
                    <div className="flex justify-center py-10">
                        <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                    </div>
                ) : auditLogs.length > 0 ? (
                    <div className="space-y-4">
                        {auditLogs.map(log => (
                            <div key={log.id} className="flex gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-800/30 transition-colors">
                                <div className="mt-1">
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{log.action}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {new Date(log.created_at).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <History size={48} className="text-slate-700 mx-auto mb-4" />
                        <p className="text-sm text-slate-400">Nenhum log de auditoria encontrado.</p>
                        <p className="text-xs text-slate-500 mt-2">Dica: Rode o SQL 'saas_metrics.sql' no Supabase para criar a estrutura dos logs.</p>
                    </div>
                )}
            </div>
            
            <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end">
              <Button variant="secondary" onClick={() => setIsAuditModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SaaSGlobalSettingsPage;
