import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dismissToast, useAppToasts, type ToastTone } from './toastStore';

const icons = {
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
  error: CircleAlert
} satisfies Record<ToastTone, typeof Info>;

export function ToastViewport() {
  const { t } = useTranslation('react-ui');
  const toasts = useAppToasts();

  return (
    <aside className="app-toast-viewport" aria-label={t('ui.toast.notifications')}>
      {toasts.map(toast => {
        const Icon = icons[toast.tone];
        return (
          <section
            key={toast.id}
            className={`app-toast is-${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            <Icon className="app-toast__icon" aria-hidden="true" />
            <div>
              <strong>{toast.title}</strong>
              {toast.description ? <p>{toast.description}</p> : null}
            </div>
            <button
              type="button"
              className="app-toast__close"
              aria-label={t('ui.action.close')}
              onClick={() => dismissToast(toast.id)}
            >
              <X aria-hidden="true" />
            </button>
          </section>
        );
      })}
    </aside>
  );
}
