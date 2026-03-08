
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Scissors, ArrowRight, Mail } from 'lucide-react';
import { Button, Card } from '../components/UI';

const EmailConfirmedPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-950/20 via-transparent to-transparent">
            <div className="w-full max-w-lg space-y-8 animate-in fade-in zoom-in duration-700">

                {/* Logo */}
                <div className="text-center">
                    <div className="inline-flex p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20 mb-6">
                        <Scissors className="w-8 h-8 text-white" />
                    </div>
                </div>

                <Card className="p-1 backdrop-blur-md overflow-hidden border-slate-800 shadow-2xl">
                    <div className="p-8 md:p-12 text-center space-y-8">
                        {/* Success Icon */}
                        <div className="relative mx-auto w-24 h-24">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping duration-[3000ms]" />
                            <div className="relative w-full h-full bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border-2 border-emerald-500/30">
                                <CheckCircle2 size={48} />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="space-y-3">
                            <h1 className="text-3xl font-black text-white tracking-tight">
                                E-mail Confirmado!
                            </h1>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                Seu cadastro foi validado com sucesso. Agora você já pode acessar sua barbearia e começar a gerenciar seus agendamentos.
                            </p>
                        </div>

                        {/* Info Box */}
                        <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex items-center gap-4 text-left">
                            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-500">
                                <Mail size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Próximo Passo</p>
                                <p className="text-sm text-slate-500">Faça login com sua senha para ativar seu painel.</p>
                            </div>
                        </div>

                        {/* Action */}
                        <Button
                            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 font-bold text-lg shadow-xl shadow-emerald-500/20 group"
                            onClick={() => navigate('/login')}
                        >
                            Acessar Minha Conta
                            <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>
                </Card>

                {/* Footer */}
                <p className="text-center text-slate-600 text-xs uppercase tracking-[0.2em] font-bold">
                    MeuBarbeiro &copy; {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
};

export default EmailConfirmedPage;
