
import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Mail,
  Lock,
  User,
  Store,
  Phone,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ShieldCheck,
  XCircle,
  Info,
  Globe,
  Check,
  AlertCircle,
  Zap
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Card, Badge } from '../components/UI';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [registeredTenantId, setRegisteredTenantId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ownerName: '',
    email: '',
    password: '',
    shopName: '',
    slug: '',
    phone: '',
    plan: 'professional'
  });

  // Estado para validações
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false
  });

  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [isSlugValid, setIsSlugValid] = useState(true);

  // Validação de senha em tempo real
  useEffect(() => {
    const pwd = formData.password;
    setPasswordCriteria({
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    });
  }, [formData.password]);

  // Transformar nome em slug
  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^\w\s-]/g, '') // remove caracteres especiais
      .replace(/\s+/g, '-') // espaços por hífens
      .replace(/--+/g, '-') // remove hífens duplos
      .trim();
  };

  const handleShopNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const newSlug = createSlug(name);
    setFormData({ ...formData, shopName: name, slug: newSlug });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, slug: value });
    setIsSlugValid(value.length >= 3);
  };

  // Formatação de telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    let formattedValue = '';
    if (value.length > 0) {
      formattedValue = `(${value.slice(0, 2)}`;
      if (value.length > 2) {
        formattedValue += `) ${value.slice(2, 7)}`;
        if (value.length > 7) {
          formattedValue += `-${value.slice(7, 11)}`;
        }
      }
    }

    setFormData({ ...formData, phone: formattedValue });
    setIsPhoneValid(value.length === 11);
  };

  const isPasswordSecure = Object.values(passwordCriteria).every(Boolean);
  const isStep1Valid = formData.ownerName.length > 3 && formData.email.includes('@') && isPasswordSecure;
  const isStep2Valid = formData.shopName.length > 2 && isPhoneValid && isSlugValid && formData.slug.length >= 3;

  const checkEmailAvailability = async (email: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error('Email check error:', error);
      return true; // Assume available if error, signUp will catch it anyway
    }
    return !data;
  };

  const checkPhoneAvailability = async (phone: string) => {
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (error) return false;
    return !data;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!isStep1Valid) return;
      setLoading(true);
      const isAvailable = await checkEmailAvailability(formData.email);
      setLoading(false);
      if (!isAvailable) {
        addToast('Este e-mail já está cadastrado.', 'error');
        return;
      }
    }

    if (step === 2) {
      if (!isStep2Valid) return;
      setLoading(true);

      // Check Slug
      const isSlugAvailable = await checkSlugAvailability(formData.slug);
      if (!isSlugAvailable) {
        addToast('Este link de página já está em uso.', 'error');
        setLoading(false);
        return;
      }

      // Check Phone
      const isPhoneAvailable = await checkPhoneAvailability(formData.phone);
      if (!isPhoneAvailable) {
        addToast('Este número de WhatsApp já está cadastrado.', 'error');
        setLoading(false);
        return;
      }

      setLoading(false);
    }

    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const checkSlugAvailability = async (slug: string) => {
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error) return false;
    return !data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep2Valid) return;
    setLoading(true);

    try {
      // 1. Verificar se o slug já existe
      const isAvailable = await checkSlugAvailability(formData.slug);
      if (!isAvailable) {
        addToast('Este link de página já está em uso. Escolha outro.', 'error');
        setStep(2);
        setLoading(false);
        return;
      }

      // 2. Criar usuário no Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/#/confirmacao-email`,
          data: {
            name: formData.ownerName,
            role: 'OWNER'
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Erro ao criar usuário.');

      // 3. Mapear plano ID
      const planMap: Record<string, string> = {
        'professional': '22d33b5c-5626-41c9-810f-2969e568cb5a'
      };

      // 4. Chamar RPC para criar Tenant e Perfil
      const { data: rpcData, error: rpcError } = await supabase.rpc('register_new_tenant', {
        p_owner_id: authData.user.id,
        p_owner_name: formData.ownerName,
        p_owner_email: formData.email,
        p_shop_name: formData.shopName,
        p_shop_slug: formData.slug,
        p_shop_phone: formData.phone,
        p_plan_id: planMap[formData.plan]
      });

      if (rpcError) throw rpcError;

      const result = rpcData as any;
      if (!result.success) {
        throw new Error(result.error || 'Erro ao registrar barbearia.');
      }

      // 5. Deslogar automaticamente para evitar que vá direto para o dashboard
      // O Supabase loga o usuário automaticamente se a confirmação de e-mail estiver desativada.
      await supabase.auth.signOut();

      setRegisteredTenantId(result.tenant_id);
      setStep(3);
      addToast('Cadastro realizado com sucesso!', 'success');
    } catch (err: any) {
      console.error('Registration error:', err);

      let friendlyMessage = 'Erro ao realizar cadastro. Por favor, tente novamente.';

      // Mapeamento de erros técnicos para mensagens amigáveis
      const errorStr = err.message || '';

      if (errorStr.includes('users_pkey') || errorStr.includes('already been registered')) {
        friendlyMessage = 'Este e-mail já está cadastrado no sistema. Tente fazer login.';
      } else if (errorStr.includes('tenants_slug_key') || errorStr.includes('slug')) {
        friendlyMessage = 'Este link de página já está em uso por outra barbearia. Escolha outro.';
      } else if (errorStr.includes('tenants_phone_key') || errorStr.includes('phone')) {
        friendlyMessage = 'Este número de WhatsApp já está cadastrado em outra conta.';
      } else if (errorStr.includes('confirmation email')) {
        friendlyMessage = 'Conta criada, mas houve um erro ao enviar o e-mail de confirmação. Por favor, fale com o suporte.';
      }

      addToast(friendlyMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-950/20 via-transparent to-transparent">
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Header */}
        <div className="text-center space-y-2">
          <Link to="/login" className="inline-block mb-6 hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Logomarca Meu Barbeiro" className="h-12 w-auto mx-auto" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white">Comece sua jornada</h1>
          <p className="text-slate-400">Digitalize sua barbearia e profissionalize sua gestão</p>
        </div>

        {/* Progress Stepper */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-4 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-slate-600 border border-slate-800'
                  }`}>
                  {s}
                </div>
                {s < 2 && <div className={`w-12 h-0.5 mx-2 ${step > s ? 'bg-emerald-600' : 'bg-slate-800'}`} />}
              </div>
            ))}
          </div>
        )}

        <Card className="p-1 backdrop-blur-md overflow-hidden border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="p-8">

            {/* Step 1: Owner Info */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <User className="text-emerald-500" size={20} /> Informações Pessoais
                  </h2>
                  <p className="text-sm text-slate-500">Dados do proprietário da conta.</p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Seu Nome Completo"
                    placeholder="Como quer ser chamado?"
                    icon={<User size={18} />}
                    value={formData.ownerName}
                    onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                    required
                  />
                  <Input
                    label="E-mail Profissional"
                    placeholder="exemplo@suabarbearia.com"
                    type="email"
                    icon={<Mail size={18} />}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <div className="space-y-3">
                    <Input
                      label="Crie uma Senha Forte"
                      placeholder="Mínimo 8 caracteres"
                      type="password"
                      icon={<Lock size={18} />}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required
                    />

                    {/* Indicadores de requisitos de senha */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                      <RequirementItem met={passwordCriteria.length} label="Mínimo 8 caracteres" />
                      <RequirementItem met={passwordCriteria.uppercase} label="Uma letra maiúscula" />
                      <RequirementItem met={passwordCriteria.number} label="Um número" />
                      <RequirementItem met={passwordCriteria.special} label="Um caractere especial" />
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full h-12"
                  onClick={handleNext}
                  type="button"
                  disabled={!isStep1Valid || loading}
                  isLoading={loading && step === 1}
                >
                  Próximo Passo <ChevronRight size={18} />
                </Button>
              </div>
            )}

            {/* Step 2: Shop Info */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Store className="text-emerald-500" size={20} /> Dados da Barbearia
                  </h2>
                  <p className="text-sm text-slate-500">Como os clientes encontrarão seu negócio.</p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Nome da sua barbearia"
                    placeholder="Ex: Barber Shop Vintage"
                    icon={<Store size={18} />}
                    value={formData.shopName}
                    onChange={handleShopNameChange}
                    required
                  />

                  <div className="space-y-2">
                    <Input
                      label="Link da sua página (URL)"
                      placeholder="minha-barbearia"
                      icon={<Globe size={18} />}
                      value={formData.slug}
                      onChange={handleSlugChange}
                      required
                    />
                    <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-start gap-2">
                        <Info size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          O <strong>Slug</strong> é o endereço exclusivo da sua barbearia na internet.
                          Seus clientes usarão este link para agendar horários diretamente.
                          <span className="block mt-1 text-slate-500 italic">Ex: meubarbeiro.com/{formData.slug || 'sua-barbearia'}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1 bg-slate-950 rounded border border-slate-800/50">
                        {isSlugValid && formData.slug.length >= 3 ? (
                          <Check size={10} className="text-emerald-500" />
                        ) : (
                          <AlertCircle size={10} className="text-amber-500" />
                        )}
                        <span className="text-[9px] text-slate-500 font-medium">Use apenas letras minúsculas, números e hífens.</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Input
                      label="Telefone / WhatsApp"
                      placeholder="(00) 90000-0000"
                      icon={<Phone size={18} />}
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      required
                    />
                    {!isPhoneValid && formData.phone.length > 0 && (
                      <p className="text-[10px] text-red-500 flex items-center gap-1 ml-1">
                        <Info size={10} /> Digite o número completo com DDD
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button variant="secondary" className="w-full sm:flex-1 h-12" onClick={handleBack} type="button">
                    <ChevronLeft size={18} /> Voltar
                  </Button>
                  <Button
                    className="w-full sm:flex-[2] h-12"
                    type="submit"
                    disabled={!isStep2Valid || loading}
                    isLoading={loading && step === 2}
                  >
                    Finalizar Cadastro <CheckCircle2 size={18} />
                  </Button>
                </div>
              </div>
            )}



            {/* Step 3: Success */}
            {step === 3 && (
              <div className="text-center space-y-6 py-8 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500/30">
                  <CheckCircle2 size={48} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white">Tudo pronto, {formData.ownerName.split(' ')[0]}!</h2>
                  <p className="text-slate-400 max-w-sm mx-auto">Sua barbearia <strong>{formData.shopName}</strong> foi criada com sucesso em nossa plataforma.</p>
                  <p className="text-xs text-slate-500">Link público: <strong>meubarbeiro.com/{formData.slug}</strong></p>
                </div>
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-sm text-slate-400 italic">
                  "Agora você já pode cadastrar seus barbeiros, serviços e começar a receber agendamentos."
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 font-bold text-lg shadow-xl shadow-emerald-500/20"
                    onClick={() => {
                      try {
                        addToast('Redirecionando para o checkout...', 'info');

                        // Capturando os dados atuais para garantir que não se percam
                        const email = formData.email;
                        const tenantId = registeredTenantId;

                        // Pequeno delay para o toast aparecer
                        setTimeout(() => {
                          const checkoutUrl = new URL('https://pay.cakto.com.br/36n97fk_783275');
                          checkoutUrl.searchParams.append('email', email);
                          if (tenantId) {
                            checkoutUrl.searchParams.append('tenant_id', tenantId);
                          }
                          window.location.href = checkoutUrl.toString();
                        }, 800);
                      } catch (err) {
                        console.error('Erro ao redirecionar:', err);
                        addToast('Erro ao abrir checkout. Tente novamente.', 'error');
                      }
                    }}
                  >
                    Ativar Minha Assinatura Agora <Zap className="ml-2 w-5 h-5 fill-current" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-12 text-slate-400 hover:text-white"
                    onClick={() => navigate('/login')}
                  >
                    Fazer isso mais tarde (Acessar Painel)
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>

        {step < 4 && (
          <p className="text-center text-slate-500 text-sm">
            Já possui uma conta?{' '}
            <Link to="/login" className="font-semibold text-emerald-500 hover:text-emerald-400">
              Faça login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

// Componente auxiliar para exibir requisitos da senha
const RequirementItem: React.FC<{ met: boolean, label: string }> = ({ met, label }) => (
  <div className={`flex items-center gap-2 text-[10px] font-medium transition-colors ${met ? 'text-emerald-500' : 'text-slate-500'}`}>
    {met ? <CheckCircle2 size={12} /> : <XCircle size={12} className="opacity-50" />}
    <span>{label}</span>
  </div>
);

export default RegisterPage;
