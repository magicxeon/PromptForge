(() => {
  const translate = (key, fallback, variables = {}) => window.ModelPromptForgeI18n?.t?.(key, variables, { defaultValue: fallback }) || fallback;

  function createTextElement(tagName, className, value) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = value;
    return element;
  }

  function render({ mount, proposal, onUsePrompt, onApplySelections }) {
    if (!mount) return;
    mount.replaceChildren();
    if (!proposal) return;

    const review = document.createElement('section');
    review.className = 'prompt-composer-review';
    review.append(createTextElement('p', 'prompt-composer-review-kicker', translate('promptComposer.review.kicker', 'PROPOSAL READY')));
    review.append(createTextElement('h4', '', translate('promptComposer.review.title', 'Review the supported selections')));
    review.append(createTextElement('p', 'prompt-composer-review-copy', proposal.fieldSelections.length
      ? translate('promptComposer.review.mapped', 'Only existing Studio options were mapped. You can review them before using the result.')
      : translate('promptComposer.review.unmapped', 'No official options were assumed. Your idea remains available as a freeform prompt.')));

    const selectionList = document.createElement('div');
    selectionList.className = 'prompt-composer-selection-list';
    proposal.fieldSelections.forEach(selection => {
      const item = document.createElement('div');
      item.className = 'prompt-composer-selection';
      item.append(createTextElement('strong', '', selection.fieldId));
      item.append(createTextElement('span', '', selection.value));
      if (selection.confidence < 0.75) item.append(createTextElement('small', 'prompt-composer-low-confidence', translate('promptComposer.review.reviewSuggested', 'Review suggested')));
      selectionList.append(item);
    });
    if (proposal.fieldSelections.length) review.append(selectionList);

    const draft = document.createElement('p');
    draft.className = 'prompt-composer-draft';
    draft.textContent = proposal.finalPromptDraft;
    review.append(draft);

    const actions = document.createElement('div');
    actions.className = 'prompt-composer-actions';
    const usePrompt = document.createElement('button');
    usePrompt.type = 'button';
    usePrompt.className = 'playground-action-button is-secondary is-compact';
    usePrompt.textContent = translate('promptComposer.action.usePrompt', 'Use in Playground prompt');
    usePrompt.addEventListener('click', () => onUsePrompt?.(proposal));
    actions.append(usePrompt);

    if (proposal.fieldSelections.length) {
      const applySelections = document.createElement('button');
      applySelections.type = 'button';
      applySelections.className = 'playground-action-button is-primary is-compact';
      applySelections.textContent = translate('promptComposer.action.applyStudio', 'Apply selections in Studio');
      applySelections.addEventListener('click', () => onApplySelections?.(proposal));
      actions.append(applySelections);
    }
    review.append(actions);
    mount.append(review);
  }

  window.ModelPromptForgeStructuredProposalReview = { render };
})();
