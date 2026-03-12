
import React, { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from './UI';
import { CheckoutModal } from './CheckoutModal';
import { Service } from '../types';

interface VendaExpressaButtonProps {
  services: Service[];
  onComplete?: () => void;
  className?: string;
}

export const VendaExpressaButton: React.FC<VendaExpressaButtonProps> = ({ 
  services, 
  onComplete,
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        className={`flex items-center gap-2 font-bold shadow-lg shadow-emerald-500/20 ${className}`}
      >
        <ShoppingBag size={18} />
        <span className="hidden sm:inline">Venda Rápida</span>
        <span className="sm:hidden">Venda</span>
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
