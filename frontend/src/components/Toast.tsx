'use client';

import { useEffect, useState } from 'react';
import { TOAST_EVENT, type ToastDetail } from '@/lib/toast';

type ActiveToast = ToastDetail & { id: number };

const DISMISS_MS = 4000;

export default function Toast() {
  const [toast, setToast] = useState<ActiveToast | null>(null);

  useEffect(() => {
    let counter = 0;
    let timer: ReturnType<typeof setTimeout>;

    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      counter += 1;
      setToast({ ...detail, id: counter });
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), DISMISS_MS);
    }

    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div className={`toast toast-${toast.variant ?? 'error'}`} key={toast.id}>
        <span className="toast-dot" aria-hidden="true" />
        <span className="toast-msg">{toast.message}</span>
        <button
          type="button"
          className="toast-close"
          aria-label="Fechar"
          onClick={() => setToast(null)}
        >
          ×
        </button>
      </div>

      <style jsx>{`
        .toast-wrap {
          position: fixed;
          left: 50%;
          bottom: max(20px, env(safe-area-inset-bottom));
          transform: translateX(-50%);
          z-index: 2000;
          width: max-content;
          max-width: min(92vw, 420px);
          pointer-events: none;
        }
        .toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.3;
          color: var(--danger);
          background: var(--danger-dim);
          border: 1px solid rgba(194, 78, 66, 0.3);
          box-shadow: var(--shadow-lg);
          backdrop-filter: blur(8px);
          pointer-events: auto;
          animation: toast-in 0.18s ease-out;
        }
        .toast-info {
          color: var(--accent-2);
          background: var(--accent-dim);
          border-color: var(--blue-tint-bd, rgba(96, 118, 255, 0.3));
        }
        .toast-dot {
          flex: 0 0 auto;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
        }
        .toast-msg {
          flex: 1 1 auto;
        }
        .toast-close {
          flex: 0 0 auto;
          border: none;
          background: transparent;
          color: inherit;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          opacity: 0.65;
          padding: 0 2px;
        }
        .toast-close:hover {
          opacity: 1;
        }
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
