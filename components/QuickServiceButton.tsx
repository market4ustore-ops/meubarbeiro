
import React, { useState, useEffect } from 'react';
import { Scissors, Plus } from 'lucide-react';
import { Button } from './UI';
import { CheckoutModal } from './CheckoutModal';
import { Service } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface QuickServiceButtonProps {
  onComplete?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const QuickServiceButton: React.FC<QuickServiceButtonProps> = ({ 
  onComplete,
  className,
  variant = 'primary',
  size = 'md'
}) => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  const fetchServices = async () => {
    if (!profile?.tenant_id) return;
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('active', true);
    
    if (data) setServices(data);
  };

  useEffect(() => {
    if (isOpen) fetchServices();
  }, [isOpen]);

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        variant={variant}
        size={size}
        className={`flex items-center gap-2 font-bold shadow-lg shadow-emerald-500/20 ${className}`}
      >
        <Scissors size={18} />
        <span>Atendimento Rápido</span>
      </Button>

      <CheckoutModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        services={services}
        onComplete={onComplete || (() => {})}
      />
    </>
  );
};
