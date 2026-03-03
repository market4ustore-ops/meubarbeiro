
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
  // Fix: Added missing icon imports
  UserPlus,
  ShieldCheck
} from 'lucide-react';
import { Card, Button, Input, Badge } from '../components/UI';
import { useToast } from '../context/ToastContext';

type GlobalTab = 'system' | 'payments' | 'security' | 'notifications';

const SaaSGlobalSettingsPage: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<GlobalTab>('system');
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast('Configurações globais atualizadas com sucesso!', 'success');
    }, 1200);
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
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Bell className="text-purple-500" />
                <h3 className="text-lg font-bold text-white">Comunicação e Alertas</h3>
              </div>

              <Input
                label="E-mail de Alerta Administrativo"
                value={config.notifications.adminAlertsEmail}
                onChange={e => setConfig({ ...config, notifications: { ...config.notifications, adminAlertsEmail: e.target.value } })}
                icon={<Mail size={18} />}
              />

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest">
                  <Smartphone size={16} /> Configurações WhatsApp
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="DDI Padrão"
                    placeholder="Ex: 55"
                    value={config.notifications.globalWhatsAppPrefix}
                    onChange={e => setConfig({ ...config, notifications: { ...config.notifications, globalWhatsAppPrefix: e.target.value } })}
                  />
                  <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-300">Webhooks Globais</span>
                    <button
                      onClick={() => setConfig({ ...config, notifications: { ...config.notifications, enableSystemWebhooks: !config.notifications.enableSystemWebhooks } })}
                      className={`w-12 h-6 rounded-full relative transition-colors ${config.notifications.enableSystemWebhooks ? 'bg-emerald-600' : 'bg-slate-800'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.notifications.enableSystemWebhooks ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
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
                <span className="text-white font-mono font-bold">v2.4.1-stable</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Último Backup</span>
                <span className="text-emerald-500 font-bold">Há 12 min</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Uso de Banco de Dados</span>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '32%' }} />
                </div>
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
            <Button variant="secondary" className="w-full text-xs py-2">Ver Logs de Auditoria</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SaaSGlobalSettingsPage;
