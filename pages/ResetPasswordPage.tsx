import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Card } from '../components/UI';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        // Check if user is authenticated (via the recovery link)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                addToast('Link inválido ou expirado.', 'error');
                navigate('/login');
            }
            setSession(session);
        });
    }, [navigate, addToast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            addToast('As senhas não coincidem.', 'error');
            return;
        }

        if (password.length < 6) {
            addToast('A senha deve ter pelo menos 6 caracteres.', 'error');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            addToast('Senha atualizada com sucesso!', 'success');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            console.error('Update password error:', err);
            addToast(err.message || 'Erro ao atualizar senha.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!session) return null;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Nova Senha</h1>
                    <p className="text-slate-400">Defina uma nova senha para sua conta.</p>
                </div>

                <Card className="p-1 backdrop-blur-md">
                    <form onSubmit={handleSubmit} className="p-7 space-y-6">
                        <div className="relative">
                            <Input
                                label="Nova Senha"
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

                        <Input
                            label="Confirmar Nova Senha"
                            placeholder="••••••••"
                            type={showPassword ? "text" : "password"}
                            icon={<Lock size={18} />}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <Button type="submit" className="w-full h-12 text-lg" isLoading={loading}>
                            Atualizar Senha
                        </Button>
                    </form>
                </Card>

                <div className="text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={16} /> Voltar para o Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
