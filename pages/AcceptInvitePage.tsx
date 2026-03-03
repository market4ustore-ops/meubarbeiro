import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Key, CheckCircle2, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { Card, Button, Input, Badge } from '../components/UI';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

const AcceptInvitePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');

    // Password validation state
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const matches = password === confirmPassword && password.length > 0;

    const isStrong = hasMinLength && hasUppercase && hasNumber;

    useEffect(() => {
        // Check if we have a session (user clicked the invite link and was auto-logged in by Supabase)
        const checkSession = async () => {
            // 1. Try standard session check
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email) {
                setEmail(session.user.email);
                return;
            }

            // 2. Manual Hash Parsing (Fix for HashRouter conflict)
            // URL might look like: http://.../#/accept-invite#access_token=...&refresh_token=...
            const hash = window.location.hash;
            if (hash && hash.includes('access_token=')) {
                try {
                    // Extract params regardless of where they are in the hash string
                    const params = new URLSearchParams(hash.substring(hash.indexOf('#', 1) + 1));
                    // Note: indexOf('#', 1) finds the second # if it exists (Supabase fragment), 
                    // or we might need to exact substring if it's mixed.

                    // Robust parsing: split by '&' and find keys manually if URLSearchParams fails or is confused by double #
                    const accessTokenMatch = hash.match(/access_token=([^&]+)/);
                    const refreshTokenMatch = hash.match(/refresh_token=([^&]+)/);

                    if (accessTokenMatch && refreshTokenMatch) {
                        const accessToken = accessTokenMatch[1];
                        const refreshToken = refreshTokenMatch[1];

                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });

                        if (!error && data.session?.user?.email) {
                            setEmail(data.session.user.email);
                            addToast('Sessão validada com sucesso via token.', 'success');
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Error parsing hash:", e);
                }
            }

            // 3. Fallback check
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setEmail(user.email);
            }
        };
        checkSession();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isStrong) {
            addToast('A senha não atende aos requisitos de segurança.', 'error');
            return;
        }

        if (!matches) {
            addToast('As senhas não coincidem.', 'error');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            addToast('Senha definida com sucesso! Bem-vindo(a) à equipe.', 'success');

            // Wait a moment and redirect to dashboard
            setTimeout(() => {
                navigate('/agenda');
            }, 2000);

        } catch (err: any) {
            console.error('Error updating password:', err);
            addToast(err.message || 'Erro ao definir senha.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-500/10 rounded-full blur-[120px] animate-pulse"></div>
            </div>

            <div className="w-full max-w-md space-y-8 relative">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 mb-4 animate-bounce">
                        <Shield className="text-emerald-500 w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Finalizar Cadastro</h1>
                    <p className="text-slate-400">Defina uma senha forte para acessar sua conta.</p>
                    {email && (
                        <Badge variant="info" className="mt-2 text-[10px] font-black uppercase tracking-widest bg-slate-900 border-slate-800">
                            Conta: {email}
                        </Badge>
                    )}
                </div>

                <Card className="p-8 bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl rounded-3xl">
                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <Input
                                    label="Nova Senha"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    icon={<Key size={18} />}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pr-12 h-12"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-[38px] text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <Input
                                label="Confirmar Senha"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                icon={<Key size={18} />}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="h-12"
                                required
                            />
                        </div>

                        {/* Validation indicators */}
                        <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                <div className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                                <span className={hasMinLength ? 'text-emerald-400' : 'text-slate-500'}>Mínimo 8 caracteres</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                <div className={`w-1.5 h-1.5 rounded-full ${hasUppercase ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                                <span className={hasUppercase ? 'text-emerald-400' : 'text-slate-500'}>Pelo menos uma letra maiúscula</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                <div className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                                <span className={hasNumber ? 'text-emerald-400' : 'text-slate-500'}>Pelo menos um número</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider pt-1 border-t border-slate-800/50 mt-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${matches ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                                <span className={matches ? 'text-emerald-400' : 'text-slate-500'}>Senhas coincidem</span>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !isStrong || !matches}
                            className={`w-full h-14 font-black uppercase tracking-widest text-sm shadow-lg transition-all active:scale-95 ${loading || !isStrong || !matches ? 'opacity-50 grayscale' : 'shadow-emerald-500/20 active:shadow-none hover:shadow-emerald-500/40'
                                }`}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    Salvando...
                                </div>
                            ) : (
                                'Ativar Minha Conta'
                            )}
                        </Button>
                    </form>
                </Card>

                <p className="text-center text-slate-500 text-xs font-medium">
                    Ao ativar sua conta, você concorda com nossos <br />
                    <span className="text-emerald-500/80 hover:text-emerald-400 cursor-pointer underline transition-colors">Termos de Uso</span> e <span className="text-emerald-500/80 hover:text-emerald-400 cursor-pointer underline transition-colors">Política de Privacidade</span>.
                </p>
            </div>
        </div>
    );
};

export default AcceptInvitePage;
