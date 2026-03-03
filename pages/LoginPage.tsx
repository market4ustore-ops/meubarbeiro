
import React, { useState } from 'react';
import { Mail, Lock, Scissors, Eye, EyeOff, LayoutDashboard, UserCircle, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onLogin?: (identifier: string, role: 'OWNER' | 'BARBER') => void;
  onNavigateToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'OWNER' | 'BARBER'>('OWNER');
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
        // Verify if user is actually a barber if role selected is BARBER
        // This check happens in AuthProvider via profile, but good to double check
        addToast(`Bem-vindo de volta!`, 'success');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Credenciais inválidas. Verifique email e senha.');
      addToast('Erro ao realizar login.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole: 'OWNER' | 'BARBER') => {
    setRole(newRole);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-950/20 via-transparent to-transparent">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20 mb-4">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">MeuBarbeiro</h1>
          <p className="text-slate-400">Entre na plataforma para gerenciar seu dia a dia</p>
        </div>

        <Card className="p-1 backdrop-blur-md overflow-hidden">
          <div className="flex p-1 bg-slate-950/50 rounded-t-xl border-b border-slate-800">
            <button
              onClick={() => handleRoleChange('OWNER')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${role === 'OWNER'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              <LayoutDashboard size={14} />
              Dono de Barbearia
            </button>
            <button
              onClick={() => handleRoleChange('BARBER')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${role === 'BARBER'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              <UserCircle size={14} />
              Sou Barbeiro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-7 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">
                {role === 'OWNER' ? 'Gestão da Barbearia' : 'Acesso do Profissional'}
              </h2>
              <p className="text-xs text-slate-500 italic">
                Insira suas credenciais para acessar seu painel.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-sm text-red-500 font-medium">{error}</p>
              </div>
            )}

            <Input
              label="E-mail"
              placeholder="seu@email.com"
              type="email"
              icon={role === 'OWNER' ? <Mail size={18} /> : <User size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                label="Senha"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                icon={<Lock size={18} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

            <Button type="submit" className="w-full h-12 text-lg" isLoading={loading}>
              Acessar Painel
            </Button>
          </form>
        </Card>

        <div className="flex flex-col gap-4 text-center">
          <p className="text-slate-500 text-sm">
            Ainda não é parceiro?{' '}
            <button
              onClick={() => navigate('/register')}
              className="font-semibold text-emerald-500 hover:text-emerald-400"
            >
              Cadastre sua barbearia
            </button>
          </p>
          <button
            onClick={() => navigate('/saas/login')}
            className="text-[10px] text-slate-700 hover:text-slate-500 uppercase tracking-widest font-bold"
          >
            Acesso Administrativo (SaaS)
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
