import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'warning' | 'danger' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastCallback: ((msg: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info') {
  toastCallback?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    toastCallback = (message, type) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 2500);
    };
    return () => { toastCallback = null; };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}
