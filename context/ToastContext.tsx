
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextData {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((state) => state.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast = { id, message, type };

    setToasts((state) => [...state, toast]);

    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl min-w-[300px] max-w-md
              animate-in slide-in-from-right-full fade-in duration-300
              ${toast.type === 'success' ? 'bg-slate-900 border-emerald-500/50 text-emerald-500' : ''}
              ${toast.type === 'error' ? 'bg-slate-900 border-red-500/50 text-red-500' : ''}
              ${toast.type === 'warning' ? 'bg-slate-900 border-amber-500/50 text-amber-500' : ''}
              ${toast.type === 'info' ? 'bg-slate-900 border-sky-500/50 text-sky-500' : ''}
            `}
          >
            <div className="shrink-0">
              {toast.type === 'success' && <CheckCircle2 size={20} />}
              {toast.type === 'error' && <XCircle size={20} />}
              {toast.type === 'warning' && <AlertCircle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
            </div>
            
            <p className="text-sm font-semibold text-slate-100 flex-1">{toast.message}</p>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-white transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
