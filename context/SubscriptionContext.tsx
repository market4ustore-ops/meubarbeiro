import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Subscription, SaaSPlan, FeatureKey, PlanFeatures } from '../types';

interface SubscriptionContextType {
    subscription: Subscription | null;
    plan: SaaSPlan | null;
    loading: boolean;
    error: string | null;

    // Feature gates
    canUse: (feature: FeatureKey) => boolean;
    canAddBarbers: (count: number) => boolean;
    canAddProducts: (count: number) => boolean;
    getCurrentBarberCount: () => Promise<number>;
    getCurrentProductCount: () => Promise<number>;

    // Upgrade modal
    showUpgradeModal: (feature?: FeatureKey) => void;
    hideUpgradeModal: () => void;
    isUpgradeModalOpen: boolean;
    blockedFeature: FeatureKey | null;

    // Trial and Expiration
    trialEndsAt: Date | null;
    isTrialActive: boolean;
    isTrialExpired: boolean;
    isSubscriptionExpired: boolean;
    isAccessBlocked: boolean;
    isReadOnly: boolean;
    getDaysRemaining: () => number | null;

    // Refresh
    refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Default features for when there's no subscription (trial mode)
const DEFAULT_TRIAL_FEATURES: PlanFeatures = {
    whatsapp: false,
    inventory: false,
    reports: false,
    digitalCard: false,
    multiBranch: false,
};

const DEFAULT_MAX_BARBERS_TRIAL = 2;

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [plan, setPlan] = useState<SaaSPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
    const [isTrialExpired, setIsTrialExpired] = useState(false);
    const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
    const [tenantStatus, setTenantStatus] = useState<'ACTIVE' | 'TRIAL' | 'SUSPENDED'>('ACTIVE');

    // Upgrade modal state
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [blockedFeature, setBlockedFeature] = useState<FeatureKey | null>(null);

    // Helper to map DB plan to SaaSPlan
    const mapPlanFromDB = (dbPlan: any): SaaSPlan => ({
        ...dbPlan,
        billingCycle: dbPlan.billing_cycle,
        maxBarbers: dbPlan.max_barbers,
        maxProducts: dbPlan.max_products,
    });

