"use client";
import React, { useRef, useState, useEffect } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { makeStore } from "@/app/lib/store";
import { persistStore } from "redux-persist";

interface StoreProviderProps {
  children: React.ReactNode;
}

const StoreProvider = ({ children }: StoreProviderProps) => {
  const [isClient, setIsClient] = useState(false);
  const [persistor, setPersistor] = useState<ReturnType<typeof persistStore> | null>(null);

  // We use useRef to ensure the store is only created once.
  const storeRef = useRef<ReturnType<typeof makeStore>>();

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    setIsClient(true);
    if (storeRef.current) {
      setPersistor(persistStore(storeRef.current));
    }
  }, []);

  // loading={null} keeps shell + layout widgets mounted during persist rehydrate (e.g. Hot UK Deals, chat).
  return (
    <Provider store={storeRef.current}>
      {isClient && persistor ? (
        <PersistGate loading={null} persistor={persistor}>
          {children}
        </PersistGate>
      ) : (
        children
      )}
    </Provider>
  );
};
export default StoreProvider;
