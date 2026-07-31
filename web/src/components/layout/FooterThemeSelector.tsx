import { Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme/ThemeContext';
import {
  themePreferences,
  type ThemePreference
} from '../../lib/theme/themeContract';

export function FooterThemeSelector() {
  const { t } = useTranslation('shell');
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <section className="site-footer__theme" aria-labelledby="footer-theme-label">
      <div className="site-footer__theme-heading">
        <Palette aria-hidden="true" />
        <div>
          <strong id="footer-theme-label">{t('shell.theme.label')}</strong>
          <small>
            {preference === 'auto'
              ? t('shell.theme.autoResolved', {
                  theme: t(`shell.theme.options.${resolvedTheme}`)
                })
              : t(`shell.theme.options.${resolvedTheme}`)}
          </small>
        </div>
      </div>
      <div
        className="site-footer__theme-options"
        role="radiogroup"
        aria-labelledby="footer-theme-label"
      >
        {themePreferences.map(theme => (
          <ThemeOption
            key={theme}
            theme={theme}
            checked={preference === theme}
            label={t(`shell.theme.options.${theme}`)}
            onSelect={setPreference}
          />
        ))}
      </div>
    </section>
  );
}

type ThemeOptionProps = {
  theme: ThemePreference;
  checked: boolean;
  label: string;
  onSelect: (theme: ThemePreference) => void;
};

function ThemeOption({
  theme,
  checked,
  label,
  onSelect
}: ThemeOptionProps) {
  return (
    <button
      type="button"
      className="site-footer__theme-option"
      role="radio"
      aria-checked={checked}
      onClick={() => onSelect(theme)}
    >
      <span
        className={`theme-swatch is-${theme}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </button>
  );
}
