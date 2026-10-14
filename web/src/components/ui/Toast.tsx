"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "loading";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  txHash?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, "id">) => string;
  updateToast: (id: string, updates: Partial<ToastMessage>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastMessage = { ...toast, id };

      setToasts((prev) => [newToast, ...prev]);

      if (toast.type !== "loading" && toast.duration !== 0) {
        const timeout = toast.duration || 5000;
        setTimeout(() => {
          dismissToast(id);
        }, timeout);
      }

      return id;
    },
    [dismissToast]
  );

  const updateToast = useCallback(
    (id: string, updates: Partial<ToastMessage>) => {
      setToasts((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const updated = { ...t, ...updates };
            if (updated.type !== "loading" && updated.duration !== 0) {
              const timeout = updated.duration || 5000;
              setTimeout(() => {
                dismissToast(id);
              }, timeout);
            }
            return updated;
          }
          return t;
        })
      );
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, updateToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2.5 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-200"
        >
          {/* Icon */}
          <div className="shrink-0 mt-0.5">
            {toast.type === "success" && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20 text-xs font-bold">
                ✓
              </span>
            )}
            {toast.type === "error" && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-500/20 text-xs font-bold">
                ✕
              </span>
            )}
            {toast.type === "info" && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 text-xs font-bold">
                ℹ
              </span>
            )}
            {toast.type === "loading" && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 text-xs">
            <h4 className="font-bold text-slate-900">{toast.title}</h4>
            {toast.message && (
              <p className="mt-0.5 leading-relaxed text-slate-600 break-words">
                {toast.message}
              </p>
            )}
            {toast.txHash && (
              <a
                href={`https://explorer.solana.com/tx/${toast.txHash}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 font-mono font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                <span>View Solana Tx ({toast.txHash.slice(0, 6)}...)</span>
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                </svg>
              </a>
            )}
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss alert"
            className="shrink-0 text-slate-400 hover:text-slate-600 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

