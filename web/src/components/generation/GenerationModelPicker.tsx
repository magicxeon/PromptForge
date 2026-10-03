import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Cpu, Search } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type GenerationModelOption = {
  providerId: string;
  modelId: string;
  providerLabel: string;
  modelLabel: string;
  disabledReason?: string | null;
};

const optionKey = (option: { providerId: string; modelId: string }) =>
  JSON.stringify([option.providerId, option.modelId]);

export function GenerationModelPicker({ options, providerId, modelId, onChange, labelAction }: {
  options: GenerationModelOption[];
  providerId: string;
  modelId: string;
  labelAction?: ReactNode;
  onChange: (selection: { providerId: string; modelId: string }) => void;
}) {
  const { t } = useTranslation('playground');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tabDestination = useRef<HTMLElement | null>(null);
  const tabExit = useRef(false);
  const initialFocusPending = useRef(false);
  const selected = options.find(option => option.providerId === providerId && option.modelId === modelId);
  const filtered = options.filter(option => `${option.modelLabel} ${option.providerLabel}`
    .toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const selectedValue = optionKey({ providerId, modelId });

  function exitWithTab(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    event.stopPropagation();
    // Radix menus consume Tab; return to the form's tab order instead.
    const scope = triggerRef.current?.closest('[role="dialog"]') || document;
    const formControls = Array.from(scope.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, a[href], [tabindex="0"]'
    )).filter(element => element.tabIndex >= 0 && !element.matches(':disabled')
      && element.getClientRects().length > 0 && !contentRef.current?.contains(element));
    const index = formControls.indexOf(triggerRef.current!);
    tabDestination.current = formControls[index + (event.shiftKey ? -1 : 1)]
      || (scope !== document ? formControls[event.shiftKey ? formControls.length - 1 : 0] : triggerRef.current) || null;
    tabExit.current = true;
    setOpen(false);
  }

  return <div className="generation-model-picker">
    <div className="generation-model-picker__heading">
      <span className="generation-option-label">{t('playground.engine.model')}</span>
      {labelAction}
    </div>
    <DropdownMenu.Root modal={false} open={open} onOpenChange={next => {
      setOpen(next);
      if (next) { setSearch(''); tabExit.current = false; initialFocusPending.current = true; }
    }}>
      <DropdownMenu.Trigger ref={triggerRef} className="generation-model-picker__trigger"
        aria-label={t('playground.engine.model')}>
        <Cpu aria-hidden="true" />
        <span className="generation-model-picker__value">
          <strong>{selected?.modelLabel || modelId || t('playground.options.chooseModel')}</strong>
          <small>{selected?.providerLabel || providerId}</small>
        </span>
        <ChevronDown aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content ref={contentRef} className="generation-model-picker__menu"
          align="start" sideOffset={6} collisionPadding={12}
          onFocus={event => {
            if (event.target !== event.currentTarget || !initialFocusPending.current) return;
            initialFocusPending.current = false;
            event.preventDefault();
            searchRef.current?.focus({ preventScroll: true });
          }}
          onPointerMoveCapture={event => {
            if (document.activeElement === searchRef.current) event.stopPropagation();
          }}
          onKeyDownCapture={exitWithTab}
          onKeyDown={event => {
            if (event.key === 'ArrowUp' && event.target === contentRef.current?.querySelector('[role="menuitemradio"]:not([data-disabled])')) {
              event.preventDefault(); event.stopPropagation(); searchRef.current?.focus();
            }
          }}
          onCloseAutoFocus={event => {
            if (!tabExit.current) return;
            event.preventDefault();
            tabDestination.current?.focus();
            tabExit.current = false;
          }}>
          <div className="generation-model-picker__search">
            <Search aria-hidden="true" />
            <input ref={searchRef} type="search" value={search}
              aria-label={t('playground.options.searchModels')}
              placeholder={t('playground.options.searchModels')}
              onChange={event => setSearch(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Escape' || event.key === 'Tab') return;
                event.stopPropagation();
                if (event.key === 'ArrowDown' && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  contentRef.current?.querySelector<HTMLElement>('[role="menuitemradio"]:not([data-disabled])')?.focus();
                }
              }} />
          </div>
          <DropdownMenu.RadioGroup value={selectedValue} aria-label={t('playground.engine.model')}
            onValueChange={key => {
              const option = options.find(item => optionKey(item) === key);
              if (option && !option.disabledReason) onChange({ providerId: option.providerId, modelId: option.modelId });
            }}>
            {filtered.map(option => <DropdownMenu.RadioItem key={optionKey(option)} value={optionKey(option)}
              disabled={Boolean(option.disabledReason)} className="generation-model-picker__item"
              onPointerLeave={event => {
                if (document.activeElement === searchRef.current) event.preventDefault();
              }}>
              <DropdownMenu.ItemIndicator className="generation-model-picker__check"><Check aria-hidden="true" /></DropdownMenu.ItemIndicator>
              <span><strong>{option.modelLabel}</strong><small>{option.providerLabel}</small>
                {option.disabledReason ? <small className="generation-model-picker__reason">{option.disabledReason}</small> : null}
              </span>
            </DropdownMenu.RadioItem>)}
          </DropdownMenu.RadioGroup>
          {!filtered.length ? <p className="generation-model-picker__empty" role="status">{t('playground.options.noModels')}</p> : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
    {!selected || selected.disabledReason ? <small className="generation-option-warning" role="status">
      {selected?.disabledReason || t('playground.options.modelUnavailable')}
    </small> : null}
  </div>;
}
