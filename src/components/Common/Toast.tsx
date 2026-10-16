import React, { useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import s from "./Toast.module.css";

export interface ToastMessage {
  id: string;
  type: "success" | "info" | "warning";
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className={s.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => {
      dismissRef.current(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id]);

  const icon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle2 size={16} className={s.iconSuccess} />;
      case "warning":
        return <AlertCircle size={16} className={s.iconWarning} />;
      case "info":
      default:
        return <Info size={16} className={s.iconInfo} />;
    }
  };

  return (
    <div className={`${s.toast} ${s[toast.type]}`}>
      <div className={s.iconWrapper}>{icon()}</div>
      <div className={s.content}>
        <div className={s.title}>{toast.title}</div>
        {toast.message && <div className={s.message}>{toast.message}</div>}
      </div>
      <button className={s.closeBtn} onClick={() => onDismiss(toast.id)}>
        <X size={13} />
      </button>
    </div>
  );
};
