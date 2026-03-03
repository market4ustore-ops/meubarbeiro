import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Scissors,
  Calendar,
  Users,
  BarChart3,
  Store,
  CheckCircle,
  Sparkles,
  Clock,
  TrendingUp,
  Smartphone,
  ClockAlert,
  CreditCard,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  Star,
  Zap,
  Shield,
  ShieldCheck,
  HeadphonesIcon,
  Frown,
  ShoppingCart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LandingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      {/* Header / Navigation */}
      <header className="fixed top-0 md:top-8 left-0 right-0 z-50 flex justify-center px-4 md:px-6 transition-all duration-300">
        <nav className={`
          w-full max-w-5xl bg-slate-950/40 md:bg-slate-900/40 backdrop-blur-xl
          border md:border border-slate-800/50 md:rounded-2xl 
          transition-all duration-500 shadow-2xl shadow-emerald-500/5
          ${mobileMenuOpen ? 'h-auto rounded-2xl mt-4 bg-slate-900/90' : 'h-16 md:h-14'}
        `}>
          <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-8 md:gap-12 lg:gap-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div className="p-1.5 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">MeuBarbeiro</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8 lg:gap-10">
              <a href="#recursos" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Recursos</a>
              <a href="#precos" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Preços</a>
              <a href="#depoimentos" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Depoimentos</a>
              <a href="#faq" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">FAQ</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4 shrink-0">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors px-2"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-semibold transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/30 hover:scale-105 active:scale-95"
              >
                Começar Grátis
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden px-6 pb-6 border-t border-slate-800/50 pt-4 space-y-4 bg-slate-950/90 backdrop-blur-xl">
              <a href="#recursos" className="block text-slate-300 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>Recursos</a>
              <a href="#precos" className="block text-slate-300 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>Preços</a>
              <a href="#depoimentos" className="block text-slate-300 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>Depoimentos</a>
              <a href="#faq" className="block text-slate-300 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <div className="flex flex-col gap-3 pt-2">
                <Link to="/login" className="px-4 py-2 text-center text-slate-300 hover:text-white transition-colors border border-slate-700 rounded-lg">
                  Entrar
                </Link>
                <Link to="/register" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-center rounded-lg font-semibold transition-all">
                  Começar Grátis
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-48 pb-32 px-6 overflow-hidden bg-[#020617]">
        {/* Modern Background Gradient & Rings */}
        <div className="absolute inset-0 z-0">
          {/* Main Emerald Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-emerald-600/10 blur-[120px] rounded-full"></div>
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/10 blur-[100px] rounded-full animate-pulse-slow"></div>

          {/* Concentric Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] border border-white/[0.03] rounded-full"></div>
        </div>

        {/* Subtle Grid Pattern Overlay */}
        <div className="absolute inset-0 z-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>

        <div className="relative max-w-7xl mx-auto z-10 text-center">
          <div className="flex flex-col items-center space-y-10">
            {/* Top Glass Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-slate-300">A Solução Definitiva para sua Barbearia</span>
            </motion.div>

            {/* Massive Centered Headline - Structured in 2 lines */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="font-black text-white leading-[1.1] tracking-tight text-[3rem] md:text-[3.5rem]"
            >
              <span className="block">Gerencie sua barbearia pelo celular,</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600">
                sem complicação.
              </span>
            </motion.h1>

            {/* Subtext Centered */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="text-slate-400 leading-relaxed max-w-2xl mx-auto font-medium"
              style={{ fontSize: '1.3rem' }}
            >
              Sem planilhas, sem papel, sem confusão no WhatsApp. Tudo organizado em um só app simples de usar.
            </motion.p>

            {/* CTA Clusters */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 pt-4"
            >
              <Link
                to="/register"
                className="group relative inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-emerald-500/20 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative">Comece seu Teste Grátis</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform relative" />
              </Link>
            </motion.div>

            {/* Simple Trust Footer */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-6 opacity-60">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">7 Dias Grátis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Setup em 5 Minutos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}


      {/* Problems & Solutions */}
      <section className="py-24 px-6 relative overflow-hidden bg-slate-950">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full z-0"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
              Menos dor de cabeça. Mais organização.
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Sabemos que seu tempo é precioso. O MeuBarbeiro resolve os problemas que travam o crescimento do seu negócio.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Clock,
                problem: 'Agendamentos dispersos',
                solution: 'Chega de anotar em papel ou se perder no WhatsApp. Centralize tudo em um clique.',
                color: 'emerald',
                delay: 0
              },
              {
                icon: BarChart3,
                problem: 'Financeiro no escuro',
                solution: 'Saiba exatamente quanto você ganha em tempo real, sem planilhas complexas.',
                color: 'sky',
                delay: 0.1
              },
              {
                icon: ShoppingCart,
                problem: 'Mini loja pronta pra vender',
                solution: 'Controle seu estoque e receba vendas no whatsapp automaticamente.',
                color: 'purple',
                delay: 0.2
              },
              {
                icon: Smartphone,
                problem: 'Falta de agilidade',
                solution: 'Tenha o controle da sua barbearia na palma da mão, onde quer que você esteja.',
                color: 'amber',
                delay: 0.3
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: item.delay }}
                whileHover={{ y: -5, borderColor: 'rgba(16, 185, 129, 0.3)' }}
                className="glass-card rounded-2xl p-8 transition-colors group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className={`inline-flex p-4 bg-${item.color}-500/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-8 h-8 text-${item.color}-500`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{item.problem}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{item.solution}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}

      {/* How it Works / Step by Step */}
      <section className="py-24 px-6 relative bg-slate-950 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full z-0"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Setup Rápido</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              Comece em 3 passos simples
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Sua barbearia digital pronta para receber agendamentos em menos de 5 minutos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: '01',
                title: 'Cadastre seu Negócio',
                description: 'Crie sua conta e configure os dados básicos da sua barbearia com facilidade.',
                icon: Store,
                color: 'emerald'
              },
              {
                step: '02',
                title: 'Defina seus Serviços',
                description: 'Adicione sua vitrine de serviços, preços e sua equipe de barbeiros craques.',
                icon: Scissors,
                color: 'sky'
              },
              {
                step: '03',
                title: 'Abra sua Agenda',
                description: 'Compartilhe seu link exclusivo e veja sua agenda encher automaticamente.',
                icon: Zap,
                color: 'emerald'
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative group"
              >
                {/* Visual Step Number Backdrop */}
                <div className="absolute -top-10 -left-6 text-8xl font-black text-white/[0.03] select-none group-hover:text-emerald-500/10 transition-colors duration-500">
                  {item.step}
                </div>

                <motion.div
                  whileHover={{ y: -5 }}
                  className="glass-card rounded-3xl p-10 hover:border-emerald-500/30 transition-all duration-500 relative z-10 overflow-hidden"
                >
                  <div className={`p-4 bg-${item.color}-500/10 rounded-2xl inline-flex mb-8 group-hover:scale-110 transition-transform duration-500`}>
                    <item.icon className={`w-8 h-8 text-${item.color}-400`} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>

                  {/* Decorative dot */}
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-slate-800 group-hover:bg-emerald-500 transition-colors"></div>
                </motion.div>

                {/* Arrow Connector (Desktop) */}
                {index < 2 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 translate-y-[-50%] z-20">
                    <ArrowRight className="w-8 h-8 text-slate-800 group-hover:text-emerald-500/50 transition-all" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {/*
      <section id="depoimentos" className="py-24 px-6 relative bg-slate-950 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/5 blur-[150px] rounded-full z-0"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-full mb-4">
              <Star className="w-4 h-4 text-sky-400 fill-sky-400" />
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Confiança Total</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              O que dizem nossos parceiros
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Junte-se a centenas de donos de barbearias que já mudaram de nível com o MeuBarbeiro.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: 'Carlos Silva',
                role: 'Proprietário - Barber Shop Premium',
                content: 'Depois que implementamos o MeuBarbeiro, nosso faturamento aumentou 40% em 3 meses. O agendamento online reduziu drasticamente as faltas.',
                avatar: 'https://i.pravatar.cc/80?u=carlos',
                rating: 5,
                featured: true
              },
              {
                name: 'Rafael Costa',
                role: 'Vintage Barber Shop',
                content: 'Sistema intuitivo e suporte nota 10. Minha equipe se adaptou em menos de uma semana. Recomendo!',
                avatar: 'https://i.pravatar.cc/80?u=rafael',
                rating: 5,
                featured: false
              },
              {
                name: 'Marcelo Oliveira',
                role: 'Classic Cut',
                content: 'O controle financeiro e de estoque é perfeito. Pela primeira vez tenho visão real do meu lucro no final do mês.',
                avatar: 'https://i.pravatar.cc/80?u=marcelo',
                rating: 5,
                featured: false
              },
              {
                name: 'André Santos',
                role: 'Santos Barber',
                content: 'Meus clientes adoraram a facilidade de agendar pelo WhatsApp. O volume de ligações caiu 80%.',
                avatar: 'https://i.pravatar.cc/80?u=andre',
                rating: 5,
                featured: false
              },
              {
                name: 'Bruno Lima',
                role: 'Urban Style House',
                content: 'A automação de comissões economizou horas do meu tempo. Hoje foco no que importa: atender meus clientes.',
                avatar: 'https://i.pravatar.cc/80?u=bruno',
                rating: 5,
                featured: false
              }
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className={`glass-card rounded-3xl p-10 flex flex-col justify-between hover:border-sky-500/30 transition-all duration-300 ${t.featured ? 'lg:col-span-1 border-sky-500/20 bg-slate-900/40' : ''}`}
              >
                <div>
                  <div className="flex gap-1 mb-6">
                    {[...Array(t.rating)].map((_, starI) => (
                      <Star key={starI} className="w-4 h-4 fill-sky-400 text-sky-400" />
                    ))}
                  </div>
                  <p className="text-lg text-slate-300 leading-relaxed mb-8 italic">
                    "{t.content}"
                  </p>
                </div>
                <div className="flex items-center gap-4 border-t border-slate-800/50 pt-6">
                  <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-2xl border-2 border-slate-800 group-hover:border-sky-500 transition-colors" />
                  <div>
                    <p className="font-bold text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Pricing */}
      <section id="precos" className="py-24 px-6 relative bg-slate-950 overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-[500px] bg-emerald-500/5 blur-[150px] rounded-full z-0"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              Plano Completo para sua barbearia
            </h2>
            <p className="text-xl text-slate-400 mb-10">
              Tudo o que você precisa em uma única assinatura simples e transparente.
            </p>
          </div>

          <div className="flex justify-center max-w-6xl mx-auto">
            {[
              {
                name: 'Profissional',
                desc: 'Plano único com todos os recursos liberados para sua barbearia decolar.',
                price: "59,90",
                features: [
                  'Até 3 barbeiros (Proprietário + 2)',
                  'Agendamentos ilimitados',
                  'Gestão de estoque (PDV)',
                  'Relatórios avançados',
                  'Comissões automatizadas',
                  'Notificações WhatsApp',
                  'Cartão Fidelidade Digital'
                ],
                cta: 'Começar Agora',
                highlight: true
              }
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                whileHover={{ y: -12, scale: 1.05 }}
                className="glass-card rounded-3xl p-10 flex flex-col relative transition-all duration-300 border-emerald-500/50 shadow-2xl shadow-emerald-500/10 z-10 bg-slate-900/40 max-w-md w-full"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                  Plano Único
                </div>

                <div className="mb-8 text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{plan.desc}</p>
                </div>

                <div className="mb-8 flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black text-white">R$ {plan.price}</span>
                  <span className="text-slate-500 text-sm">/mês</span>
                </div>

                <div className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, fIndex) => (
                    <div key={fIndex} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-slate-400 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/register"
                  className="w-full py-4 rounded-xl font-bold transition-all text-center bg-emerald-600 text-white hover:bg-emerald-500 shadow-xl shadow-emerald-500/20"
                >
                  {plan.cta}
                </Link>
                <div className="mt-4 flex items-center justify-center gap-1.5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pagamento Seguro via Cakto</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Footer */}
      <div className="mt-12 text-center">
        <p className="text-slate-400 mb-4">
          Todos os planos incluem <span className="text-emerald-500 font-semibold">7 dias de teste grátis</span> • Sem cartão de crédito
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Pagamento via Cakto</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Cancele quando quiser</span>
          </div>
          <div className="flex items-center gap-2">
            <HeadphonesIcon className="w-4 h-4" />
            <span>Suporte em Português</span>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 relative bg-slate-950">
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full z-0"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              Perguntas Frequentes
            </h2>
            <p className="text-xl text-slate-400">
              Tudo o que você precisa saber para começar.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              {
                q: 'Como funciona o período de teste gratuito?',
                a: 'Você tem 7 dias para explorar todas as funcionalidades do sistema. Não pedimos cartão de crédito para começar.'
              },
              {
                q: 'Como meus clientes agendam um horário?',
                a: 'Seus clientes acessam seu link exclusivo, escolhem o serviço e o horário disponível em tempo real. Tudo é simples, rápido e sem precisar de nenhum aplicativo.'
              },
              {
                q: 'Meus dados estão seguros?',
                a: 'Utilizamos criptografia de nível bancário e seguimos rigorosamente a LGPD para garantir a total privacidade dos seus dados.'
              },
              {
                q: 'Como recebo suporte?',
                a: 'Nosso time está disponível via chat interno e WhatsApp para ajudar você em qualquer dúvida na configuração.'
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="glass-card rounded-2xl overflow-hidden transition-all hover:bg-slate-900/60"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left"
                >
                  <span className="text-lg font-bold text-white transition-colors group-hover:text-emerald-400">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${openFaq === index ? 'rotate-180 text-emerald-500' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-8 pb-6">
                        <p className="text-slate-400 leading-relaxed border-t border-slate-800 pt-4">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto glass-card rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent z-0"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-tight">
              Comece a transformar sua <br />
              <span className="text-emerald-500">barbearia hoje</span>
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Profissionalize sua gestão e ofereça uma experiência digital incrível para seus clientes desde o primeiro dia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/register"
                  className="px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-2xl shadow-emerald-500/20 block"
                >
                  Criar Minha Conta Grátis
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <a
                  href="#precos"
                  className="px-10 py-5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all block"
                >
                  Ver Planos
                </a>
              </motion.div>
            </div>
            <p className="text-sm text-slate-500 mt-8 font-medium">
              Acesso imediato • Sem fidelidade • Setup em 5 minutos
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="pt-24 pb-12 px-6 border-t border-slate-900 bg-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">
            <div className="col-span-2 space-y-8">
              <Link to="/" className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
                  <Scissors className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-black text-white tracking-tighter">MeuBarbeiro</span>
              </Link>
              <p className="text-slate-500 max-w-xs leading-relaxed">
                A plataforma definitiva para barbeiros modernos que buscam excelência em gestão e atendimento.
              </p>
              <div className="flex gap-4">
                {/* Social icons could go here */}
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Produto</h4>
              <ul className="space-y-4 text-sm text-slate-500 font-medium">
                <li><a href="#recursos" className="hover:text-emerald-500 transition-colors">Recursos</a></li>
                <li><a href="#precos" className="hover:text-emerald-500 transition-colors">Preços</a></li>
                <li><a href="#depoimentos" className="hover:text-emerald-500 transition-colors">Depoimentos</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Suporte</h4>
              <ul className="space-y-4 text-sm text-slate-500 font-medium">
                <li><a href="#faq" className="hover:text-emerald-500 transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">WhatsApp</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">Comunidade</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Legal</h4>
              <ul className="space-y-4 text-sm text-slate-500 font-medium">
                <li><a href="#" className="hover:text-emerald-500 transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">LGPD</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-slate-600 font-medium text-center md:text-left">
              © 2026 MeuBarbeiro. Desenvolvido para transformar negócios.
            </p>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-widest">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Security Verified</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
