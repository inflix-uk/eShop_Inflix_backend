'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { makeStore } from '@/app/lib/store';
import { persistStore } from 'redux-persist';
import { AuthProvider } from './context/Auth';
import { ToastContainer } from 'react-toastify';
import { TrustpilotProvider } from './providers/TrustpilotProvider';
import { useMemo } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Ensure store and persistor are stable across renders
  const store = useMemo(() => makeStore(), []);
  const persistor = useMemo(() => persistStore(store), [store]);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <TrustpilotProvider>
            {children}
            <ToastContainer 
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </TrustpilotProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}
