import { act, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { createRef, type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PlaygroundGenerationWorkspace } from './PlaygroundGenerationWorkspace';

const testI18n = i18next.createInstance();

function composerWorkspace(props: Partial<ComponentProps<typeof PlaygroundGenerationWorkspace>> = {}) {
  return <I18nextProvider i18n={testI18n}>
    <button type="button">Outside navigation</button>
    <PlaygroundGenerationWorkspace
      composer
      prompt={<textarea aria-label="Direction" defaultValue="Keep this draft" />}
      references={<input aria-label="Reference name" defaultValue="Selected reference" />}
      engine={<button type="button" aria-haspopup="menu">Choose model</button>}
      actions={<button type="button">Generate</button>}
      messages={<p role="alert">Quote needs attention</p>}
      result={<button type="button">Inspect output</button>}
      queue={<div>Queue status</div>}
      recent={<div>Recent images</div>}
      showRenderPromptHeading={false}
      recentExpanded
      onRecentExpandedChange={() => {}}
      comparisonActive={false}
      modelSummary="Selected model"
      {...props}
    />
  </I18nextProvider>;
}

function setupToggle() {
  return screen.getByRole('button', { name: /Creation settings/ });
}

function successfulAttempt(renderKey: string, sequence = 1) {
  return { completedResultKey: renderKey, submittedRenderAttempt: { sequence, renderKey, pending: false } };
}

async function focusAndFlushFrame(element: HTMLElement) {
  act(() => element.focus());
  await act(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
}

describe('PlaygroundGenerationWorkspace', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          playground: {
            'playground.result.recentTitle': 'Recent Playground renders',
            'playground.setup.title': 'Creation settings',
            'playground.setup.collapse': 'Collapse settings',
            'playground.setup.expand': 'Expand settings',
            'playground.setup.resultReady': 'Render ready'
          },
          'react-ui': {
            'ui.studio.collapseViewport': 'Minimize panel',
            'ui.studio.expandViewport': 'Open panel'
          }
        }
      },
      keySeparator: false,
      interpolation: { escapeValue: false }
    });
  });

  it('renders the task regions and delegates the recent collapse preference', () => {
    const onRecentExpandedChange = vi.fn();
    render(
      <I18nextProvider i18n={testI18n}>
        <PlaygroundGenerationWorkspace
          prompt={<div>Prompt region</div>}
          result={<div>Latest render</div>}
          queue={<div>Queue status</div>}
          recent={<div>Recent images</div>}
          engine={<div>Engine target</div>}
          references={<div>Reference images</div>}
          actions={<button type="button">Generate</button>}
          showRenderPromptHeading={false}
          recentExpanded
          onRecentExpandedChange={onRecentExpandedChange}
          comparisonActive={false}
        />
      </I18nextProvider>
    );

    expect(screen.getByText('Prompt region')).toBeInTheDocument();
    expect(screen.getByText('Latest render')).toBeInTheDocument();
    expect(screen.getByText('Engine target')).toBeInTheDocument();
    expect(screen.getByText('Reference images')).toBeInTheDocument();
    expect(screen.getByText('Recent images')).toBeVisible();
    expect(screen.getByText('Queue status')).toBeVisible();
    expect(screen.getByText('Engine target').closest('.playground-workspace__controls')).not.toBeNull();
    expect(screen.getByText('Reference images').closest('.playground-workspace__controls')).not.toBeNull();
    expect(screen.getByText('Prompt region').closest('.playground-workspace__composer')).toBeNull();
    expect(
      screen.getByText('Latest render').compareDocumentPosition(
        screen.getByText('Prompt region')
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      screen.getByText('Recent images').compareDocumentPosition(
        screen.getByText('Engine target')
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Minimize panel' }));
    expect(onRecentExpandedChange).toHaveBeenCalledWith(false);
  });

  it.each([false, true])('groups writing left and render settings right before output, queue and Recent with comparison=%s', comparisonActive => {
    const onRecentExpandedChange = vi.fn();
    const workspace = (recentExpanded: boolean) => (
      <I18nextProvider i18n={testI18n}>
        <PlaygroundGenerationWorkspace
          composer
          prompt={<textarea aria-label="Direction" defaultValue="Keep this draft" />}
          result={<div>Latest render</div>}
          queue={<div>Queue status</div>}
          recent={<div>Recent images</div>}
          recentPlacement="after-engine"
          engine={<div>Engine target</div>}
          references={<div>Reference images</div>}
          actions={<button type="button">Generate</button>}
          messages={<div role="status">Ready to generate</div>}
          showRenderPromptHeading={false}
          recentExpanded={recentExpanded}
          onRecentExpandedChange={onRecentExpandedChange}
          comparisonActive={comparisonActive}
        />
      </I18nextProvider>
    );
    const view = render(workspace(true));

    const prompt = screen.getByRole('textbox', { name: 'Direction' });
    const references = screen.getByText('Reference images');
    const engine = screen.getByText('Engine target');
    const generate = screen.getByRole('button', { name: 'Generate' });
    const composer = prompt.closest('.playground-workspace__composer');
    const tools = prompt.closest('.playground-workspace__tools-frame');
    expect(composer).not.toBeNull();
    expect(tools).not.toBeNull();
    for (const region of [references, engine]) {
      expect(composer).toContainElement(region);
      expect(region.closest('.playground-workspace__controls')).toBeNull();
    }
    const writing = prompt.closest('.playground-workspace__writing');
    const renderSettings = engine.closest('.playground-workspace__render-settings');
    expect(writing).not.toBeNull();
    expect(writing).toContainElement(references);
    expect(writing).not.toContainElement(engine);
    expect(renderSettings).not.toBeNull();
    expect(renderSettings).toContainElement(generate);
    expect(renderSettings).not.toContainElement(prompt);
    expect(generate.closest('.playground-workspace__action')).not.toBeNull();
    const messages = screen.getByText('Ready to generate');
    expect(tools).toContainElement(messages);
    expect(composer).not.toContainElement(messages);
    const orderedRegions: Array<[HTMLElement, HTMLElement]> = [[references, prompt], [prompt, engine], [engine, generate]];
    for (const [before, after] of orderedRegions) {
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    const result = screen.getByText('Latest render');
    expect(generate.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(composer).not.toContainElement(result);
    expect(screen.getAllByText('Latest render')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Generate' })).toHaveLength(1);
    const output = result.closest('.playground-workspace__output');
    expect(output).not.toBeNull();
    for (const region of [screen.getByText('Queue status'), screen.getByText('Recent images')]) {
      expect(output).toContainElement(region);
      expect(composer).not.toContainElement(region);
    }
    expect(result.compareDocumentPosition(screen.getByText('Queue status')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Queue status').compareDocumentPosition(screen.getByText('Recent images')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(result.closest('.playground-workspace__comparison-result')).toBeNull();
    fireEvent.change(prompt, { target: { value: 'Edited draft survives Recent changes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Minimize panel' }));
    expect(onRecentExpandedChange).toHaveBeenCalledWith(false);
    view.rerender(workspace(false));
    expect(screen.getByText('Recent images')).not.toBeVisible();
    expect(screen.getByRole('button', { name: 'Open panel' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('textbox', { name: 'Direction' })).toBe(prompt);
    expect(prompt).toHaveValue('Edited draft survives Recent changes');
    expect(result).toBeVisible();
    expect(screen.getByText('Queue status')).toBeVisible();
    fireEvent.click(setupToggle());
    expect(prompt).not.toBeVisible();
    expect(messages).toBeVisible();
    expect(result).toBeVisible();
    expect(screen.getByText('Queue status')).toBeVisible();
  });

  it('keeps guided prompt, controls, messages and action callbacks in their established regions', () => {
    const generate = vi.fn();
    const recentChange = vi.fn();
    const view = render(
      <I18nextProvider i18n={testI18n}>
        <PlaygroundGenerationWorkspace
          prompt={<textarea aria-label="Guided direction" defaultValue="Read-only generated direction" readOnly />}
          result={<button type="button">Inspect guided result</button>}
          queue={<div role="status">Guided queue pending</div>}
          recent={<button type="button">Select previous guided result</button>}
          engine={<div>Guided engine</div>}
          references={<button type="button">Change guided reference</button>}
          actions={<button type="button" onClick={generate}>Generate guided</button>}
          messages={<div role="alert">Reference needs attention</div>}
          showRenderPromptHeading={false}
          recentExpanded={false}
          onRecentExpandedChange={recentChange}
          comparisonActive={false}
        />
      </I18nextProvider>
    );
    const prompt = screen.getByRole('textbox', { name: 'Guided direction' });
    expect(prompt).toHaveAttribute('readonly');
    expect(prompt).toHaveValue('Read-only generated direction');
    expect(prompt.closest('.playground-workspace__primary')).not.toBeNull();
    expect(view.container.querySelector('.playground-workspace__composer')).toBeNull();
    expect(view.container.querySelector('.playground-workspace__output')).toBeNull();
    const controls = screen.getByText('Guided engine').closest('.playground-workspace__controls');
    for (const region of [screen.getByRole('status'), screen.getByRole('alert'), screen.getByRole('button', { name: 'Change guided reference' }), screen.getByRole('button', { name: 'Generate guided' })]) {
      expect(controls).toContainElement(region);
    }
    expect(screen.getByRole('button', { name: 'Select previous guided result', hidden: true })).not.toBeVisible();
    expect(screen.getByRole('button', { name: 'Open panel' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Open panel' }));
    expect(recentChange).toHaveBeenCalledExactlyOnceWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Generate guided' }));
    expect(generate).toHaveBeenCalledTimes(1);
    expect(prompt).toHaveValue('Read-only generated direction');
  });

  it('keeps guided Look Sheet fields and references in writing beside one render frame', () => {
    const { container } = render(<I18nextProvider i18n={testI18n}>
      <PlaygroundGenerationWorkspace composer builderTitle="Character Look Sheet"
        builder={<fieldset disabled><input aria-label="Character name" defaultValue="Kin" /></fieldset>}
        engine={<div>Model first</div>} references={<div>Authorized reference</div>}
        prompt={<textarea aria-label="Compiled prompt" readOnly value="Approved direction" />}
        actions={<button disabled>Generate Look Sheet</button>} messages={<p role="status">Waiting for quote</p>}
        result={<div>Look Sheet result</div>} queue={<div>Look Sheet queue</div>} recent={<div>Look Sheet history</div>}
        showRenderPromptHeading={false} recentExpanded onRecentExpandedChange={() => {}} comparisonActive={false} />
    </I18nextProvider>);
    const builder = container.querySelector('details.playground-workspace__builder')!;
    const name = screen.getByRole('textbox', { name: 'Character name' });
    expect(builder).toHaveAttribute('open');
    expect(name).toBeDisabled();
    const writing = builder.closest('.playground-workspace__writing');
    const renderSettings = screen.getByText('Model first').closest('.playground-workspace__render-settings');
    expect(writing).not.toBeNull();
    expect(writing).toContainElement(screen.getByText('Authorized reference'));
    expect(writing).not.toContainElement(screen.getByText('Model first'));
    expect(renderSettings).toContainElement(screen.getByRole('button', { name: 'Generate Look Sheet' }));
    expect(builder.compareDocumentPosition(screen.getByText('Authorized reference')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Compiled prompt' })).toHaveAttribute('readonly');
    builder.removeAttribute('open');
    fireEvent(builder, new Event('toggle'));
    expect(name).toBeInTheDocument();
    expect(name).toHaveValue('Kin');
    expect(screen.getByRole('button', { name: 'Generate Look Sheet' })).toBeDisabled();
    expect(container.querySelectorAll('.generation-render-frame')).toHaveLength(1);
    expect(screen.getByText('Look Sheet result').closest('.playground-workspace__output')).not.toBeNull();
    expect(screen.getByText('Look Sheet queue').closest('.playground-workspace__output')).not.toBeNull();
    expect(screen.getByText('Look Sheet history')).toBeVisible();
    fireEvent.click(setupToggle());
    expect(name).toBeInTheDocument();
    expect(name).not.toBeVisible();
    expect(screen.getByText('Waiting for quote')).toBeVisible();
    expect(screen.getByText('Look Sheet result')).toBeVisible();
  });

  it('starts expanded without a result and hides only the empty placeholder', () => {
    render(composerWorkspace({ showResult: false }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(setupToggle()).toHaveTextContent('Selected model');
    const content = document.getElementById(setupToggle().getAttribute('aria-controls')!);
    expect(content).toContainElement(screen.getByRole('textbox', { name: 'Direction' }));
    expect(screen.queryByRole('button', { name: 'Inspect output' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspect output', hidden: true })).not.toBeVisible();
    expect(screen.getByText('Queue status')).toBeVisible();
    expect(screen.getByText('Recent images')).toBeVisible();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('collapses once per new successful key and preserves manual reopen during repeated polling', () => {
    const view = render(composerWorkspace({ showResult: false }));
    const output = view.container.querySelector<HTMLElement>('.playground-workspace__output')!;
    const scrollIntoView = vi.fn();
    output.scrollIntoView = scrollIntoView;
    view.rerender(composerWorkspace(successfulAttempt('success-1')));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Inspect output' })).toBeVisible();
    expect(screen.getByText('Render ready')).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    view.rerender(composerWorkspace({ completedResultKey: 'success-1' }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    fireEvent.click(setupToggle());
    view.rerender(composerWorkspace({ completedResultKey: 'success-1', modelSummary: 'Updated model' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: 'Direction' })).toBeVisible();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    view.rerender(composerWorkspace(successfulAttempt('success-2', 2)));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])('keeps async restored output expanded after generic busy=%s without observing a render', renderBusy => {
    const view = render(composerWorkspace({ renderBusy, showResult: false }));
    const outside = screen.getByRole('button', { name: 'Outside navigation' });
    act(() => outside.focus());
    view.rerender(composerWorkspace({ completedResultKey: 'restored' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(outside).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Inspect output' })).toBeVisible();
    view.rerender(composerWorkspace({ completedResultKey: 'selected-history' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses only the matching observed render and resets eligibility on tab remount', () => {
    const view = render(composerWorkspace({ activeRenderKey: 'new-render' }));
    view.rerender(composerWorkspace({ completedResultKey: 'new-render' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
    view.rerender(<div>Other tab</div>);
    view.rerender(composerWorkspace({ renderBusy: true }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace({ completedResultKey: 'new-render' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace({ activeRenderKey: 'next-render' }));
    view.rerender(composerWorkspace({ completedResultKey: 'unrelated-history' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace({ completedResultKey: 'next-render' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not consume a new attempt for an old result or rearm it on repeated polling', () => {
    const submittedRenderAttempt = { sequence: 1, renderKey: 'new-render', pending: false };
    const view = render(composerWorkspace());
    view.rerender(composerWorkspace({ submittedRenderAttempt, completedResultKey: 'old-render' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace({ submittedRenderAttempt, completedResultKey: 'old-render', renderBusy: true }));
    view.rerender(composerWorkspace({ submittedRenderAttempt, completedResultKey: 'old-render' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it.each([false, true])('baselines an accepted attempt already present on mount with async media=%s', asyncMedia => {
    const success = successfulAttempt('accepted-before-mount');
    const view = render(composerWorkspace({ ...success, completedResultKey: asyncMedia ? null : success.completedResultKey }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace(success));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace(successfulAttempt('submitted-after-mount', 2)));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('still arms an attempt pending at mount when its newly accepted result arrives', () => {
    const view = render(composerWorkspace({ submittedRenderAttempt: { sequence: 1, pending: true, renderKey: null } }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace(successfulAttempt('accepted-after-mount')));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps draft and reference DOM nodes mounted but inaccessible while folded', () => {
    const view = render(composerWorkspace());
    const prompt = screen.getByRole('textbox', { name: 'Direction' });
    const reference = screen.getByRole('textbox', { name: 'Reference name' });
    fireEvent.change(prompt, { target: { value: 'Edited direction' } });
    fireEvent.change(reference, { target: { value: 'Edited reference' } });
    view.rerender(composerWorkspace(successfulAttempt('success-1')));
    expect(prompt).toBeInTheDocument();
    expect(reference).toBeInTheDocument();
    expect(prompt).not.toBeVisible();
    expect(reference).not.toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Generate', hidden: true })).toHaveLength(1);
    fireEvent.click(setupToggle());
    expect(screen.getByRole('textbox', { name: 'Direction' })).toBe(prompt);
    expect(screen.getByRole('textbox', { name: 'Reference name' })).toBe(reference);
    expect(prompt).toHaveValue('Edited direction');
    expect(reference).toHaveValue('Edited reference');
  });

  it.each(['pending', 'failed', 'cancelled', 'partial', 'missing-media'])('does not collapse for %s without a completion key', state => {
    render(composerWorkspace({ renderBusy: state === 'pending', result: <p>{state} result</p> }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(`${state} result`)).toBeVisible();
    expect(screen.queryByText('Render ready')).not.toBeInTheDocument();
  });

  it('does not collapse an earlier completed output while another render is busy', () => {
    render(composerWorkspace({ completedResultKey: 'previous-success', renderBusy: true }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Inspect output' })).toBeVisible();
  });

  it('collapses after typing, focusing Generate, submitting and completing a new render', async () => {
    const generate = vi.fn();
    const actions = <button type="button" onClick={generate}>Generate</button>;
    const view = render(composerWorkspace({ actions, showResult: false }));
    const prompt = screen.getByRole('textbox', { name: 'Direction' });
    await focusAndFlushFrame(prompt);
    fireEvent.change(prompt, { target: { value: 'New render direction' } });
    const action = screen.getByRole('button', { name: 'Generate' });
    await focusAndFlushFrame(action);
    fireEvent.click(action);
    expect(generate).toHaveBeenCalledTimes(1);
    view.rerender(composerWorkspace({ actions, renderBusy: true, activeRenderKey: 'new-success' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(action).toHaveFocus();
    view.rerender(composerWorkspace({ actions, completedResultKey: 'new-success' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(setupToggle()).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Inspect output' })).toBeVisible();
    expect(prompt).toBeInTheDocument();
    expect(prompt).toHaveValue('New render direction');
    fireEvent.click(setupToggle());
    view.rerender(composerWorkspace({ actions, completedResultKey: 'new-success' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: 'Direction' })).toBe(prompt);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('keeps Generate available through pointer activation when an earlier success is deferred', async () => {
    const generate = vi.fn();
    const actions = <button type="button" onClick={generate}>Generate</button>;
    const view = render(composerWorkspace({ actions }));
    await focusAndFlushFrame(screen.getByRole('textbox', { name: 'Direction' }));
    view.rerender(composerWorkspace({ actions, ...successfulAttempt('deferred-success') }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    const action = screen.getByRole('button', { name: 'Generate' });
    fireEvent.mouseDown(action);
    await focusAndFlushFrame(action);
    // Native pointer focus precedes mouseup/click; hiding here drops the user's command.
    expect(action).toBeVisible();
    expect(action).toHaveFocus();
    fireEvent.mouseUp(action);
    fireEvent.click(action);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('defers completion until editing leaves the entire setup, including a menu portal', async () => {
    const engine = <>
      <button type="button" aria-haspopup="menu">Choose model</button>
      {createPortal(<div role="menu"><button role="menuitem">Model option</button></div>, document.body)}
    </>;
    const view = render(composerWorkspace({ engine }));
    const prompt = screen.getByRole('textbox', { name: 'Direction' });
    await focusAndFlushFrame(prompt);
    view.rerender(composerWorkspace({ engine, ...successfulAttempt('success-1') }));
    expect(prompt).toHaveFocus();
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    await focusAndFlushFrame(screen.getByRole('textbox', { name: 'Reference name' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    await focusAndFlushFrame(screen.getByRole('button', { name: 'Choose model' }));
    const menuItem = screen.getByRole('menuitem');
    expect(view.container).not.toContainElement(menuItem);
    await focusAndFlushFrame(menuItem);
    expect(menuItem).toHaveFocus();
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    const outside = screen.getByRole('button', { name: 'Outside navigation' });
    await focusAndFlushFrame(outside);
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(outside).toHaveFocus();
  });

  it('does not collapse during IME composition even after focus leaves setup', async () => {
    const view = render(composerWorkspace());
    const prompt = screen.getByRole('textbox', { name: 'Direction' });
    await focusAndFlushFrame(prompt);
    fireEvent.compositionStart(prompt);
    fireEvent.change(prompt, { target: { value: 'Composing direction' } });
    view.rerender(composerWorkspace(successfulAttempt('success-ime')));
    const outside = screen.getByRole('button', { name: 'Outside navigation' });
    await focusAndFlushFrame(outside);
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.compositionEnd(prompt);
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(prompt).toHaveValue('Composing direction');
    expect(outside).toHaveFocus();
  });

  it('keeps editing protected after IME ends until focus leaves setup', async () => {
    const view = render(composerWorkspace());
    const prompt = screen.getByRole('textbox', { name: 'Direction' });
    await focusAndFlushFrame(prompt);
    fireEvent.compositionStart(prompt);
    view.rerender(composerWorkspace(successfulAttempt('success-ime')));
    fireEvent.compositionEnd(prompt);
    expect(prompt).toHaveFocus();
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    await focusAndFlushFrame(screen.getByRole('textbox', { name: 'Reference name' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    await focusAndFlushFrame(screen.getByRole('button', { name: 'Outside navigation' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it.each(['pending', 'failed', 'null'])('discards a deferred success superseded by %s', async state => {
    const view = render(composerWorkspace());
    await focusAndFlushFrame(screen.getByRole('textbox', { name: 'Direction' }));
    view.rerender(composerWorkspace(successfulAttempt('superseded-success')));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace({ completedResultKey: null, renderBusy: state === 'pending',
      result: <p>{state} result</p> }));
    await focusAndFlushFrame(screen.getByRole('button', { name: 'Outside navigation' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(`${state} result`)).toBeVisible();
    view.rerender(composerWorkspace(successfulAttempt('next-success', 2)));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts restored completed setup expanded and can return to manually folded settings', () => {
    const toolsRef = createRef<HTMLElement>();
    const view = render(composerWorkspace({ toolsRef, completedResultKey: 'restored-success' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(setupToggle());
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
    act(() => toolsRef.current?.focus());
    expect(toolsRef.current).toHaveFocus();
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace({ toolsRef, completedResultKey: 'restored-success' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: 'Direction' })).toHaveValue('Keep this draft');
  });

  it('discards a deferred success when a superseding submission fails while retaining the previous output', async () => {
    const view = render(composerWorkspace());
    await focusAndFlushFrame(screen.getByRole('textbox', { name: 'Direction' }));
    view.rerender(composerWorkspace(successfulAttempt('previous-success')));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace({ completedResultKey: 'previous-success', renderBusy: true,
      submittedRenderAttempt: { sequence: 2, renderKey: null, pending: true } }));
    await focusAndFlushFrame(screen.getByRole('button', { name: 'Outside navigation' }));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace({ completedResultKey: 'previous-success', renderBusy: false,
      submittedRenderAttempt: { sequence: 2, renderKey: null, pending: false },
      messages: <p role="alert">New submission failed</p> }));
    expect(screen.getByRole('alert')).toHaveTextContent('New submission failed');
    expect(screen.getByRole('button', { name: 'Inspect output' })).toBeVisible();
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'true');
    view.rerender(composerWorkspace(successfulAttempt('next-success', 3)));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('moves focus from an action that becomes hidden to the setup toggle', () => {
    const view = render(composerWorkspace());
    act(() => screen.getByRole('button', { name: 'Generate' }).focus());
    view.rerender(composerWorkspace(successfulAttempt('success-1')));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(setupToggle()).toHaveFocus();
  });

  it('does not steal focus or scroll when success arrives during unrelated navigation', () => {
    const view = render(composerWorkspace());
    const output = view.container.querySelector<HTMLElement>('.playground-workspace__output')!;
    const scrollIntoView = vi.fn();
    output.scrollIntoView = scrollIntoView;
    const outside = screen.getByRole('button', { name: 'Outside navigation' });
    act(() => outside.focus());
    view.rerender(composerWorkspace(successfulAttempt('success-1')));
    expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(outside).toHaveFocus();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it.each(['finish', 'missing-media', 'history', 'navigation'])('waits for slide completion and cancels stale output reveal for %s', reason => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate');
    const motion = { cancel: vi.fn(), onfinish: null as (() => void) | null };
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: vi.fn(() => motion) });
    try {
      const view = render(composerWorkspace());
      const output = view.container.querySelector<HTMLElement>('.playground-workspace__output')!;
      const content = view.container.querySelector<HTMLElement>('.playground-workspace__composer')!;
      output.scrollIntoView = vi.fn();
      view.rerender(composerWorkspace(successfulAttempt('animated-success')));
      expect(setupToggle()).toHaveAttribute('aria-expanded', 'false');
      expect(content).not.toHaveAttribute('hidden');
      expect(content).toHaveAttribute('inert');
      expect(content).toHaveAttribute('aria-hidden', 'true');
      expect(screen.queryByRole('textbox', { name: 'Direction' })).not.toBeInTheDocument();
      expect(output.scrollIntoView).not.toHaveBeenCalled();
      if (reason === 'missing-media' || reason === 'history') {
        view.rerender(composerWorkspace({ completedResultKey: reason === 'history' ? 'history-success' : null }));
      } else if (reason === 'navigation') {
        act(() => screen.getByRole('button', { name: 'Outside navigation' }).focus());
        act(() => setupToggle().focus());
      }
      act(() => motion.onfinish?.());
      expect(content).toHaveAttribute('hidden');
      expect(output.scrollIntoView).toHaveBeenCalledTimes(reason === 'finish' ? 1 : 0);
      view.unmount();
    } finally {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, 'animate', descriptor);
      else Reflect.deleteProperty(HTMLElement.prototype, 'animate');
    }
  });

  it('projects sticky control overflow into top and bottom fade states', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <PlaygroundGenerationWorkspace
          prompt={<div>Prompt region</div>}
          result={<div>Latest render</div>}
          queue={<div>Queue status</div>}
          recent={<div>Recent images</div>}
          engine={<div>Engine target</div>}
          references={<div>Reference images</div>}
          actions={<button type="button">Generate</button>}
          showRenderPromptHeading={false}
          recentExpanded
          onRecentExpandedChange={() => {}}
          comparisonActive
        />
      </I18nextProvider>
    );

    const controls = screen.getByText('Queue status')
      .closest<HTMLElement>('.playground-workspace__controls');
    const frame = controls?.closest<HTMLElement>('.playground-workspace__controls-frame');
    expect(controls).not.toBeNull();
    expect(frame).not.toBeNull();

    Object.defineProperties(controls as HTMLElement, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 300 }
    });

    (controls as HTMLElement).scrollTop = 50;
    fireEvent.scroll(controls as HTMLElement);
    expect(frame).toHaveAttribute('data-fade-top', 'true');
    expect(frame).toHaveAttribute('data-fade-bottom', 'true');

    (controls as HTMLElement).scrollTop = 200;
    fireEvent.scroll(controls as HTMLElement);
    expect(frame).toHaveAttribute('data-fade-top', 'true');
    expect(frame).not.toHaveAttribute('data-fade-bottom');
  });

  it('promotes comparison results above both workspace columns', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <PlaygroundGenerationWorkspace
          prompt={<div>Prompt region</div>}
          result={<div>Comparison results</div>}
          queue={<div>Queue status</div>}
          recent={<div>Recent images</div>}
          engine={<div>Engine target</div>}
          references={<div>Reference images</div>}
          actions={<button type="button">Generate</button>}
          showRenderPromptHeading={false}
          recentExpanded
          onRecentExpandedChange={() => {}}
          comparisonActive
        />
      </I18nextProvider>
    );

    const comparison = screen.getByText('Comparison results');
    const prompt = screen.getByText('Prompt region');
    expect(
      comparison.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(comparison.closest('.playground-workspace__comparison-result')).not.toBeNull();
  });

  it('accepts a Video-specific recent title without changing the shared layout', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <PlaygroundGenerationWorkspace
          prompt={<div>Video direction</div>}
          result={<div>Video result</div>}
          queue={null}
          recent={<div>Recent clips</div>}
          recentTitle="Recent Video outputs"
          recentPlacement="after-engine"
          engine={<div>Video engine</div>}
          references={null}
          actions={<button type="button">Generate Video</button>}
          showRenderPromptHeading={false}
          recentExpanded
          onRecentExpandedChange={() => {}}
          comparisonActive={false}
        />
      </I18nextProvider>
    );
    expect(screen.getByRole('heading', { name: 'Recent Video outputs' })).toBeVisible();
    expect(screen.getByText('Video result').compareDocumentPosition(
      screen.getByText('Video direction')
    ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Recent clips').compareDocumentPosition(
      screen.getByText('Video engine')
    ) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('keeps the workflow intact when an embedded surface hides Recent outputs', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <PlaygroundGenerationWorkspace
          prompt={null}
          result={<div>Embedded result</div>}
          queue={<div>Embedded queue</div>}
          recent={null}
          engine={<div>Embedded engine</div>}
          references={<div>Embedded references</div>}
          actions={<button type="button">Generate embedded image</button>}
          showRenderPromptHeading={false}
          recentExpanded={false}
          onRecentExpandedChange={() => {}}
          comparisonActive={false}
        />
      </I18nextProvider>
    );

    expect(screen.queryByRole('heading', { name: 'Recent Playground renders' })).not.toBeInTheDocument();
    expect(screen.getByText('Embedded result')).toBeVisible();
    expect(screen.getByText('Embedded queue')).toBeVisible();
    expect(screen.getByText('Embedded engine')).toBeVisible();
    expect(screen.getByText('Embedded references')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Generate embedded image' })).toBeEnabled();
  });
});
