import { useSyncExternalStore } from 'react';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export type AppToast = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
};

let toasts: AppToast[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, number>();

function emit() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showToast(input: Omit<AppToast, 'id'> & { durationMs?: number }) {
  const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { durationMs = input.tone === 'error' ? 8000 : 4500, ...toast } = input;
  toasts = [...toasts.slice(-3), { ...toast, id }];
  emit();
  timers.set(id, window.setTimeout(() => dismissToast(id), durationMs));
  return id;
}

export function dismissToast(id: string) {
  const timer = timers.get(id);
  if (timer) window.clearTimeout(timer);
  timers.delete(id);
  toasts = toasts.filter(toast => toast.id !== id);
  emit();
}

export function useAppToasts() {
  return useSyncExternalStore(subscribe, () => toasts, () => []);
}
