
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading,
  className,
  ...props
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-100",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-300"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string, icon?: React.ReactNode }> = ({
  label,
  icon,
  className,
  ...props
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="text-sm font-medium text-slate-400">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>}
        <input
          className={`w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 ${icon ? 'pl-10' : 'px-4'} pr-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${className}`}
          {...props}
        />
      </div>
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`bg-slate-900/50 border border-slate-800 rounded-xl ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{
  children: React.ReactNode,
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'secondary',
  className?: string,
  style?: React.CSSProperties
}> = ({ children, variant = 'info', className, style }) => {
  const variants = {
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    danger: "bg-red-500/10 text-red-500 border-red-500/20",
    info: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    secondary: "bg-slate-500/10 text-slate-400 border-slate-500/20"
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant]} ${className || ''}`}
      style={style}
    >
      {children}
    </span>
  );
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg'
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`relative bg-slate-950 border border-slate-800 rounded-2xl w-full ${maxWidth} shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col`}>
        <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white hover:bg-slate-900 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className }) => (
  <Card className={`p-12 flex flex-col items-center justify-center text-center space-y-4 bg-slate-900/20 border-slate-800/50 border-dashed ${className}`}>
    <div className="p-4 bg-slate-800/50 rounded-full text-slate-500">
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-bold text-slate-200">{title}</h3>
      <p className="text-slate-500 text-sm max-w-xs mx-auto">{description}</p>
    </div>
    {action && <div className="pt-2">{action}</div>}
  </Card>
);
