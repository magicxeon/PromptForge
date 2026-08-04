import { Download, Dices, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

export function StudioConfiguratorActions({
  onReset,
  onRandomize,
  onExport,
  randomizeDisabled = false,
  showRandomize = true,
  showExport = true
}: {
  onReset: () => void;
  onRandomize: () => void;
  onExport: () => void;
  randomizeDisabled?: boolean;
  showRandomize?: boolean;
  showExport?: boolean;
}) {
  const { t } = useTranslation('react-ui');
  return (
    <div className={`studio-configurator-actions${!showRandomize && !showExport ? ' is-single' : ''}`}>
      {showRandomize ? <Button
        size="sm"
        variant="ghost"
        icon={<RotateCcw aria-hidden="true" />}
        onClick={onReset}
      >
        {t('ui.studio.reset')}
      </Button> : null}
      {showExport ? <Button
        size="sm"
        variant="secondary"
        icon={<Dices aria-hidden="true" />}
        disabled={randomizeDisabled}
        onClick={onRandomize}
      >
        {t('ui.studio.surprise')}
      </Button> : null}
      <Button
        size="sm"
        variant="secondary"
        icon={<Download aria-hidden="true" />}
        onClick={onExport}
      >
        {t('ui.studio.export')}
      </Button>
    </div>
  );
}
