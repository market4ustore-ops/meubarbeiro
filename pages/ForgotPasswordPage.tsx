import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Card } from '../components/UI';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setSent(true);
            addToast('Email de recuperação enviado!', 'success');
        } catch (err: any) {
            console.error('Reset password error:', err);
            addToast(err.message || 'Erro ao enviar email.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
                <Card className="w-full max-w-md p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                        <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">Verifique seu email</h2>
                        <p className="text-slate-400">
                            Enviamos um link de recuperação para <strong>{email}</strong>.
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                        Não recebeu? Verifique sua caixa de spam ou tente novamente em alguns minutos.
                    </p>
                    <Button variant="secondary" className="w-full" onClick={() => navigate('/login')}>
                        Voltar para o Login
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Recuperar Senha</h1>
                    <p className="text-slate-400">Insira seu email para receber as instruções.</p>
                </div>

                <Card className="p-1 backdrop-blur-md">
                    <form onSubmit={handleSubmit} className="p-7 space-y-6">
                        <Input
                            label="E-mail"
                            placeholder="seu@email.com"
                            type="email"
                            icon={<Mail size={18} />}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Button type="submit" className="w-full h-12 text-lg" isLoading={loading}>
                            Enviar Link de Recuperação
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

export default ForgotPasswordPage;
