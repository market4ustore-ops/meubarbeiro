import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';

registerSW({ immediate: true });

import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SubscriptionProvider } from './context/SubscriptionContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);
