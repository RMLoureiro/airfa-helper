/**
 * Minimal global toast.
 * - `showToast(message)` can be called from anywhere (React or plain modules like authFetch).
 * - It dispatches a window CustomEvent that the mounted <Toast /> component listens for.
 * No dependencies, SSR-safe (no-op on the server).
 */

export const TOAST_EVENT = 'airfa:toast';

export type ToastDetail = {
  message: string;
  variant?: 'error' | 'info';
};

export function showToast(message: string, variant: ToastDetail['variant'] = 'error'): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, variant } }));
}
