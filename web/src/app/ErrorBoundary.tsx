import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { ErrorState } from '../components/ui/AsyncState';
import { createCorrelationId, emitTelemetry } from '../lib/telemetry/telemetry';
import { i18n } from '../lib/i18n/i18n';

type State = { error: Error | null; correlationId: string | null };

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null, correlationId: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, correlationId: createCorrelationId() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    emitTelemetry('render_error', {
      correlationId: this.state.correlationId,
      errorName: error.name,
      componentDepth: info.componentStack?.split('\n').length || 0
    });
    if (import.meta.env.DEV) {
      console.error('[ReactApp] Unhandled render error', error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5">
          <ErrorState
            title={i18n.t('common.error.renderTitle')}
            description={`${i18n.t('common.error.renderDescription')} ${i18n.t('common.error.reference', { id: this.state.correlationId })}`}
            retryLabel={i18n.t('common.action.reload')}
            onRetry={() => window.location.reload()}
          />
        </main>
      );
    }
    return this.props.children;
  }
}
