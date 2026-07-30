import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import type { ReactNode } from 'react';

const toneIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2
};

export function StatusNotice({
  tone,
  title,
  children,
  action
}: {
  tone: keyof typeof toneIcons;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const Icon = toneIcons[tone];
  return (
    <section
      className={`status-notice status-notice--${tone}`}
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
    >
      <Icon className="status-notice__icon" aria-hidden="true" />
      <div className="status-notice__content">
        <strong>{title}</strong>
        {children ? <div className="status-notice__description">{children}</div> : null}
      </div>
      {action ? <div className="status-notice__action">{action}</div> : null}
    </section>
  );
}
