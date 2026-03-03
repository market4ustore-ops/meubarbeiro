
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AppNotification } from '../types';

interface NotificationContextData {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'time' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextData>({} as NotificationContextData);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: '1',
      title: 'Bem-vindo ao MeuBarbeiro',
      message: 'Sua barbearia já está pronta para receber agendamentos.',
      time: 'Agora',
      read: false,
      type: 'info'
    },
    {
      id: '2',
      title: 'Estoque Baixo',
      message: 'A Pomada Matte está com menos de 5 unidades.',
      time: '2h atrás',
      read: false,
      type: 'warning'
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'time' | 'read'>) => {
    const newNotification: AppNotification = {
      ...n,
      id: Math.random().toString(36).substr(2, 9),
      time: 'Agora',
      read: false
    };
    setNotifications(state => [newNotification, ...state]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(state => state.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(state => state.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(state => state.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      addNotification, 
      markAsRead, 
      markAllAsRead, 
      removeNotification 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
