
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SaaSLoginPage from './pages/SaaSLoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import SaaSDashboardPage from './pages/SaaSDashboardPage';
import BarberShopsListPage from './pages/BarberShopsListPage';
import SaaSPlansPage from './pages/SaaSPlansPage';
import SaaSGlobalSettingsPage from './pages/SaaSGlobalSettingsPage';
import AgendaPage from './pages/AgendaPage';
import ServicesPage from './pages/ServicesPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import BarbersPage from './pages/BarbersPage';
import SubscriptionPage from './pages/SubscriptionPage';
import SettingsPage from './pages/SettingsPage';
import OrdersPage from './pages/OrdersPage';
import PublicShopPage from './pages/PublicShopPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import { UpgradeModal } from './components/UpgradeModal';
import { Scissors, LogOut, Menu, Bell, Trash2, Clock, Info, AlertTriangle, CheckCircle, BarChart3, Store } from 'lucide-react';
import { NAV_ITEMS, SAAS_NAV_ITEMS } from './constants';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSubscription } from './context/SubscriptionContext';

const Sidebar: React.FC<{ role: string, isOpen: boolean, onClose: () => void, onLogout: () => void }> = ({ role, isOpen, onClose, onLogout }) => {
  const location = useLocation();

  const getNavItems = () => {
    if (role === 'SUPER_ADMIN') return SAAS_NAV_ITEMS;
    if (role === 'BARBER') {
      return NAV_ITEMS.filter(item =>
        item.path === '/admin/agenda' ||
        item.path === '/admin/configuracoes'
      );
    }
    return NAV_ITEMS;
  };

  const navItems = getNavItems();

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose}></div>}

      <aside className={`fixed top-0 left-0 bottom-0 w-72 bg-slate-950 border-r border-slate-800 z-50 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">MeuBarbeiro</span>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${location.pathname === item.path
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-800">
            <div className="mb-4 px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-800">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Acesso Atual</p>
              <p className="text-sm font-bold text-emerald-500">
                {role === 'SUPER_ADMIN' ? 'Gestor do SaaS' : role === 'OWNER' ? 'Proprietário' : 'Barbeiro'}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-left text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all font-medium"
            >
              <LogOut size={20} />
              Sair da conta
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const NotificationDropdown: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-slate-950 animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-wider"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[350px] overflow-y-auto no-scrollbar">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors group relative ${!n.read ? 'bg-emerald-500/5' : ''}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex gap-3">
                    <div className={`mt-1 p-1.5 rounded-lg shrink-0 ${n.type === 'info' ? 'bg-sky-500/10 text-sky-500' :
                      n.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                        n.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                          'bg-red-500/10 text-red-500'
                      }`}>
                      {n.type === 'info' && <Info size={14} />}
                      {n.type === 'warning' && <AlertTriangle size={14} />}
                      {n.type === 'success' && <CheckCircle size={14} />}
                      {n.type === 'danger' && <Scissors size={14} />}
                    </div>
                    <div className="flex-1 space-y-1 pr-6">
                      <div className="flex justify-between items-start">
                        <p className={`text-xs font-bold leading-tight ${n.read ? 'text-slate-300' : 'text-white'}`}>{n.title}</p>
                        {!n.read && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{n.message}</p>
                      <div className="flex items-center gap-1 text-[9px] text-slate-600 font-medium">
                        <Clock size={10} /> {n.time}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-10 text-center space-y-2">
                <Bell size={32} className="text-slate-800 mx-auto" />
                <p className="text-sm text-slate-500">Nenhuma notificação por aqui.</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-950/50 border-t border-slate-800 text-center">
            <button className="text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors">Ver todas as atividades</button>
          </div>
        </div>
      )}
    </div>
  );
};

const Header: React.FC<{ role: string, identifier: string, onToggleSidebar: () => void }> = ({ role, onToggleSidebar }) => {
  const { profile } = useAuth();

  const displayName = profile?.name || (role === 'SUPER_ADMIN' ? 'Gestor SaaS' : 'Usuário');
  const userAvatar = profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0f172a&color=10b981`;

  return (
    <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between px-4 md:px-6 py-4">
        <button onClick={onToggleSidebar} className="p-2 -ml-2 text-slate-400 lg:hidden">
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-4 ml-auto">
          {/* <NotificationDropdown /> */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white">
                {displayName}
              </p>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                {role === 'SUPER_ADMIN' ? 'Admin Global' : role === 'OWNER' ? 'Proprietário' : 'Barbeiro'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
              <img
                src={userAvatar}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};


const Layout: React.FC<{ role: string, identifier: string, children: React.ReactNode, onLogout: () => void }> = ({ role, identifier, children, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAccessBlocked, isReadOnly, isTrialActive, isTrialExpired, getDaysRemaining, subscription } = useSubscription();
  const location = useLocation();

  const daysRemaining = getDaysRemaining();
  // Show warning if expiring in 10 days or less, or if in a trial
  const showWarningBanner = daysRemaining !== null && (daysRemaining <= 10 || isTrialActive || isReadOnly || isAccessBlocked);

  if (isAccessBlocked && location.pathname !== '/admin/assinatura' && role !== 'SUPER_ADMIN') {
    return <Navigate to="/admin/assinatura" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      <Sidebar role={role} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onLogout={onLogout} />

      <div className="lg:pl-72 flex flex-col min-h-screen transition-all duration-300">
        <div className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800">
          {/* Global Banners */}
          {showWarningBanner && (
            <div className={`px-4 md:px-6 py-2.5 border-b transition-all duration-500 ${(isAccessBlocked || isReadOnly)
              ? 'bg-red-600 text-white'
              : (isTrialActive && daysRemaining! > 3)
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-600 text-white'}`}
            >
              <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-lg bg-white/20">
                    {isTrialActive && daysRemaining! > 3 ? <Info size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <p className="text-sm font-bold text-white">
                    {isAccessBlocked
                      ? 'Acesso suspenso. Por favor, regularize sua assinatura para continuar usando o sistema.'
                      : isReadOnly
                        ? `Seu período de ${isTrialActive ? 'teste' : 'assinatura'} expirou. O sistema está em modo de leitura.`
                        : isTrialActive
                          ? `Você está no período de teste grátis. Restam ${daysRemaining !== null ? `${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}` : ''} para aproveitar todas as funcionalidades.`
                          : `Sua assinatura termina em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Evite interrupções renovando agora.`}
                  </p>
                </div>
                <Link
                  to="/admin/assinatura"
                  className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all shrink-0 bg-white text-slate-900 hover:bg-slate-100 shadow-xl"
                >
                  {(isAccessBlocked || isReadOnly) ? 'Regularizar Agora' : 'Ver Planos'}
                </Link>
              </div>
            </div>
          )}

          <Header role={role} identifier={identifier} onToggleSidebar={() => setIsSidebarOpen(true)} />
        </div>

        <main className="p-4 md:p-6 pb-20 flex-1">
          <div className="w-full max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      <UpgradeModal />
    </div >
  );
};


const App: React.FC = () => {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  const role = profile?.role || null;

  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!user ? <LandingPage /> : <Navigate to={role === 'SUPER_ADMIN' ? "/saas/dashboard" : "/admin/dashboard"} replace />} />
        <Route path="/shop/:slug" element={<PublicShopPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/login" element={!user ? <LoginPage onNavigateToRegister={() => { }} /> : <Navigate to={role === 'SUPER_ADMIN' ? "/saas/dashboard" : "/admin/dashboard"} replace />} />
        <Route path="/saas/login" element={!user ? <SaaSLoginPage /> : <Navigate to="/saas/dashboard" replace />} />

        {/* Protected Routes */}
        {!user ? (
          <Route path="*" element={<Navigate to="/" replace />} />
        ) : (
          <Route path="/*" element={
            <Layout role={role as string} identifier={user.email || ''} onLogout={signOut}>
              <Routes>
                {/* Rotas Super Admin (SaaS) */}
                {role === 'SUPER_ADMIN' && (
                  <>
                    <Route path="/saas/dashboard" element={<SaaSDashboardPage />} />
                    <Route path="/saas/shops" element={<BarberShopsListPage />} />
                    <Route path="/saas/plans" element={<SaaSPlansPage />} />
                    <Route path="/saas/settings" element={<SaaSGlobalSettingsPage />} />
                    <Route path="*" element={<Navigate to="/saas/dashboard" replace />} />
                  </>
                )}

                {/* Rotas Barbearia (Tenant) */}
                {role && role !== 'SUPER_ADMIN' && (
                  <>
                    <Route path="/admin/dashboard" element={role === 'OWNER' ? <DashboardPage /> : <Navigate to="/admin/agenda" replace />} />
                    <Route path="/admin/agenda" element={<AgendaPage />} />
                    <Route path="/admin/configuracoes" element={<SettingsPage />} />
                    {role === 'OWNER' && (
                      <>
                        <Route path="/admin/equipe" element={<BarbersPage />} />
                        <Route path="/admin/servicos" element={<ServicesPage />} />
                        <Route path="/admin/produtos" element={<ProductsPage />} />
                        <Route path="/admin/pedidos" element={<OrdersPage />} />
                        <Route path="/admin/categorias" element={<CategoriesPage />} />
                        <Route path="/admin/assinatura" element={<SubscriptionPage />} />
                      </>
                    )}
                    <Route path="*" element={<Navigate to={role === 'OWNER' ? "/admin/dashboard" : "/admin/agenda"} replace />} />
                  </>
                )}
              </Routes>
            </Layout>
          } />
        )}
      </Routes>
    </HashRouter>
  );
};

export default App;
