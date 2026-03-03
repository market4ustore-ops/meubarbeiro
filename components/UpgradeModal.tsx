import React, { useEffect, useState } from 'react';
import { X, Crown, Check, ArrowRight, Sparkles } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase } from '../lib/supabase';
import type { SaaSPlan, FeatureKey } from '../types';

const FEATURE_LABELS: Record<FeatureKey, { label: string; description: string }> = {
    whatsapp: {
        label: 'Integração WhatsApp',
        description: 'Envie lembretes e confirmações automáticas via WhatsApp'
    },
    inventory: {
        label: 'Controle de Estoque',
        description: 'Gerencie produtos e controle de estoque da sua barbearia'
    },
    reports: {
        label: 'Relatórios Avançados',
        description: 'Acesse relatórios detalhados de vendas, agendamentos e performance'
    },
    digitalCard: {
        label: 'Cartão Digital',
        description: 'Ofereça cartão de fidelidade digital para seus clientes'
    },
    multiBranch: {
        label: 'Múltiplas Filiais',
        description: 'Gerencie múltiplas unidades da sua barbearia em um só lugar'
    },
};

export const UpgradeModal: React.FC = () => {
    const { isUpgradeModalOpen, hideUpgradeModal, blockedFeature, plan: currentPlan } = useSubscription();
    const [plans, setPlans] = useState<SaaSPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isUpgradeModalOpen) {
            fetchPlans();
        }
    }, [isUpgradeModalOpen]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('saas_plans')
                .select('*')
                .eq('status', 'ACTIVE')
                .order('price', { ascending: true });

            if (error) throw error;
            setPlans(data as unknown as SaaSPlan[]);
        } catch (err) {
            console.error('Error fetching plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const getPlansWithFeature = (feature: FeatureKey): SaaSPlan[] => {
        return plans.filter(p => {
            const features = p.features as Record<string, boolean>;
            return features[feature] === true;
        });
    };

    const handleSelectPlan = (plan: SaaSPlan) => {
        // Redirecionar para a página de assinatura
        window.location.href = `/subscription?plan=${plan.id}`;
        hideUpgradeModal();
    };

    if (!isUpgradeModalOpen) return null;

    const featureInfo = blockedFeature ? FEATURE_LABELS[blockedFeature] : null;
    const recommendedPlans = blockedFeature ? getPlansWithFeature(blockedFeature) : plans;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
                className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-6 pb-4 border-b border-gray-700">
                    <button
                        onClick={hideUpgradeModal}
                        className="absolute right-4 top-4 p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg">
                            <Crown className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Faça Upgrade do seu Plano</h2>
                    </div>

                    {featureInfo && (
                        <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-amber-500/20">
                            <div className="flex items-center gap-2 text-amber-400 mb-1">
                                <Sparkles className="w-4 h-4" />
                                <span className="font-medium">{featureInfo.label}</span>
                            </div>
                            <p className="text-gray-400 text-sm">{featureInfo.description}</p>
                        </div>
                    )}
                </div>

                {/* Plans */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-gray-400 text-sm mb-4">
                                {blockedFeature
                                    ? `Esta funcionalidade está disponível nos seguintes planos:`
                                    : `Escolha o plano ideal para sua barbearia:`
                                }
                            </p>

                            {recommendedPlans.map((plan) => {
                                const isCurrentPlan = currentPlan?.id === plan.id;
                                const features = plan.features as Record<string, boolean>;

                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative p-5 rounded-xl border transition-all ${plan.isPopular
                                                ? 'border-amber-500 bg-gradient-to-br from-amber-500/10 to-orange-500/5'
                                                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                                            }`}
                                    >
                                        {plan.isPopular && (
                                            <div className="absolute -top-3 left-4 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-full">
                                                Mais Popular
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                    {plan.name}
                                                    {isCurrentPlan && (
                                                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                                                            Plano Atual
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="text-gray-400 text-sm mt-1">{plan.description}</p>

                                                {/* Feature highlights */}
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {Object.entries(features).map(([key, enabled]) => {
                                                        if (!enabled) return null;
                                                        const label = FEATURE_LABELS[key as FeatureKey]?.label;
                                                        if (!label) return null;

                                                        const isBlockedFeature = key === blockedFeature;

                                                        return (
                                                            <span
                                                                key={key}
                                                                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isBlockedFeature
                                                                        ? 'bg-amber-500/20 text-amber-400'
                                                                        : 'bg-gray-700 text-gray-300'
                                                                    }`}
                                                            >
                                                                <Check className="w-3 h-3" />
                                                                {label}
                                                            </span>
                                                        );
                                                    })}
                                                    {plan.maxBarbers !== 'UNLIMITED' && (
                                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">
                                                            Até {plan.maxBarbers} barbeiros
                                                        </span>
                                                    )}
                                                    {plan.maxBarbers === 'UNLIMITED' && (
                                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                                                            Barbeiros ilimitados
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right ml-4">
                                                <div className="text-2xl font-bold text-white">
                                                    R$ {plan.price.toFixed(2).replace('.', ',')}
                                                </div>
                                                <div className="text-sm text-gray-400">
                                                    /{plan.billingCycle === 'MONTHLY' ? 'mês' : 'ano'}
                                                </div>

                                                <button
                                                    onClick={() => handleSelectPlan(plan)}
                                                    disabled={isCurrentPlan}
                                                    className={`mt-3 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${isCurrentPlan
                                                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                            : plan.isPopular
                                                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                                                                : 'bg-gray-700 text-white hover:bg-gray-600'
                                                        }`}
                                                >
                                                    {isCurrentPlan ? 'Plano Atual' : 'Selecionar'}
                                                    {!isCurrentPlan && <ArrowRight className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-0">
                    <p className="text-center text-gray-500 text-xs">
                        Você pode cancelar ou alterar seu plano a qualquer momento.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
