"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import styles from "./Toast.module.css";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";
type ToastItem = { id: number; message: string; variant: ToastVariant };

const ToastContext = createContext<(message: string, variant?: ToastVariant) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const icons = {
    success: <CheckCircle2 size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className={styles.container}>
        {toasts.map(toast => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.variant]}`}>
            {icons[toast.variant]}
            <span>{toast.message}</span>
            <button className={styles.closeBtn} onClick={() => dismiss(toast.id)}><X size={16} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
