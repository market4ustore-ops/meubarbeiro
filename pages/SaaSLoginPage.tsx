
import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, Scissors, Globe, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';

interface SaaSLoginPageProps {
  onLogin?: (identifier: string, role: 'SUPER_ADMIN') => void;
}

const SaaSLoginPage: React.FC<SaaSLoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        addToast('Autenticação de administrador bem-sucedida.', 'success');
      }
    } catch (err: any) {
      console.error('SaaS Login error:', err);
      setError(err.message || 'Erro ao realizar login administrativo.');
      addToast('Erro ao realizar login.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      {/* Background Decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="text-center space-y-3">
          <div className="inline-flex p-4 bg-emerald-600 rounded-3xl shadow-2xl shadow-emerald-500/20 mb-2">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white">SaaS Control Panel</h1>
            <p className="text-slate-500 text-sm font-medium flex items-center justify-center gap-2 mt-1">
              <Globe size={14} className="text-emerald-500" /> MEUBARBEIRO NETWORK ADMINISTRATION
            </p>
          </div>
        </div>

        <Card className="p-1 border-slate-800 bg-slate-900/40 backdrop-blur-xl">
          <div className="bg-slate-950/50 p-4 border-b border-slate-800 text-center">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em]">Acesso Restrito: Nível 1</span>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-[10px] text-red-500 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Administrador"
                placeholder="email@dominio.com"
                icon={<User size={18} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-950/50"
              />

              <div className="relative">
                <Input
                  label="Chave Mestra"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  icon={<Lock size={18} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-950/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3">
              <AlertCircle className="text-amber-500 shrink-0" size={18} />
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                Este terminal monitora endereços IP e atividades. Tentativas de acesso não autorizado serão bloqueadas permanentemente.
              </p>
            </div>

            <Button type="submit" className="w-full h-12 text-sm font-bold uppercase tracking-widest shadow-xl shadow-emerald-600/10" isLoading={loading}>
              Iniciar Sessão Admin <ArrowRight size={16} />
            </Button>

            <p className="text-[10px] text-center text-slate-700 italic">
              Ambiente de homologação v2.4.1
            </p>
          </form>
        </Card>

        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-bold text-slate-600 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <Scissors size={14} /> Voltar para o Login de Usuário
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaaSLoginPage;
