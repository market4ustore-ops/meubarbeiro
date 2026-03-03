import React from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import type { FeatureKey } from '../types';

interface FeatureGateProps {
    feature: FeatureKey;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showUpgradeOnClick?: boolean;
}

/**
 * FeatureGate - Componente wrapper para proteger funcionalidades baseado no plano
 * 
 * @example
 * // Com fallback customizado
 * <FeatureGate feature="inventory" fallback={<UpgradeBanner />}>
 *   <InventoryPage />
 * </FeatureGate>
 * 
 * @example
 * // Sem fallback (não renderiza nada)
 * <FeatureGate feature="whatsapp">
 *   <WhatsAppButton />
 * </FeatureGate>
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
    feature,
    children,
    fallback = null,
    showUpgradeOnClick = false,
}) => {
    const { canUse, showUpgradeModal } = useSubscription();

    if (canUse(feature)) {
        return <>{children}</>;
    }

    if (showUpgradeOnClick && !fallback) {
        return (
            <div
                onClick={() => showUpgradeModal(feature)}
                className="cursor-pointer"
            >
                {children}
            </div>
        );
    }

    return <>{fallback}</>;
};

interface BarberLimitGateProps {
    currentCount: number;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * BarberLimitGate - Componente para verificar limite de barbeiros
 * 
 * @example
 * <BarberLimitGate currentCount={barbers.length} fallback={<LimitReachedMessage />}>
 *   <AddBarberButton />
 * </BarberLimitGate>
 */
export const BarberLimitGate: React.FC<BarberLimitGateProps> = ({
    currentCount,
    children,
    fallback = null,
}) => {
    const { canAddBarbers, showUpgradeModal } = useSubscription();

    if (canAddBarbers(currentCount + 1)) {
        return <>{children}</>;
    }

    if (!fallback) {
        return (
            <div onClick={() => showUpgradeModal()} className="cursor-pointer opacity-50">
                {children}
            </div>
        );
    }

    return <>{fallback}</>;
};

export default FeatureGate;