    const fetchSubscription = useCallback(async () => {
        if (!profile?.tenant_id) {
            setSubscription(null);
            setPlan(null);
            setLoading(false);
            return;
        }

        try {
            // Fetch subscription, plan AND tenant trial data
            const [subResponse, tenantResponse] = await Promise.all([
                supabase
                    .from('subscriptions')
                    .select(`*, plan:saas_plans(*)`)
                    .eq('tenant_id', profile.tenant_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from('tenants')
                    .select('plan_id, trial_ends_at, status')
                    .eq('id', profile.tenant_id)
                    .single()
            ]);

            if (subResponse.error) throw subResponse.error;
            if (tenantResponse.error) throw tenantResponse.error;

            const subData = subResponse.data;
            const tenantData = tenantResponse.data;

            // Handle Trial Data
            if (tenantData?.trial_ends_at) {
                const endsAt = new Date(tenantData.trial_ends_at);
                setTrialEndsAt(endsAt);
                setIsTrialExpired(endsAt < new Date() && tenantData.status === 'TRIAL');
            } else if (!subData && (tenantData.status === 'TRIAL' || tenantData.status === 'ACTIVE')) {
                // FALLBACK: If no subscription and no trial date, assume a 7-day trial from creation or now
                const fallbackDate = new Date();
                fallbackDate.setDate(fallbackDate.getDate() + 7);
                setTrialEndsAt(fallbackDate);
                setIsTrialExpired(false);
            } else {
                setTrialEndsAt(null);
                setIsTrialExpired(false);
            }

            if (tenantData?.status) {
                setTenantStatus(tenantData.status as any);
            }

            if (subData) {
                setSubscription(subData as unknown as Subscription);
                setPlan(mapPlanFromDB(subData.plan));
                setIsSubscriptionExpired(subData.status === 'expired' || subData.status === 'cancelled');
            } else {
                // No subscription found - check if tenant has a default plan
                if (tenantData?.plan_id) {
                    const { data: planData } = await supabase
                        .from('saas_plans')
                        .select('*')
                        .eq('id', tenantData.plan_id)
                        .maybeSingle();

                    if (planData) {
                        setPlan(mapPlanFromDB(planData));
                    }
                }
                setSubscription(null);
            }
        } catch (err) {
            console.error('Error fetching subscription:', err);
            setError(err instanceof Error ? err.message : 'Erro ao carregar assinatura');
        } finally {
            setLoading(false);
        }
    }, [profile?.tenant_id]);

    // Initial fetch
    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    // Realtime subscription for updates
    useEffect(() => {
        if (!profile?.tenant_id) return;

        const channel = supabase
            .channel(`subscriptions:tenant_id=eq.${profile.tenant_id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'subscriptions',
                    filter: `tenant_id=eq.${profile.tenant_id}`
                },
                () => {
                    fetchSubscription();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.tenant_id, fetchSubscription]);

    // Helper for active trial
    // Helper for active trial - More inclusive
    const isTrialActive = !subscription && (tenantStatus === 'TRIAL' || tenantStatus === 'ACTIVE') && (!!trialEndsAt && trialEndsAt > new Date());

    // Helper for read-only mode (expired but not suspended)
    const isReadOnly = (isTrialExpired || isSubscriptionExpired) && tenantStatus !== 'SUSPENDED';

    // Access is only fully blocked if suspended
    const isAccessBlocked = tenantStatus === 'SUSPENDED';

    // Days remaining calculation
    const getDaysRemaining = useCallback((): number | null => {
        const targetDate = subscription?.current_period_end
            ? new Date(subscription.current_period_end)
            : trialEndsAt;

        if (!targetDate) return null;

        // Reset hours to midnight for both dates to get a clean day difference
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date(targetDate);
        end.setHours(0, 0, 0, 0);

        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 0 ? diffDays : 0;
    }, [subscription?.current_period_end, trialEndsAt]);

    // Feature gate functions
    const canUse = useCallback((feature: FeatureKey): boolean => {
        // Full access during active trial
        if (isTrialActive) return true;

        if (!plan) {
            // No plan AND no trial = block features
            return DEFAULT_TRIAL_FEATURES[feature] ?? false;
        }

        const features = plan.features as PlanFeatures;
        return features?.[feature] ?? false;
    }, [plan, isTrialActive]);

    const canAddBarbers = useCallback((count: number): boolean => {
        // Full access during active trial (Professional limits)
        if (isTrialActive) {
            return count < 3; // Owner + 2
        }

        if (!plan) {
            return count <= DEFAULT_MAX_BARBERS_TRIAL;
        }

        if (plan.maxBarbers === 'UNLIMITED') {
            return true;
        }

        // maxBarbers = 3 means Owner + 2 Barbers
        return count < (plan.maxBarbers as number);
    }, [plan]);

    const canAddProducts = useCallback((count: number): boolean => {
        if (!plan) {
            return count < 10; // Trial limit
        }

        const maxProducts = plan.maxProducts || 50;
        if (maxProducts === 'UNLIMITED') return true;

        return count < (maxProducts as number);
    }, [plan]);

    const getCurrentBarberCount = useCallback(async (): Promise<number> => {
        if (!profile?.tenant_id) return 0;

        const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id)
            .in('role', ['OWNER', 'BARBER']);

        return count ?? 0;
    }, [profile?.tenant_id]);

    const getCurrentProductCount = useCallback(async (): Promise<number> => {
        if (!profile?.tenant_id) return 0;

        const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id);

        return count ?? 0;
    }, [profile?.tenant_id]);

    // Upgrade modal functions
    const showUpgradeModal = useCallback((feature?: FeatureKey) => {
        setBlockedFeature(feature ?? null);
        setIsUpgradeModalOpen(true);
    }, []);

    const hideUpgradeModal = useCallback(() => {
        setIsUpgradeModalOpen(false);
        setBlockedFeature(null);
    }, []);

    const refreshSubscription = useCallback(async () => {
        await fetchSubscription();
    }, [fetchSubscription]);

    const value: SubscriptionContextType = {
        subscription,
        plan,
        loading,
        error,
        canUse,
        canAddBarbers,
        canAddProducts,
        getCurrentBarberCount,
        getCurrentProductCount,
        showUpgradeModal,
        hideUpgradeModal,
        isUpgradeModalOpen,
        blockedFeature,
        trialEndsAt,
        isTrialActive,
        isTrialExpired,
        isSubscriptionExpired,
        isAccessBlocked,
        isReadOnly,
        getDaysRemaining,
        refreshSubscription,
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
